import { Module } from '@nestjs/common';
import { ProductsModule } from '../products.module';
import { ProductsController } from '../products.controller';

@Module({
  imports: [ProductsModule],
  controllers: [ProductsController],
})
export class ProductsPublicModule {}
