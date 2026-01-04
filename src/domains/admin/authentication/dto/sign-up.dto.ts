import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Roles } from '@core/types/roles.enum';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Roles)
  role: Roles;
}
