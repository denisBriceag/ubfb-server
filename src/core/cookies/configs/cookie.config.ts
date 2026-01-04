import { registerAs } from '@nestjs/config';
import { CookieOptions } from 'express';

interface CookieConfig extends CookieOptions {
  secret: string[] | undefined;
}

export const COOKIES_CONFIG_KEY = 'cookies';

export const cookieConfig = registerAs<CookieConfig>(
  COOKIES_CONFIG_KEY,
  () => ({
    secret: process.env.COOKIES_SECRET?.split(',') || undefined,
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  }),
);
