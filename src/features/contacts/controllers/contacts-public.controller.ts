import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  getSwaggerOperations,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { Contact } from '@features/contacts/entities/contacts.entity';
import { FEATURES } from '@core/constants';
import { ContactsService } from '@features/contacts/services/contacts.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import type { Language } from '@core/types/language';
import { ContactResponse } from '@features/contacts/models/contacts-response.model';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';

const operations = getSwaggerOperations(FEATURES.CONTACTS);

@ApiTags('Contacts')
@Controller('')
export class ContactsPublicController {
  constructor(private readonly _contactsService: ContactsService) {}

  @Get()
  @Auth(AuthType.None)
  @ApiOperation({
    summary: operations.GET_ALL,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.GET_ALL_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  getContacts(
    @ActiveLanguage() lang: Language,
  ): Promise<Contact | ContactResponse> {
    return this._contactsService.getContacts(lang);
  }
}
