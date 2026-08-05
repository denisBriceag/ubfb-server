import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ProductStoreSortBy } from '@features/product/enums/product-sort.enum';

export class FindManyProductsStoreDto {
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
  packagingTypeName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAlcohol?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(99)
  @Min(0)
  maxAlcohol?: number;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isWholesale?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isGiftBox?: boolean;

  @IsOptional()
  @IsEnum(ProductStoreSortBy)
  sortBy?: ProductStoreSortBy;

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
}
