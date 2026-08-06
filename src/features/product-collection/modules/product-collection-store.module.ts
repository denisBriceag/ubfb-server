import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@features/product/entities/product.entity';
import { ProductCollection } from '../entities/product-collection.entity';
import { ProductCollectionItem } from '../entities/product-collection-item.entity';
import { ProductCollectionService } from '../services/product-collection.service';
import { ProductCollectionStoreController } from '../controllers/product-collection-store.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductCollection,
      ProductCollectionItem,
      Product,
    ]),
  ],
  providers: [ProductCollectionService],
  controllers: [ProductCollectionStoreController],
})
export class ProductCollectionStoreModule {}
