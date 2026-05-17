import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { PaginatedData } from '@core/types/paginted-data';
import { CountryService } from '../services/country.service';
import { FindManyCountriesStoreDto } from '../dto/find-many-countries-store.dto';
import { StoreCountryModel } from '../models/store-country.model';

@ApiTags('Store / Countries')
@Controller('')
@Auth(AuthType.None)
export class CountryStoreController {
  constructor(private readonly _countryService: CountryService) {}

  @Get()
  @ApiOperation({ summary: 'List countries' })
  @ApiResponse({ status: HttpStatus.OK })
  findMany(
    @Query() dto: FindManyCountriesStoreDto,
    @ActiveLanguage() language: Language,
  ): Promise<PaginatedData<StoreCountryModel>> {
    return this._countryService.findManyStore(dto, language);
  }
}
