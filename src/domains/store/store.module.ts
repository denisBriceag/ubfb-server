import { Module } from '@nestjs/common';
import { MapsPublicModule } from '@features/maps/modules/maps-public.module';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';
import { CatalogPublicModule } from '../../catalog/modules/catalog-public.module';
import { BrandsPublicModule } from '../../brands/modules/brands-public.module';
import { CategoriesPublicModule } from '../../categories/modules/categories-public.module';
import { ProductsPublicModule } from '../../products/modules/products-public.module';

@Module({
  imports: [
    MapsPublicModule,
    ContactsPublicModule,
    CatalogPublicModule,
    BrandsPublicModule,
    CategoriesPublicModule,
    ProductsPublicModule,
  ],
})
export class StoreModule {}
