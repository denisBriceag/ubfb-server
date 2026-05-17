import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';

export class CreatePackagingTypeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsFullLocalizedString()
  label?: Record<string, string> | null;
}
