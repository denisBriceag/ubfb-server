import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from '../entities/country.entity';
import { CountryService } from '../services/country.service';
import { CountryStoreController } from '../controllers/country-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Country])],
  providers: [CountryService],
  controllers: [CountryStoreController],
})
export class CountryStoreModule {}
