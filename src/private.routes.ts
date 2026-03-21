import { Routes } from '@nestjs/core';
import { AdminModule } from './domains/admin/admin.module';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { S3Module } from '@features/s3/s3.module';
import { UserModule } from '@features/user/user.module';
import { MapsAdminModule } from '@features/maps/modules/maps-admin.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';
import { CatalogAdminModule } from './catalog/modules/catalog-admin.module';
import { BrandsAdminModule } from './brands/modules/brands-admin.module';
import { CategoriesAdminModule } from './categories/modules/categories-admin.module';
import { ProductsAdminModule } from './products/modules/products-admin.module';

export const privateRoutes: Routes = [
  {
    path: 'admin',
    module: AdminModule,
    children: [
      { path: 'auth', module: AuthenticationModule },
      { path: 's3', module: S3Module },
      { path: 'user', module: UserModule },
      { path: 'maps', module: MapsAdminModule },
      { path: 'contacts', module: ContactsAdminModule },
      { path: 'catalog', module: CatalogAdminModule },
      { path: 'brands', module: BrandsAdminModule },
      { path: 'categories', module: CategoriesAdminModule },
      { path: 'products', module: ProductsAdminModule },
    ],
  },
];
