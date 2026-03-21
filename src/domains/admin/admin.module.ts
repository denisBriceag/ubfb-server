import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@features/authentication/authentication.module';
import { UserModule } from '@features/user/user.module';
import { MapsAdminModule } from '@features/maps/modules/maps-admin.module';
import { ContactsAdminModule } from '@features/contacts/modules/contacts-admin.module';
import { S3Module } from '@features/s3/s3.module';
import { CatalogAdminModule } from '../../catalog/modules/catalog-admin.module';
import { BrandsAdminModule } from '../../brands/modules/brands-admin.module';
import { CategoriesAdminModule } from '../../categories/modules/categories-admin.module';
import { ProductsAdminModule } from '../../products/modules/products-admin.module';

@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    MapsAdminModule,
    ContactsAdminModule,
    S3Module,
    CatalogAdminModule,
    BrandsAdminModule,
    CategoriesAdminModule,
    ProductsAdminModule,
  ],
})
export class AdminModule {}
