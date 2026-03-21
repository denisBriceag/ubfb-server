import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LangDto } from '../../common/dto/lang.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IntersectionType } from '@nestjs/mapped-types';

export enum ProductSort {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  NEWEST = 'newest',
  ALCOHOL_ASC = 'alcohol_asc',
  ALCOHOL_DESC = 'alcohol_desc',
}

export class ProductFiltersDto extends IntersectionType(LangDto, PaginationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minDegree?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDegree?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  volumeUnitCode?: string;

  @ApiPropertyOptional({ enum: ProductSort })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;
}
