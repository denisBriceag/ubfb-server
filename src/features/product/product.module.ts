import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { S3Module } from '@features/s3/s3.module';

import { Product } from './entities/product.entity';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), S3Module],
  providers: [ProductService, { provide: DOMAIN, useValue: Domains.ADMIN }],
  exports: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
