import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProductTranslationItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  descriptionDelta?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionText?: string;
}

class ProductAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductTranslationItemDto)
  ru: ProductTranslationItemDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductTranslationItemDto)
  ro: ProductTranslationItemDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductTranslationItemDto)
  en: ProductTranslationItemDto;
}

export class CreateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsUUID()
  brandId: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volumeValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  volumeUnitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  alcoholDegree?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductAllTranslationsDto)
  translations: ProductAllTranslationsDto;
}
