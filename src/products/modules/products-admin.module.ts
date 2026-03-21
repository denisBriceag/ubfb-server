import { Module } from '@nestjs/common';
import { ProductsModule } from '../products.module';
import { ProductsAdminController } from '../products.admin.controller';

@Module({
  imports: [ProductsModule],
  controllers: [ProductsAdminController],
})
export class ProductsAdminModule {}
