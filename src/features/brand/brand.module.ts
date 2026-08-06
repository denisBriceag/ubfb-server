import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { S3Module } from '@features/s3/s3.module';

import { Brand } from './entities/brand.entity';
import { BrandService } from './services/brand.service';
import { BrandController } from './controllers/brand.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand]), S3Module],
  providers: [BrandService, { provide: DOMAIN, useValue: Domains.ADMIN }],
  exports: [BrandService],
  controllers: [BrandController],
})
export class BrandModule {}
