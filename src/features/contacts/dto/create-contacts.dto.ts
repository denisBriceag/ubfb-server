import { Language } from '@core/types/language';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';
import { Transform } from 'class-transformer';

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
  email: string;
}
