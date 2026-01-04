import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import jwtConfig from '../../configs/jwt.config';
import { RedisService } from '@core/redis';
import { getAccessToken } from '@core/utils';
import { ERROR_MAP, ErrorsEnum, REQUEST_USER_KEY } from '@core/constants';
import { TokenSignature } from '../../types/token-signature.type';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly _redisDenyKey = 'deny:at:';

  constructor(
    private readonly _jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly _jwtConfig: ConfigType<typeof jwtConfig>,
    private readonly _redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = getAccessToken(request);

    if (!token) {
      throw new UnauthorizedException({
        message: ErrorsEnum.NO_ACCESS_TOKEN,
        errorCode: ERROR_MAP.NO_ACCESS_TOKEN,
      });
    }

    const payload: TokenSignature = await this._jwtService
      .verifyAsync(token, this._jwtConfig)
      .catch((error) => {
        if (error instanceof TokenExpiredError) {
          throw new UnauthorizedException({
            message: ErrorsEnum.ACCESS_TOKEN_EXPIRED,
            errorCode: ERROR_MAP.ACCESS_TOKEN_EXPIRED,
          });
        }

        throw new UnauthorizedException({
          message: ErrorsEnum.INVALID_ACCESS_TOKEN,
          errorCode: ERROR_MAP.INVALID_ACCESS_TOKEN,
        });
      });

    if (
      payload?.jti &&
      (await this._redisService.exists(`${this._redisDenyKey}${payload.jti}`))
    ) {
      throw new UnauthorizedException({
        message: ErrorsEnum.ACCESS_TOKEN_REVOKED,
        errorCode: ERROR_MAP.ACCESS_TOKEN_REVOKED,
      });
    }

    request[REQUEST_USER_KEY] = payload;

    return true;
  }
}
