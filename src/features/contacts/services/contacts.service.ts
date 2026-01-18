import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '@features/contacts/entities/contacts.entity';
import { UserService } from '@features/user/services/user.service';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { ERROR_MAP, ErrorsEnum } from '@core/types/errors.enum';
import { CreateContactsDto } from '../dto/create-contacts.dto';
import { UpdateContactsDto } from '../dto/update-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly _contactRepository: Repository<Contact>,
    @Inject(DOMAIN) private readonly _domain: Domains,
    private readonly _userService: UserService,
  ) {}

  async create(
    createContactsDto: CreateContactsDto,
    updatedBy: string,
  ): Promise<Contact> {
    const existingContact = await this._contactRepository.findOne({
      where: {},
    });

    if (existingContact) {
      throw new ConflictException({
        message: ErrorsEnum.RESOURCE_ALREADY_EXISTS,
        errorCode: ERROR_MAP.GENERIC_CONFLICT_EXCEPTION,
      });
    }

    const savedContact = await this._contactRepository.save({
      ...createContactsDto,
      updatedBy,
    });

    savedContact.updater = await this._userService.findUpdater(updatedBy);

    return savedContact;
  }

  async update(
    updateContactsDto: UpdateContactsDto,
    updatedBy: string,
  ): Promise<Contact> {
    const contactToUpdate = await this._contactRepository.findOne({
      where: {},
      lock: { mode: 'optimistic', version: updateContactsDto.version },
    });

    if (!contactToUpdate) {
      throw new NotFoundException({
        message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION,
      });
    }

    const updatedContact = await this._contactRepository.save({
      ...contactToUpdate,
      ...updateContactsDto,
      updatedBy,
    });

    updatedContact.updater = await this._userService.findUpdater(updatedBy);

    return updatedContact;
  }

  async getContacts(): Promise<Contact> {
    const qb = this._contactRepository.createQueryBuilder('c');

    if (this._domain === Domains.STORE) {
      qb.select([
        'c.street',
        'c.city',
        'c.country',
        'c.zip',
        'c.secretaryPhone',
        'c.salesPhone',
        'c.email',
      ]);
    } else {
      qb.leftJoin('c.updater', 'u').select('c').addSelect(['u.id', 'u.email']);
    }

    const contact = await qb.getOne();

    if (!contact) {
      throw new NotFoundException({
        message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION,
      });
    }

    return contact;
  }
}
