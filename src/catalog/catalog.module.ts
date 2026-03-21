import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogService } from './catalog.service';
import { VolumeUnit } from './entities/volume-unit.entity';
import { VolumeUnitTranslation } from './entities/volume-unit-translation.entity';
import { Country } from './entities/country.entity';
import { CountryTranslation } from './entities/country-translation.entity';
import { Language } from './entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Language,
      VolumeUnit,
      VolumeUnitTranslation,
      Country,
      CountryTranslation,
    ]),
  ],
  providers: [CatalogService],
  exports: [CatalogService, TypeOrmModule],
})
export class CatalogModule {}
