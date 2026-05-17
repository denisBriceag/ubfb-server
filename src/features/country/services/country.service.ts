import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';

import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { Country } from '../entities/country.entity';
import { CreateCountryDto } from '../dto/create-country.dto';
import { UpdateCountryDto } from '../dto/update-country.dto';
import { FindManyCountriesDto } from '../dto/find-many-countries.dto';
import { FindManyCountriesStoreDto } from '../dto/find-many-countries-store.dto';
import { StoreCountryModel } from '../models/store-country.model';
import { CountrySortBy } from '@features/country/enums/country-sort.enum';

@Injectable()
export class CountryService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 10;

  constructor(
    @InjectRepository(Country)
    private readonly _countryRepository: Repository<Country>,
  ) {}

  async create(dto: CreateCountryDto, updatedBy: string): Promise<Country> {
    const country = this._countryRepository.create({ ...dto, updatedBy });
    const saved = await this._countryRepository.save(country);

    return (await this._findOneWithUpdater(saved.id))!;
  }

  async update(
    id: string,
    dto: UpdateCountryDto,
    updatedBy: string,
  ): Promise<Country> {
    const existing = await this._countryRepository.findOne({
      where: { id },
      lock: { mode: 'optimistic', version: dto.version },
    });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.COUNTRY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const saved = await this._countryRepository.save({
      ...existing,
      ...dto,
      updatedBy,
    });

    return (await this._findOneWithUpdater(saved.id))!;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const country = await this._countryRepository.findOneBy({ id });

    if (!country) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.COUNTRY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._countryRepository.update(id, { updatedBy });
    await this._countryRepository.softDelete(id);
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const country = await this._countryRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!country) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.COUNTRY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._countryRepository.restore(id);
    await this._countryRepository.update(id, { updatedBy });
  }

  async hardDelete(id: string): Promise<void> {
    const country = await this._countryRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!country) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.COUNTRY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._countryRepository.delete(id);
  }

  async findOneById(id: string): Promise<Country> {
    const country = await this._findOneWithUpdater(id);

    if (!country) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.COUNTRY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return country;
  }

  async findMany(
    dto: FindManyCountriesDto,
    language?: Language,
  ): Promise<PaginatedData<Country>> {
    const search = dto?.search;
    const sortBy = dto?.sortBy ?? CountrySortBy.NAME;
    const sortOrder = dto?.sortOrder ?? SortOrder.ASC;
    const withDeleted = dto?.includeDeleted ?? false;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._countryRepository
      .createQueryBuilder('country')
      .leftJoin('country.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .orderBy(
        sortBy === CountrySortBy.NAME
          ? `country.name->>'${language ?? 'en'}'`
          : `country.${sortBy}`,
        sortOrder,
      );

    if (withDeleted) {
      qb.withDeleted();
    }

    if (search) {
      const lang = language ?? 'en';
      qb.andWhere(
        `(country.name->>'${lang}' ILIKE :search OR country.code ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findManyStore(
    dto: FindManyCountriesStoreDto,
    language: Language,
  ): Promise<PaginatedData<StoreCountryModel>> {
    const sortBy = dto?.sortBy ?? CountrySortBy.NAME;
    const sortOrder = dto?.sortOrder ?? SortOrder.ASC;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._countryRepository
      .createQueryBuilder('country')
      .orderBy(
        sortBy === CountrySortBy.NAME
          ? `country.name->>'${language}'`
          : `country.${sortBy}`,
        sortOrder,
      );

    if (dto?.search) {
      qb.andWhere(
        `(country.name->>'${language}' ILIKE :search OR country.code ILIKE :search)`,
        { search: `%${dto.search}%` },
      );
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((c) => this._toStoreCountry(c, language)),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private _toStoreCountry(
    country: Country,
    language: Language,
  ): StoreCountryModel {
    return {
      code: country.code,
      name: resolveLocalized(country.name, language),
    };
  }

  private async _findOneWithUpdater(id: string): Promise<Country | null> {
    return this._countryRepository
      .createQueryBuilder('country')
      .leftJoin('country.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('country.id = :id', { id })
      .getOne();
  }
}
