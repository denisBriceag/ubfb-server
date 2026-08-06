import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { SLUG_REGEX } from '@core/constants';

export class CreateProductCollectionDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(SLUG_REGEX, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
