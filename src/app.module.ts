import { APP_FILTER, APP_GUARD, RouterModule } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { MailModule } from '@core/mail/mail.module';
import { HttpExceptionFilter } from '@core/exceptions/exceptions.filter';
import { TypeOrmExceptionFilter } from '@core/exceptions/typeorm-exceptions.filter';
import { IcuCollationProbe } from '@core/database/icu-collation.probe';

import { AdminModule } from './domains/admin/admin.module';
import { StoreModule } from './domains/store/store.module';
import { privateRoutes } from './private.routes';
import { publicRoutes } from './public.routes';

import process from 'node:process';
import path from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(process.cwd(), `.env.${process.env.NODE_ENV}`),
    }),
    /**
     * @todo Move to a separate module with a db config
     * */
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(`${process.env.DB_PORT}`, 10),
      username: process.env.DB_USERNAME || '',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: false,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(`${process.env.THROTTLE_TTL}`, 10),
          limit: parseInt(`${process.env.THROTTLE_LIMIT}`, 10),
        },
      ],
    }),
    MailModule,
    AdminModule,
    StoreModule,
    RouterModule.register(privateRoutes),
    RouterModule.register(publicRoutes),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    IcuCollationProbe,
  ],
})
export class AppModule {}
