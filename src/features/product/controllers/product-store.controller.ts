import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { PaginatedData } from '@core/types/paginted-data';
import { ProductService } from '../services/product.service';
import { FindManyProductsStoreDto } from '../dto/find-many-products-store.dto';
import { StoreProductModel } from '../models/store-product.model';
import { StoreProductFiltersModel } from '../models/store-product-filters.model';

@ApiTags('Store / Products')
@Controller('')
@Auth(AuthType.None)
export class ProductStoreController {
  constructor(private readonly _productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List active products' })
  @ApiResponse({ status: HttpStatus.OK })
  findMany(
    @Query() dto: FindManyProductsStoreDto,
    @ActiveLanguage() language: Language,
  ): Promise<PaginatedData<StoreProductModel>> {
    return this._productService.findManyStore(dto, language);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get dynamic product filter facets' })
  @ApiResponse({ status: HttpStatus.OK })
  getFilters(
    @Query() dto: FindManyProductsStoreDto,
    @ActiveLanguage() language: Language,
  ): Promise<StoreProductFiltersModel> {
    return this._productService.findFilters(dto, language);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  findOne(
    @Param('slug') slug: string,
    @ActiveLanguage() language: Language,
  ): Promise<StoreProductModel> {
    return this._productService.findOneBySlugStore(slug, language);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products for a product' })
  @ApiResponse({ status: HttpStatus.OK })
  findRelated(
    @Param('slug') slug: string,
    @ActiveLanguage() language: Language,
  ): Promise<StoreProductModel[]> {
    return this._productService.findRelatedStore(slug, language);
  }
}
