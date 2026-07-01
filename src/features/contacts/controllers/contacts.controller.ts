import { Body, Controller, Get, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { FEATURES } from '@core/constants';
import { ContactsService } from '@features/contacts/services/contacts.service';
import { CreateContactsDto } from '@features/contacts/dto/create-contacts.dto';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { Contact } from '@features/contacts/entities/contacts.entity';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { UpdateContactsDto } from '@features/contacts/dto/update-contacts.dto';
import { ContactResponse } from '@features/contacts/models/contacts-response.model';

const operations = getSwaggerOperations(FEATURES.CONTACTS);

@ApiTags('Contacts')
@Controller('')
export class ContactsController {
  constructor(private readonly _contactsService: ContactsService) {}

  @Post()
  @Auth(AuthType.Bearer)
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.CREATE_NEW,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  createContacts(
    @Body() createContactsDto: CreateContactsDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Contact> {
    return this._contactsService.create(createContactsDto, currentUserId);
  }

  @Get()
  @Auth(AuthType.Bearer)
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.USER)
  @ApiOperation({
    summary: operations.GET_ALL,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.GET_ALL_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  getContacts(): Promise<Contact | ContactResponse> {
    return this._contactsService.getContacts();
  }

  @Patch()
  @Auth(AuthType.Bearer)
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.UPDATE_SUCCESS,
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  updateContacts(
    @Body() updateContacts: UpdateContactsDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Contact> {
    return this._contactsService.update(updateContacts, currentUserId);
  }
}
