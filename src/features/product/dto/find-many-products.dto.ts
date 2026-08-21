import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ProductSortBy } from '@features/product/enums/product-sort.enum';

export class FindManyProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  brandSlug?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  packagingTypeCode?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isWholesale?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isGiftBox?: boolean;

  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeDeleted?: boolean = false;
}
