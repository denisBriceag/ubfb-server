import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAttributeDto {
  @ApiProperty()
  @IsUUID()
  attributeDefinitionId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  value: string;
}
