import { Module } from '@nestjs/common';
import { AdminModule } from './domains/admin/admin.module';
import { StoreModule } from './domains/store/store.module';
import { RouterModule } from '@nestjs/core';
import process from 'node:process';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appRoutes } from './app.routes';
import { MailModule } from '@core/mail/mail.module';
import path from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(process.cwd(), `.env.${process.env.NODE_ENV}`),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(`${process.env.DB_PORT}`, 10),
      username: process.env.DB_USERNAME || '',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '',
      autoLoadEntities: true,
      synchronize: true,
      ssl: false,
    }),
    MailModule,
    AdminModule,
    StoreModule,
    RouterModule.register(appRoutes),
    MailModule,
  ],
})
export class AppModule {}
