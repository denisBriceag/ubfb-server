import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { redisConfig } from '../../configs/redis.config';
import type { ConfigType } from '@nestjs/config';
import * as process from 'node:process';
import { Environment } from '@core/types/environment.enum';

export class InvalidatedRefreshTokenError extends Error {}

@Injectable()
export class RedisService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private _redisClient: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly _redisConfig: ConfigType<typeof redisConfig>,
  ) {}

  onApplicationBootstrap(): void {
    this._redisClient =
      process.env.NODE_ENV === Environment.DEVELOPMENT
        ? new Redis({
            host: this._redisConfig.host,
            port: this._redisConfig.port,
          })
        : new Redis(`${process.env.REDIS_URL_PROD}`);
  }

  async get(id: string | number): Promise<string> {
    const value = await this._redisClient.get(`${id}`);

    return `${value}`;
  }

  async set(
    id: string,
    value: string,
    millisecondsToken?: 'PX',
    milliseconds?: number,
  ): Promise<void> {
    if (millisecondsToken && milliseconds) {
      await this._redisClient.set(
        `${id}`,
        value,
        millisecondsToken,
        milliseconds,
      );

      return;
    }
    await this._redisClient.set(`${id}`, value);
  }

  async insert(id: string, value: string): Promise<void> {
    await this._redisClient.set(id, value);
  }

  async validate(id: string, value: string): Promise<boolean> {
    const storedId = await this._redisClient.get(id);

    if (storedId !== value) {
      throw new InvalidatedRefreshTokenError();
    }

    return storedId === value;
  }

  async invalidate(id: string): Promise<void> {
    await this._redisClient.del(id);
  }

  async exists(key: string): Promise<boolean> {
    return (await this._redisClient.exists(key)) === 1;
  }

  async onApplicationShutdown(): Promise<string> {
    await this._redisClient.flushdb();

    return this._redisClient.quit();
  }
}
