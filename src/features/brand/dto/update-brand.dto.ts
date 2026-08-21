import { OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

/**
 * `slug` is intentionally not updatable: it is the key the storefront filters
 * and links on (`?brandSlug=`), so changing it would break every bookmarked
 * and indexed URL. Re-wording belongs in `name`.
 * */
export class UpdateBrandDto extends PartialType(
  OmitType(CreateBrandDto, ['slug'] as const),
) {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version: number;
}
