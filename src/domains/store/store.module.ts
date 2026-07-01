import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ContactsStoreModule } from '@features/contacts/modules/contacts-public.module';
import { CategoryStoreModule } from '@features/category/modules/category-store.module';
import { BrandStoreModule } from '@features/brand/modules/brand-store.module';
import { CountryStoreModule } from '@features/country/modules/country-store.module';
import { PackagingTypeStoreModule } from '@features/packaging-type/modules/packaging-type-store.module';
import { ProductStoreModule } from '@features/product/modules/product-store.module';
import { ProductCollectionStoreModule } from '@features/product-collection/modules/product-collection-store.module';
import { RequestIdMiddleware } from '@core/middlewares/reqest-id/reqest-id.middleware';

@Module({
  imports: [
    ContactsStoreModule,
    CategoryStoreModule,
    BrandStoreModule,
    CountryStoreModule,
    PackagingTypeStoreModule,
    ProductStoreModule,
    ProductCollectionStoreModule,
  ],
})
export class StoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
