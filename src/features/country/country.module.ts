import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';

import { Country } from './entities/country.entity';
import { CountryService } from './services/country.service';
import { CountryController } from './controllers/country.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Country])],
  providers: [CountryService, { provide: DOMAIN, useValue: Domains.ADMIN }],
  exports: [CountryService],
  controllers: [CountryController],
})
export class CountryModule {}
