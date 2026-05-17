import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { CategoryService } from '../services/category.service';
import { StoreCategoryNode } from '../models/store-category.model';

@ApiTags('Store / Categories')
@Controller('')
@Auth(AuthType.None)
export class CategoryStoreController {
  constructor(private readonly _categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get category tree' })
  @ApiResponse({ status: HttpStatus.OK })
  getTree(@ActiveLanguage() language: Language): Promise<StoreCategoryNode[]> {
    return this._categoryService.findTree(language);
  }
}
