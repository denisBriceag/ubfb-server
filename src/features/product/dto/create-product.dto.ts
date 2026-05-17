import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { IsFullLocalizedString, IsLocalizedQuillDelta } from '@core/validators';
import { SLUG_REGEX } from '@core/constants';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  @Matches(SLUG_REGEX, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @IsOptional()
  @IsUUID()
  countryId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsLocalizedQuillDelta()
  description?: Record<string, object> | null;

  @IsOptional()
  @IsFullLocalizedString()
  metaTitle?: Record<string, string> | null;

  @IsOptional()
  @IsFullLocalizedString()
  metaDescription?: Record<string, string> | null;

  @IsOptional()
  @IsUUID()
  packagingTypeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  volumeMl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  weightG?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitCount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  alcoholPercentage?: number | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  sku?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isWholesale?: boolean;

  @IsOptional()
  @IsBoolean()
  isGiftBox?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  relatedProductIds?: string[];
}
