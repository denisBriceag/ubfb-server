import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttributeType } from '../entities/attribute-definition.entity';

class AttrTranslationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  label: string;
}

class AttrAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => AttrTranslationDto)
  ru: AttrTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AttrTranslationDto)
  ro: AttrTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AttrTranslationDto)
  en: AttrTranslationDto;
}

export class CreateAttributeDefinitionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({ enum: AttributeType })
  @IsEnum(AttributeType)
  type: AttributeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AttrAllTranslationsDto)
  translations: AttrAllTranslationsDto;
}
