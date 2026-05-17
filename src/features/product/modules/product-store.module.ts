import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from '@features/s3/s3.module';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { ProductStoreController } from '../controllers/product-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), S3Module],
  providers: [ProductService],
  controllers: [ProductStoreController],
})
export class ProductStoreModule {}
