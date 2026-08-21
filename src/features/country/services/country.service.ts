import {
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { collated } from '@core/utils/localized-collator.util';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';

import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { Brand } from '@features/brand/entities/brand.entity';
import { Product } from '@features/product/entities/product.entity';
import { Country } from '../entities/country.entity';
import { CreateCountryDto } from '../dto/create-country.dto';
import { UpdateCountryDto } from '../dto/update-country.dto';
import { FindManyCountriesDto } from '../dto/find-many-countries.dto';
import { FindManyCountriesStoreDto } from '../dto/find-many-countries-store.dto';
import { SearchCountriesDto } from '../dto/search-countries.dto';
import { StoreCountryModel } from '../models/store-country.model';
import { CountrySuggestion } from '../models/country-suggestion.model';
import {
  RestCountriesObject,
  RestCountriesResponse,
} from '../types/rest-countries.type';
import { CountrySortBy } from '@features/country/enums/country-sort.enum';

const COUNTRIES_API_URL = 'https://api.restcountries.com/countries/v5';
const COUNTRIES_API_TIMEOUT_MS = 5000;

@Injectable()
export class CountryService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 10;
  private readonly _defaultSearchLimit = 10;

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

    await this._assertNotReferenced(id);

    await this._countryRepository.delete(id);
  }

  /**
   * Blocks a hard delete when brands or products still point at the country.
   * The FK is `NO ACTION`, so the delete would fail at the DB with an opaque
   * violation; this turns it into a precise, actionable message instead.
   *
   * Soft-deleted rows are counted too: they physically remain and still hold
   * the foreign key, so they block the delete just the same.
   * */
  private async _assertNotReferenced(id: string): Promise<void> {
    const manager = this._countryRepository.manager;

    const [brandCount, productCount] = await Promise.all([
      manager.count(Brand, { where: { countryId: id }, withDeleted: true }),
      manager.count(Product, { where: { countryId: id }, withDeleted: true }),
    ]);

    if (brandCount === 0 && productCount === 0) {
      return;
    }

    const parts: string[] = [];

    if (brandCount > 0) {
      parts.push(ERROR_MESSAGES.countOf(brandCount, 'brand'));
    }

    if (productCount > 0) {
      parts.push(ERROR_MESSAGES.countOf(productCount, 'product'));
    }

    throw new ConflictException({
      message: ERROR_MESSAGES.stillReferenced('Country', parts),
      errorCode: ERROR_MAP.COUNTRY_IN_USE,
    });
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
      .addSelect(['updater.id', 'updater.email']);

    if (sortBy === CountrySortBy.NAME) {
      qb.addSelect(
        collated(`country.name->>'${language ?? 'en'}'`, language),
        'country_name_sort',
      );
      qb.orderBy('country_name_sort', sortOrder);
    } else {
      qb.orderBy(`country.${sortBy}`, sortOrder);
    }

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
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    // Always alphabetical: the storefront has no say in the ordering.
    const qb = this._countryRepository
      .createQueryBuilder('country')
      .addSelect(
        collated(`country.name->>'${language}'`, language),
        'country_name_sort',
      )
      .orderBy('country_name_sort', SortOrder.ASC);

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

  /**
   * @description Looks up countries in the external REST Countries provider so an admin can
   * pick one instead of typing the code and names by hand.
   *
   * The provider has no Romanian translation for any country, so `name.ro` is
   * always returned as null and must be filled in before creating the country.
   * */
  async search(dto: SearchCountriesDto): Promise<CountrySuggestion[]> {
    const apiKey = process.env.COUNTRIES_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException({
        message: ErrorsEnum.COUNTRIES_API_NOT_CONFIGURED,
        errorCode: ERROR_MAP.COUNTRIES_API_NOT_CONFIGURED,
      });
    }

    const limit = dto.limit ?? this._defaultSearchLimit;
    const url = new URL(COUNTRIES_API_URL);

    url.searchParams.set('q', dto.q);
    url.searchParams.set('limit', `${limit}`);
    // Trims the payload: the full record also carries colours and borders.
    // `flag.emoji` is a nested path, so only the emoji is pulled from `flag`.
    url.searchParams.set('response_fields', 'names,codes,flag.emoji');

    const payload = await this._fetchCountries(url, apiKey);
    const suggestions = payload.data.objects.map((object) =>
      this._toSuggestion(object),
    );

    return this._markExisting(suggestions);
  }

  private async _fetchCountries(
    url: URL,
    apiKey: string,
  ): Promise<RestCountriesResponse> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(COUNTRIES_API_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException({
        message: ErrorsEnum.COUNTRIES_API_UNAVAILABLE,
        errorCode: ERROR_MAP.COUNTRIES_API_UNAVAILABLE,
      });
    }

    const status: HttpStatus = response.status;

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new HttpException(
        {
          message: ErrorsEnum.TOO_MANY_REQUESTS,
          errorCode: ERROR_MAP.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok) {
      throw new BadGatewayException({
        message: ErrorsEnum.COUNTRIES_API_UNAVAILABLE,
        errorCode: ERROR_MAP.COUNTRIES_API_UNAVAILABLE,
      });
    }

    return (await response.json()) as RestCountriesResponse;
  }

  private _toSuggestion(object: RestCountriesObject): CountrySuggestion {
    const translations = object.names.translations ?? {};

    return {
      code: object.codes.alpha_3,
      name: {
        en: object.names.official,
        ro: translations.ron?.official ?? null,
        ru: translations.rus?.official ?? null,
      },
      emoji: object.flag?.emoji ?? null,
      exists: false,
    };
  }

  /**
   * Soft-deleted countries still occupy the unique `code` index, so they count
   * as existing — creating one would fail and the admin has to restore instead.
   * */
  private async _markExisting(
    suggestions: CountrySuggestion[],
  ): Promise<CountrySuggestion[]> {
    if (!suggestions.length) {
      return suggestions;
    }

    const existing = await this._countryRepository.find({
      where: { code: In(suggestions.map((s) => s.code)) },
      select: ['code'],
      withDeleted: true,
    });
    const existingCodes = new Set(existing.map((country) => country.code));

    return suggestions.map((suggestion) => ({
      ...suggestion,
      exists: existingCodes.has(suggestion.code),
    }));
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
