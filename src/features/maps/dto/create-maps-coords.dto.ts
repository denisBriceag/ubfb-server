import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMapsCoordsDto {
  @IsNumber()
  @IsNotEmpty()
  centerLat: number;

  @IsNumber()
  @IsNotEmpty()
  centerLng: number;

  @IsNumber()
  @IsNotEmpty()
  markerLat: number;

  @IsNumber()
  @IsNotEmpty()
  markerLng: number;

  @IsNumber()
  @IsNotEmpty()
  zoom: number;
}
