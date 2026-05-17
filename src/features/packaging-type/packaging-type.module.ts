import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';

import { PackagingType } from './entities/packaging-type.entity';
import { PackagingTypeService } from './services/packaging-type.service';
import { PackagingTypeController } from './controllers/packaging-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PackagingType])],
  providers: [
    PackagingTypeService,
    { provide: DOMAIN, useValue: Domains.ADMIN },
  ],
  exports: [PackagingTypeService],
  controllers: [PackagingTypeController],
})
export class PackagingTypeModule {}
