import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { ProductCollectionService } from '../services/product-collection.service';
import { StoreCollectionModel } from '../models/store-product-collection.model';

@ApiTags('Store / Collections')
@Controller('')
@Auth(AuthType.None)
export class ProductCollectionStoreController {
  constructor(private readonly _collectionService: ProductCollectionService) {}

  @Get()
  @ApiOperation({ summary: 'List active collections with their products' })
  @ApiResponse({ status: HttpStatus.OK })
  findAll(
    @ActiveLanguage() language: Language,
  ): Promise<StoreCollectionModel[]> {
    return this._collectionService.findAllActiveStore(language);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get active collection by slug' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  findOne(
    @Param('slug') slug: string,
    @ActiveLanguage() language: Language,
  ): Promise<StoreCollectionModel> {
    return this._collectionService.findOneBySlugStore(slug, language);
  }
}
