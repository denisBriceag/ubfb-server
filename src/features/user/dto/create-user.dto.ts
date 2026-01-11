import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Roles } from '@core/types/roles.enum';

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

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
