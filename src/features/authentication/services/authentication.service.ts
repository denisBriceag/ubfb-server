import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@features/user/entities/user.entity';
import jwtConfig from '../configs/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { HashingService } from '@core/hashing';
import { JwtService } from '@nestjs/jwt';
import { InvalidatedRefreshTokenError, RedisService } from '@core/redis';
import { ERROR_MAP, ErrorsEnum, REQUEST_USER_KEY } from '@core/constants';
import { Roles } from '@core/types/roles.enum';
import { SignInDto } from '../dto/sign-in.dto';
import { SignUpDto } from '../dto/sign-up.dto';
import {
  RefreshTokenSignature,
  TokenSignature,
  TokenTypes,
} from '../types/token-signature.type';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { Request } from 'express';
import { ActiveUserData } from '@core/types/active-user-data.type';
import { AuthResponse } from '../types/auth-response.type';
import { MailService } from '@core/mail/services/mail.service';
import { UserService } from '@features/user/services/user.service';

const DUMMY_HASH =
  '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

@Injectable()
export class AuthenticationService {
  private readonly _logger = new Logger(AuthenticationService.name);
  private readonly _redisKey = 'user-';
  private readonly _redisDenyKey = 'deny:at:';
  private readonly _passResetKey = 'pass:reset:';
  private readonly _passResetTtl = 15 * 60 * 1000; // 15 mins

  constructor(
    @Inject(jwtConfig.KEY)
    private readonly _jwtConfig: ConfigType<typeof jwtConfig>,
    private readonly _hashingService: HashingService,
    private readonly _jwtService: JwtService,
    private readonly _redisService: RedisService,
    private readonly _mailService: MailService,
    private readonly _userService: UserService,
  ) {}

  async me(request: Request): Promise<ActiveUserData> {
    const { sub } = request[REQUEST_USER_KEY] as TokenSignature;

    try {
      const { id, email, name, surname, role } =
        await this._userService.findOneById(sub, false);

      return { sub: id, email, name, surname, role };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException({
          message: ErrorsEnum.USER_DOES_NO_EXIST,
          errorCode: ERROR_MAP.USER_DOES_NO_EXIST,
        });
      }

      throw err;
    }
  }

  async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
    try {
      const user = (await this._userService.create(
        { ...signUpDto, role: Roles.USER },
        true,
      )) as User;

      return await this._generateTokens(user);
    } catch (err) {
      if (err.code === ErrorsEnum.PG_UNIQUE_VIOLATION) {
        throw new ConflictException({
          message: ErrorsEnum.SIGN_UP_CONFLICT,
          errorCode: ERROR_MAP.SIGN_UP_CONFLICT,
        });
      }

      throw err;
    }
  }

  async signIn(signInDto: SignInDto): Promise<AuthResponse> {
    const invalidCredentials = new UnauthorizedException({
      message: ErrorsEnum.INVALID_CREDENTIALS,
      errorCode: ERROR_MAP.INVALID_CREDENTIALS,
    });

    let user: User | null = null;

    try {
      user = await this._userService.findOneByEmail(signInDto.email, true);
    } catch {}

    const isEqual = await this._hashingService.compare(
      signInDto.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !isEqual) throw invalidCredentials;

    return this._generateTokens(user);
  }

  async signOut(refreshToken: string, accessToken?: string): Promise<void> {
    const {
      sub: userId,
      refreshTokenId,
      typ,
    } = await this._verifyRefreshToken(refreshToken);

    if (typ !== TokenTypes.REFRESH) {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_TOKEN_TYPE,
        errorCode: ERROR_MAP.INVALID_TOKEN_TYPE,
      });
    }

    try {
      await this._redisService.validate(
        `${this._redisKey}${userId}`,
        refreshTokenId,
      );
    } catch {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_REFRESH_TOKEN,
        errorCode: ERROR_MAP.INVALID_REFRESH_TOKEN,
      });
    }

    await this._redisService.invalidate(`${this._redisKey}${userId}`);

    if (accessToken) {
      try {
        const at = await this._jwtService.verifyAsync<any>(accessToken, {
          secret: this._jwtConfig.secret,
          audience: this._jwtConfig.audience,
          issuer: this._jwtConfig.issuer,
        });

        if (at?.jti && at?.exp) {
          const ttl = Math.max(0, at.exp * 1000 - Date.now());
          if (ttl > 0) await this._denyAccessToken(at.jti, ttl);
        }
      } catch {}
    }
  }

  /**
   * @todo We need to log everytime when user tries to reset his password
   * @todo We need to hash userId in the token, so it will be available for updater information.
   * */
  async requestPasswordReset(email: string): Promise<void> {
    let user: User;

    try {
      user = await this._userService.findOneByEmail(email);
    } catch {
      return;
    }

    const existingToken = await this._redisService.get(
      `${this._passResetKey}user:${user.id}`,
    );

    if (existingToken !== 'null') {
      await this._redisService.invalidate(
        `${this._passResetKey}${existingToken}`,
      );
    }

    const resetToken = crypto.randomUUID();
    const resetLink = `${this._jwtConfig.frontendUrl}/auth/reset-password?token=${resetToken}`;

    await this._redisService.set(
      `${this._passResetKey}${resetToken}`,
      user.id,
      'PX',
      this._passResetTtl,
    );

    await this._redisService.set(
      `${this._passResetKey}user:${user.id}`,
      resetToken,
      'PX',
      this._passResetTtl,
    );

    await this._mailService.sendPasswordResetEmail(email, resetLink);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this._redisService.get(
      `${this._passResetKey}${token}`,
    );

    if (userId === 'null') {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_RESET_TOKEN,
        errorCode: ERROR_MAP.INVALID_RESET_TOKEN,
      });
    }

    const user = await this._userService.findOneById(userId, false);

    await this._userService.updatePassword(user.id, newPassword);

    try {
      await this._redisService.invalidate(`${this._passResetKey}${token}`);
      await this._redisService.invalidate(
        `${this._passResetKey}user:${user.id}`,
      );
      await this._redisService.invalidate(`${this._redisKey}${user.id}`);
    } catch (err) {
      this._logger.error('Redis cleanup failed after password reset', err);
    }
  }

  async refreshTokens({
    refreshToken,
    accessToken,
  }: RefreshTokenDto): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new ForbiddenException({
        message: ErrorsEnum.ACCESS_DENIED_NO_REFRESH_TOKEN,
        errorCode: ERROR_MAP.ACCESS_DENIED_NO_REFRESH_TOKEN,
      });
    }

    const { sub, refreshTokenId, typ } =
      await this._verifyRefreshToken(refreshToken);

    if (typ !== TokenTypes.REFRESH) {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_TOKEN_TYPE,
        errorCode: ERROR_MAP.INVALID_TOKEN_TYPE,
      });
    }

    const user = await this._userService.findOneById(sub, false);

    try {
      await this._redisService.validate(
        `${this._redisKey}${user.id}`,
        refreshTokenId,
      );
    } catch (err) {
      if (err instanceof InvalidatedRefreshTokenError) {
        await this._redisService.invalidate(`${this._redisKey}${user.id}`);
        throw new UnauthorizedException({
          message: ErrorsEnum.REFRESH_TOKEN_REUSE,
          errorCode: ERROR_MAP.REFRESH_TOKEN_REUSE,
        });
      }
      throw new ForbiddenException({
        message: ErrorsEnum.ACCESS_DENIED,
        errorCode: ERROR_MAP.ACCESS_DENIED,
      });
    }

    await this._redisService.invalidate(`${this._redisKey}${user.id}`);

    if (accessToken) {
      try {
        const at = await this._jwtService.verifyAsync<TokenSignature>(
          accessToken,
          this._jwtConfig,
        );

        if (at?.jti && at?.exp) {
          const ttl = Math.max(0, at.exp * 1000 - Date.now());
          if (ttl > 0) await this._denyAccessToken(at.jti, ttl);
        }
      } catch {
        // ignore invalid access token
      }
    }

    return this._generateTokens(user);
  }

  private async _generateTokens(user: User): Promise<AuthResponse> {
    const refreshTokenId = crypto.randomUUID();
    const accessJti = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this._signToken<Partial<TokenSignature>>(
        user.id,
        this._jwtConfig.accessTokenTtl,
        {
          email: user.email,
          name: user.name,
          surname: user.surname,
          role: user.role,
          jti: accessJti,
          typ: TokenTypes.ACCESS,
        },
      ),

      this._signToken<RefreshTokenSignature>(
        user.id,
        this._jwtConfig.refreshTokenTtl,
        {
          refreshTokenId,
          typ: TokenTypes.REFRESH,
        } as RefreshTokenSignature,
      ),
    ]);

    await this._redisService.set(
      `${this._redisKey}${user.id}`,
      refreshTokenId,
      'PX',
      this._jwtConfig.refreshTokenTtl * 1000,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async _verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenSignature> {
    try {
      return await this._jwtService.verifyAsync<RefreshTokenSignature>(token, {
        secret: this._jwtConfig.secret,
        audience: this._jwtConfig.audience,
        issuer: this._jwtConfig.issuer,
      });
    } catch {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_REFRESH_TOKEN,
        errorCode: ERROR_MAP.INVALID_REFRESH_TOKEN,
      });
    }
  }

  private async _signToken<T>(userId: string, expiresIn: number, payload?: T) {
    return await this._jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        audience: this._jwtConfig.audience,
        issuer: this._jwtConfig.issuer,
        secret: this._jwtConfig.secret,
        expiresIn,
      },
    );
  }

  private async _denyAccessToken(jti: string, ttlMs: number): Promise<void> {
    if (ttlMs > 0) {
      await this._redisService.set(
        `${this._redisDenyKey}${jti}`,
        '1',
        'PX',
        ttlMs,
      );
    }
  }
}
