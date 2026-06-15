import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@features/user/entities/user.entity';
import jwtConfig from '../configs/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { HashingService } from '@core/hashing';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@core/redis';
import { getAccessToken } from '@core/utils';
import { ERROR_MAP, ErrorsEnum } from '@core/constants';
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
    try {
      const accessToken = getAccessToken(request);

      const { sub } = await this._jwtService.verifyAsync<TokenSignature>(
        accessToken as string,
        this._jwtConfig,
      );

      const { id, email, name, surname, role } =
        await this._userService.findOneById(sub, false);

      return { sub: id, email, name, surname, role };
    } catch {
      throw new UnauthorizedException({
        message: ErrorsEnum.USER_DOES_NO_EXIST,
        errorCode: ERROR_MAP.USER_DOES_NO_EXIST,
      });
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
    const user = await this._userService.findOneByEmail(signInDto.email, true);

    if (!user) {
      throw new UnauthorizedException({
        message: ErrorsEnum.USER_DOES_NO_EXIST,
        errorCode: ERROR_MAP.USER_DOES_NO_EXIST,
      });
    }

    const isEqual = await this._hashingService.compare(
      signInDto.password,
      user.password,
    );

    if (!isEqual) {
      throw new UnauthorizedException({
        message: ErrorsEnum.PASS_DOES_NOT_MATCH,
        errorCode: ERROR_MAP.PASS_DOES_NOT_MATCH,
      });
    }

    return await this._generateTokens(user);
  }

  async signOut(refreshToken: string, accessToken?: string): Promise<void> {
    try {
      const {
        sub: userId,
        refreshTokenId,
        typ,
      } = await this._jwtService.verifyAsync<RefreshTokenSignature>(
        refreshToken,
        {
          secret: this._jwtConfig.secret,
          audience: this._jwtConfig.audience,
          issuer: this._jwtConfig.issuer,
        },
      );

      if (typ !== 'refresh')
        throw new UnauthorizedException({
          message: ErrorsEnum.INVALID_TOKEN_TYPE,
          errorCode: ERROR_MAP.INVALID_TOKEN_TYPE,
        });

      const ok = await this._redisService.validate(
        `${this._redisKey}${userId}`,
        refreshTokenId,
      );

      if (!ok)
        throw new UnauthorizedException({
          message: ErrorsEnum.INVALID_REFRESH_TOKEN,
          errorCode: ERROR_MAP.INVALID_REFRESH_TOKEN,
        });

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
    } catch {
      throw new UnauthorizedException({
        message: ErrorsEnum.INVALID_REFRESH_TOKEN,
        errorCode: ERROR_MAP.INVALID_REFRESH_TOKEN,
      });
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
      await this._redisService.invalidate(`${this._passResetKey}user:${user.id}`);
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

    try {
      const { sub, refreshTokenId, typ } =
        await this._jwtService.verifyAsync<RefreshTokenSignature>(
          refreshToken,
          {
            secret: this._jwtConfig.secret,
            audience: this._jwtConfig.audience,
            issuer: this._jwtConfig.issuer,
          },
        );

      if (typ !== TokenTypes.REFRESH)
        throw new UnauthorizedException({
          message: ErrorsEnum.INVALID_TOKEN_TYPE,
          errorCode: ERROR_MAP.INVALID_TOKEN_TYPE,
        });

      const user = await this._userService.findOneById(sub, false);

      const isValid = await this._redisService.validate(
        `${this._redisKey}${user.id}`,
        refreshTokenId,
      );

      await this._redisService.invalidate(`${this._redisKey}${user.id}`);

      if (!isValid) {
        throw new UnauthorizedException({
          message: ErrorsEnum.REFRESH_TOKEN_REUSE,
          errorCode: ERROR_MAP.REFRESH_TOKEN_REUSE,
        });
      }

      if (accessToken) {
        try {
          const at = await this._jwtService.verifyAsync<TokenSignature>(
            accessToken,
            this._jwtConfig,
          );

          if (at?.jti && at?.exp) {
            const ttl = Math.max(0, at.exp * 1000 - Date.now());
            if (ttl > 0) {
              await this._denyAccessToken(at.jti, ttl);
            }
          }
        } catch {
          // ignore invalid access token
        }
      }

      return this._generateTokens(user);
    } catch {
      throw new ForbiddenException({
        message: ErrorsEnum.ACCESS_DENIED,
        errorCode: ERROR_MAP.ACCESS_DENIED,
      });
    }
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

    await this._redisService.insert(
      `${this._redisKey}${user.id}`,
      refreshTokenId,
    );

    return {
      accessToken,
      refreshToken,
    };
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
