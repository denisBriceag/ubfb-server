import { Language } from '@core/types/language';
import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Matches,
} from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';
import { Transform } from 'class-transformer';
import { MD_ZIP_PATTERN, UBFB_EMAIL_REGEX } from '@core/constants';

export class CreateContactsDto {
  @IsNotEmpty()
  @IsFullLocalizedString()
  street: Record<Language, string>;

  @IsNotEmpty()
  @IsFullLocalizedString()
  city: Record<Language, string>;

  @IsNotEmpty()
  @IsFullLocalizedString()
  country: Record<Language, string>;

  @IsNotEmpty()
  @IsString()
  @Matches(MD_ZIP_PATTERN)
  zip: string;

  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  @IsPhoneNumber('MD')
  secretaryPhone: string;

  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  @IsPhoneNumber('MD')
  salesPhone: string;

  @IsNotEmpty()
  @IsEmail()
  @Matches(UBFB_EMAIL_REGEX, {
    message: 'email must be a valid @ubfb.md address',
  })
  email: string;
}
