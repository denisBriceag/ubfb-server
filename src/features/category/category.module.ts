import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { S3Module } from '@features/s3/s3.module';

import { Category } from './entities/category.entity';
import { CategoryService } from './services/category.service';
import { CategoryController } from './controllers/category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), S3Module],
  providers: [CategoryService, { provide: DOMAIN, useValue: Domains.ADMIN }],
  exports: [CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
