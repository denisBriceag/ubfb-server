import { PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version: number;
}
