import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Contact } from '@features/contacts/entities/contacts.entity';
import { UserService } from '@features/user/services/user.service';
import { ContactResponse } from '@features/contacts/models/contacts-response.model';

import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { Nullable } from '@core/types/nullable';
import { Language } from '@core/types/language';
import { ERROR_MAP, ErrorsEnum } from '@core/types/errors.enum';

import { CreateContactsDto } from '../dto/create-contacts.dto';
import { UpdateContactsDto } from '../dto/update-contacts.dto';

@Injectable()
export class ContactsService {
  private readonly _defaultLang: Language = 'ro';

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

  async getContacts(lang?: Language): Promise<Contact | ContactResponse> {
    const qb = this._contactRepository.createQueryBuilder('c');

    if (this._domain === Domains.STORE) {
      qb.select([
        `COALESCE(c.street->>'${lang}', c.street->>'${this._defaultLang}') as street`,
        `COALESCE(c.city->>'${lang}', c.city->>'${this._defaultLang}') as city`,
        `COALESCE(c.country->>'${lang}', c.country->>'${this._defaultLang}') as country`,
        'c.zip as zip',
        'c.secretaryPhone as "secretaryPhone"',
        'c.salesPhone as "salesPhone"',
        'c.email as email',
      ]);

      return this._ensureContact(await qb.getRawOne());
    }

    qb.leftJoin('c.updater', 'u').addSelect(['u.id', 'u.email']);

    return this._ensureContact(await qb.getOne());
  }

  private _ensureContact(contact: Nullable<Contact | ContactResponse>) {
    if (!contact) {
      throw new NotFoundException({
        message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION,
      });
    }

    return contact;
  }
}
