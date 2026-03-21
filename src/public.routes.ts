import { StoreModule } from './domains/store/store.module';
import { Routes } from '@nestjs/core';
import { MapsPublicModule } from '@features/maps/modules/maps-public.module';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';
import { CatalogPublicModule } from './catalog/modules/catalog-public.module';
import { BrandsPublicModule } from './brands/modules/brands-public.module';
import { CategoriesPublicModule } from './categories/modules/categories-public.module';
import { ProductsPublicModule } from './products/modules/products-public.module';

export const publicRoutes: Routes = [
  {
    path: 'store',
    module: StoreModule,
    children: [
      { path: 'maps', module: MapsPublicModule },
      { path: 'contacts', module: ContactsPublicModule },
      { path: 'catalog', module: CatalogPublicModule },
      { path: 'brands', module: BrandsPublicModule },
      { path: 'categories', module: CategoriesPublicModule },
      { path: 'products', module: ProductsPublicModule },
    ],
  },
];
