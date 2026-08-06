import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';
import { SLUG_REGEX } from '@core/constants';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  @Matches(SLUG_REGEX, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsFullLocalizedString()
  name: Record<string, string>;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
