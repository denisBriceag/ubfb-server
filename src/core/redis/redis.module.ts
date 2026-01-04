import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from './configs/redis.config';
import { RedisService } from './services/redis/redis.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
