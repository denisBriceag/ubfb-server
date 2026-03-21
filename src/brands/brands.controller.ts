import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { LangDto } from '../common/dto/lang.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IntersectionType } from '@nestjs/mapped-types';

class BrandsQueryDto extends IntersectionType(LangDto, PaginationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('Brands')
@Controller()
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Auth(AuthType.None)
  @ApiQuery({ name: 'lang', enum: ['ru', 'ro', 'en'], required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: BrandsQueryDto) {
    return this.brandsService.findAllPublic(
      query.lang,
      query.search,
      query.page,
      query.limit,
    );
  }
}
