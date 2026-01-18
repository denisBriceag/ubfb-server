import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from '@features/user/user.module';
import { MapsAdminModule } from '@features/maps/modules/maps-admin.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';

@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    MapsAdminModule,
    ContactsAdminModule,
  ],
})
export class AdminModule {}
