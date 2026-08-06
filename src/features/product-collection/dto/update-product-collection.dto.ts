import { PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { CreateProductCollectionDto } from './create-product-collection.dto';

export class UpdateProductCollectionDto extends PartialType(
  CreateProductCollectionDto,
) {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version: number;
}
