import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateImageDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
