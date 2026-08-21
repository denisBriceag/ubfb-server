import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiHeader } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { PackagingTypeService } from '../services/packaging-type.service';
import { StorePackagingTypeModel } from '../models/store-packaging-type.model';

@ApiTags('Store / Packaging Types')
@Controller('')
@Auth(AuthType.None)
export class PackagingTypeStoreController {
  constructor(private readonly _packagingTypeService: PackagingTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List packaging types that are in use by visible products',
    description:
      'Prefer the packagingTypes facet on /store/products/filters: it carries counts and respects the active filters.',
  })
  @ApiHeader({
    name: 'x-language',
    required: false,
    description:
      "Display language for `label`. One of en|ro|ru, defaults to 'ro'.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: [StorePackagingTypeModel] })
  async findAll(
    @ActiveLanguage() language: Language,
  ): Promise<StorePackagingTypeModel[]> {
    return this._packagingTypeService.findAllStore(language);
  }
}
