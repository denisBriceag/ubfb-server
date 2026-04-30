import { Routes } from '@nestjs/core';
import { AdminModule } from './domains/admin/admin.module';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { S3Module } from '@features/s3/s3.module';
import { UserModule } from '@features/user/user.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';

export const privateRoutes: Routes = [
  {
    path: 'admin',
    module: AdminModule,
    children: [
      {
        path: 'auth',
        module: AuthenticationModule,
      },
      {
        path: 's3',
        module: S3Module,
      },
      {
        path: 'user',
        module: UserModule,
      },
      {
        path: 'contacts',
        module: ContactsAdminModule,
      },
    ],
  },
];
