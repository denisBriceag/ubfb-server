import { CreateMapsCoordsDto } from '@features/maps/dto/create-maps-coords.dto';
import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateMapsCoords extends PartialType(CreateMapsCoordsDto) {
  @IsInt()
  @IsPositive()
  version: number;
}
