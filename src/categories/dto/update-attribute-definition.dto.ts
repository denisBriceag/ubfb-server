import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributeDefinitionDto } from './create-attribute-definition.dto';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttributeDefinitionDto extends PartialType(CreateAttributeDefinitionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}
