import {
  Global,
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigModule } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { cookieConfig } from './configs/cookie.config';
import { CookieService } from './services/cookie.service';

@Global()
@Module({
  providers: [CookieService],
  exports: [CookieService],
  imports: [ConfigModule.forFeature(cookieConfig)],
})
export class CookiesModule implements NestModule {
  constructor(
    @Inject(cookieConfig.KEY)
    private readonly _config: ConfigType<typeof cookieConfig>,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser(this._config.secret)).forRoutes('*');
  }
}
