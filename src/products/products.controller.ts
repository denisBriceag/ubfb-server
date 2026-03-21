import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { LangDto } from '../common/dto/lang.dto';

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Auth(AuthType.None)
  findAll(@Query() query: ProductFiltersDto) {
    return this.productsService.findAllPublic(query);
  }

  @Get(':slug')
  @Auth(AuthType.None)
  findOne(@Param('slug') slug: string, @Query() query: LangDto) {
    return this.productsService.findBySlugPublic(slug, query.lang);
  }
}
