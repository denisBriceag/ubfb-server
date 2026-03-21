import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BrandTranslationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}

class BrandAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => BrandTranslationDto)
  ru: BrandTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BrandTranslationDto)
  ro: BrandTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BrandTranslationDto)
  en: BrandTranslationDto;
}

export class CreateBrandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

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
  @Type(() => BrandAllTranslationsDto)
  translations: BrandAllTranslationsDto;
}
