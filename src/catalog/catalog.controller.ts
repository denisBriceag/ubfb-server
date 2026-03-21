import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { LangDto } from '../common/dto/lang.dto';

@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('volume-units')
  @Auth(AuthType.None)
  @ApiQuery({ name: 'lang', enum: ['ru', 'ro', 'en'], required: false })
  getVolumeUnits(@Query() query: LangDto) {
    return this.catalogService.findAllVolumeUnitsPublic(query.lang);
  }

  @Get('countries')
  @Auth(AuthType.None)
  @ApiQuery({ name: 'lang', enum: ['ru', 'ro', 'en'], required: false })
  getCountries(@Query() query: LangDto) {
    return this.catalogService.findAllCountriesPublic(query.lang);
  }
}
