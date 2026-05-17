import { IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { SLUG_REGEX } from '@core/constants';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  @Matches(SLUG_REGEX, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  name: string;

  @IsOptional()
  @IsUUID()
  countryId?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}
