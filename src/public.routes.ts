import { StoreModule } from './domains/store/store.module';
import { Routes } from '@nestjs/core';

import { ContactsStoreModule } from '@features/contacts/modules/contacts-public.module';
import { CategoryStoreModule } from '@features/category/modules/category-store.module';
import { BrandStoreModule } from '@features/brand/modules/brand-store.module';
import { CountryStoreModule } from '@features/country/modules/country-store.module';
import { PackagingTypeStoreModule } from '@features/packaging-type/modules/packaging-type-store.module';
import { ProductStoreModule } from '@features/product/modules/product-store.module';
import { ProductCollectionStoreModule } from '@features/product-collection/modules/product-collection-store.module';

export const publicRoutes: Routes = [
  {
    path: 'store',
    module: StoreModule,
    children: [
      { path: 'contacts', module: ContactsStoreModule },
      { path: 'categories', module: CategoryStoreModule },
      { path: 'brands', module: BrandStoreModule },
      { path: 'countries', module: CountryStoreModule },
      { path: 'packaging-types', module: PackagingTypeStoreModule },
      { path: 'products', module: ProductStoreModule },
      { path: 'collections', module: ProductCollectionStoreModule },
    ],
  },
];
