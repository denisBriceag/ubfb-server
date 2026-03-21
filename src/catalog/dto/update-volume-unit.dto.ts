import { PartialType } from '@nestjs/mapped-types';
import { CreateVolumeUnitDto } from './create-volume-unit.dto';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVolumeUnitDto extends PartialType(CreateVolumeUnitDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}
