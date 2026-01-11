import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { S3Module } from './s3/s3.module';
import { UserModule } from '@features/user/user.module';
import { MapsModule } from '@features/maps/maps.module';
import { Domains } from '@core/types/domains.enum';

@Module({
  imports: [
    AuthenticationModule,
    S3Module,
    UserModule.forRoot(Domains.ADMIN),
    MapsModule.forRoot(Domains.ADMIN),
  ],
})
export class AdminModule {}
