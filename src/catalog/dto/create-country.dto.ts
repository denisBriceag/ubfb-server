import { IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CountryTranslationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}

class CountryAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryTranslationDto)
  ru: CountryTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryTranslationDto)
  ro: CountryTranslationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryTranslationDto)
  en: CountryTranslationDto;
}

export class CreateCountryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CountryAllTranslationsDto)
  translations: CountryAllTranslationsDto;
}
