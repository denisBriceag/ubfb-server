import { Routes } from '@nestjs/core';
import { AdminModule } from './domains/admin/admin.module';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { S3Module } from '@features/s3/s3.module';
import { UserModule } from '@features/user/user.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';
import { CountryModule } from '@features/country/country.module';
import { BrandModule } from '@features/brand/brand.module';
import { PackagingTypeModule } from '@features/packaging-type/packaging-type.module';
import { CategoryModule } from '@features/category/category.module';
import { ProductModule } from '@features/product/product.module';
import { ProductCollectionModule } from '@features/product-collection/product-collection.module';

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
      {
        path: 'countries',
        module: CountryModule,
      },
      {
        path: 'brands',
        module: BrandModule,
      },
      {
        path: 'packaging-types',
        module: PackagingTypeModule,
      },
      {
        path: 'categories',
        module: CategoryModule,
      },
      {
        path: 'products',
        module: ProductModule,
      },
      {
        path: 'collections',
        module: ProductCollectionModule,
      },
    ],
  },
];
