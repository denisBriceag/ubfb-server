import { OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { CreatePackagingTypeDto } from './create-packaging-type.dto';

/**
 * `code` is intentionally not updatable: it is the key the storefront filters
 * and links on, so re-wording belongs in `label`. Create a new type if the
 * code itself is wrong.
 * */
export class UpdatePackagingTypeDto extends PartialType(
  OmitType(CreatePackagingTypeDto, ['code'] as const),
) {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version: number;
}
