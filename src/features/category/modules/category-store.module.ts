import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from '@features/s3/s3.module';
import { Category } from '../entities/category.entity';
import { CategoryService } from '../services/category.service';
import { CategoryStoreController } from '../controllers/category-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), S3Module],
  providers: [CategoryService],
  controllers: [CategoryStoreController],
})
export class CategoryStoreModule {}
