import { registerAs } from '@nestjs/config';
import * as process from 'node:process';
export const JWT_CONFIG_KEY = 'jwt';

export default registerAs(JWT_CONFIG_KEY, () => {
  return {
    secret: process.env.JWT_SECRET,
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '600', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  };
});
