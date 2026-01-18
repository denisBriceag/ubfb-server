import { PartialType } from '@nestjs/mapped-types';
import { CreateContactsDto } from '@features/contacts/dto/create-contacts.dto';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateContactsDto extends PartialType(CreateContactsDto) {
  @IsInt()
  @IsPositive()
  version: number;
}
