import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from '@features/s3/s3.module';
import { Brand } from '../entities/brand.entity';
import { BrandService } from '../services/brand.service';
import { BrandStoreController } from '../controllers/brand-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand]), S3Module],
  providers: [BrandService],
  controllers: [BrandStoreController],
})
export class BrandStoreModule {}
