import { StoreModule } from './domains/store/store.module';
import { Routes } from '@nestjs/core';
import { MapsPublicModule } from '@features/maps/modules/maps-public.module';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';

export const publicRoutes: Routes = [
  {
    path: 'store',
    module: StoreModule,
    children: [
      {
        path: 'maps',
        module: MapsPublicModule,
      },
      {
        path: 'contacts',
        module: ContactsPublicModule,
      },
    ],
  },
];
