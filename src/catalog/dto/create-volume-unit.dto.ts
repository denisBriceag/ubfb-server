import { IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class VolumeUnitTranslationsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  label: string;
}

class VolumeUnitAllTranslationsDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => VolumeUnitTranslationsDto)
  ru: VolumeUnitTranslationsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => VolumeUnitTranslationsDto)
  ro: VolumeUnitTranslationsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => VolumeUnitTranslationsDto)
  en: VolumeUnitTranslationsDto;
}

export class CreateVolumeUnitDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => VolumeUnitAllTranslationsDto)
  translations: VolumeUnitAllTranslationsDto;
}
