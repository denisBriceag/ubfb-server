import { Inject, Injectable } from '@nestjs/common';
import { cookieConfig } from '@core/cookies';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { SESSION_ID } from '../../constants';

@Injectable()
export class CookieService {
  constructor(
    @Inject(cookieConfig.KEY)
    private readonly _config: ConfigType<typeof cookieConfig>,
  ) {}

  setCookie(response: Response, key: string, value: string): void {
    const config: CookieOptions = {
      httpOnly: this._config.httpOnly,
      sameSite: this._config.sameSite,
      secure: this._config.secure,
    };

    if (key === SESSION_ID) config.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days

    response.cookie(key, value, config);
  }

  clearCookie(response: Response, key: string): void {
    response.clearCookie(key, {
      httpOnly: this._config.httpOnly,
      sameSite: this._config.sameSite,
      secure: this._config.secure,
    });
  }
}
