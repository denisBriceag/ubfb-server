import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';

import { PackagingType } from '../entities/packaging-type.entity';
import { PackagingTypeService } from '../services/packaging-type.service';
import { PackagingTypeStoreController } from '../controllers/packaging-type-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PackagingType])],
  providers: [
    PackagingTypeService,
    { provide: DOMAIN, useValue: Domains.STORE },
  ],
  controllers: [PackagingTypeStoreController],
})
export class PackagingTypeStoreModule {}
