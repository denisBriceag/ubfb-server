import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { Product } from '@features/product/entities/product.entity';

import { ProductCollection } from './entities/product-collection.entity';
import { ProductCollectionItem } from './entities/product-collection-item.entity';
import { ProductCollectionService } from './services/product-collection.service';
import { ProductCollectionController } from './controllers/product-collection.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCollection, ProductCollectionItem, Product])],
  providers: [
    ProductCollectionService,
    { provide: DOMAIN, useValue: Domains.ADMIN },
  ],
  exports: [ProductCollectionService],
  controllers: [ProductCollectionController],
})
export class ProductCollectionModule {}
