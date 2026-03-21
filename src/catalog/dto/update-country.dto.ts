import { PartialType } from '@nestjs/mapped-types';
import { CreateCountryDto } from './create-country.dto';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCountryDto extends PartialType(CreateCountryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}
