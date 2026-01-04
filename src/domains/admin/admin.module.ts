import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [UserModule, AuthenticationModule, S3Module],
})
export class AdminModule {}
