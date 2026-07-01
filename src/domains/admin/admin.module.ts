import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { UserModule } from '@features/user/user.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';
import { S3Module } from '@features/s3/s3.module';
import { CountryModule } from '@features/country/country.module';
import { BrandModule } from '@features/brand/brand.module';
import { PackagingTypeModule } from '@features/packaging-type/packaging-type.module';
import { CategoryModule } from '@features/category/category.module';
import { ProductModule } from '@features/product/product.module';
import { ProductCollectionModule } from '@features/product-collection/product-collection.module';
import { RequestIdMiddleware } from '@core/middlewares/reqest-id/reqest-id.middleware';
import { RequestLoggerMiddleware } from '@core/middlewares/request-logger/request-logger.middleware';

@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    ContactsAdminModule,
    S3Module,
    CountryModule,
    BrandModule,
    PackagingTypeModule,
    CategoryModule,
    ProductModule,
    ProductCollectionModule,
  ],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
