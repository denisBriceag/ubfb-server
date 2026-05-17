import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsFullLocalizedString } from '@core/validators';

export class CreateCountryDto {
  @IsFullLocalizedString()
  name: Record<string, string>;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  code: string;
}
