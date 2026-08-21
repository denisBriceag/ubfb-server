import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';
import { SLUG_REGEX } from '@core/constants';
import { Language } from '@core/types/language';

export class CreatePackagingTypeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Matches(SLUG_REGEX, {
    message: 'code must contain only lowercase letters, numbers, and hyphens',
  })
  code: string;

  @IsFullLocalizedString()
  label: Record<Language, string>;
}
