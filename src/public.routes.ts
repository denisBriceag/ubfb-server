import { StoreModule } from './domains/store/store.module';
import { Routes } from '@nestjs/core';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';

export const publicRoutes: Routes = [
  {
    path: 'store',
    module: StoreModule,
    children: [
      {
        path: 'contacts',
        module: ContactsPublicModule,
      },
    ],
  },
];
