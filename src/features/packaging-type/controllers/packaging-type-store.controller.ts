import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { resolveLocalizedNullable } from '@core/utils/resolve-localized.util';
import { PackagingTypeService } from '../services/packaging-type.service';
import { StorePackagingTypeModel } from '../models/store-packaging-type.model';

@ApiTags('Store / Packaging Types')
@Controller('')
@Auth(AuthType.None)
export class PackagingTypeStoreController {
  constructor(private readonly _packagingTypeService: PackagingTypeService) {}

  @Get()
  @ApiOperation({ summary: 'List packaging types' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@ActiveLanguage() language: Language): Promise<StorePackagingTypeModel[]> {
    const items = await this._packagingTypeService.findAll();
    return items.map((pt) => ({
      name: pt.name,
      label: resolveLocalizedNullable(pt.label, language),
    }));
  }
}
