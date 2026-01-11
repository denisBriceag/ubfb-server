import { Routes } from '@nestjs/core';
import { AdminModule } from './domains/admin/admin.module';
import { AuthenticationModule } from './domains/admin/authentication/authentication.module';
import { S3Module } from './domains/admin/s3/s3.module';
import { StoreModule } from './domains/store/store.module';
import { UserModule } from '@features/user/user.module';
import { MapsModule } from '@features/maps/maps.module';

export const appRoutes: Routes = [
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
        path: 'maps',
        module: MapsModule,
      },
    ],
  },
  { path: 'store', module: StoreModule },
];
