import { Module } from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { S3Controller } from './controllers/s3.controller';
import { ConfigModule } from '@nestjs/config';
import s3Config from './configs/s3.config';

@Module({
  imports: [ConfigModule.forFeature(s3Config)],
  providers: [S3Service],
  exports: [S3Service],
  controllers: [S3Controller],
})
export class S3Module {}
