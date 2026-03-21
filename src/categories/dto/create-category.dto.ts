import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CategoryTranslationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}

class CategoryAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CategoryTranslationDto)
  ru: CategoryTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CategoryTranslationDto)
  ro: CategoryTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CategoryTranslationDto)
  en: CategoryTranslationDto;
}

export class CreateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOther?: boolean;

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
  @Type(() => CategoryAllTranslationsDto)
  translations: CategoryAllTranslationsDto;
}
