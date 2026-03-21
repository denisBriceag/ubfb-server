import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { S3Module } from '@features/s3/s3.module';

@Module({
  imports: [S3Module],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
