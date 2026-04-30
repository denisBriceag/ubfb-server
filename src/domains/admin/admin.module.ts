import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { UserModule } from '@features/user/user.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';
import { S3Module } from '@features/s3/s3.module';

@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    ContactsAdminModule,
    S3Module,
  ],
})
export class AdminModule {}
