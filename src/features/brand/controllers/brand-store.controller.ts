import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { PaginatedData } from '@core/types/paginted-data';
import { BrandService } from '../services/brand.service';
import { FindManyBrandsStoreDto } from '../dto/find-many-brands-store.dto';
import { StoreBrandModel } from '../models/store-brand.model';

@ApiTags('Store / Brands')
@Controller('')
@Auth(AuthType.None)
export class BrandStoreController {
  constructor(private readonly _brandService: BrandService) {}

  @Get()
  @ApiOperation({ summary: 'List brands' })
  @ApiResponse({ status: HttpStatus.OK })
  findMany(
    @Query() dto: FindManyBrandsStoreDto,
    @ActiveLanguage() language: Language,
  ): Promise<PaginatedData<StoreBrandModel>> {
    return this._brandService.findManyStore(dto, language);
  }
}
