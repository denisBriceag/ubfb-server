import { registerAs } from '@nestjs/config';
import * as process from 'node:process';

export const REDIS_CONFIG_KEY = 'redis';

export const redisConfig = registerAs(REDIS_CONFIG_KEY, () => ({
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  host: process.env.REDIS_HOST ?? 'localhost',
}));
