import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Roles } from '@core/types/roles.enum';
import { UBFB_EMAIL_REGEX } from '@core/constants';

export class CreateUserDto {
  @IsEnum(Roles)
  @IsNotEmpty()
  role: Roles;

  @MinLength(8)
  @IsNotEmpty()
  @IsString()
  password: string;

  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  name: string;

  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  surname: string;

  @Matches(UBFB_EMAIL_REGEX, {
    message: 'email must be a valid @ubfb.md address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
