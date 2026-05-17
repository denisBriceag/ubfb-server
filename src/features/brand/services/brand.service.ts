import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { S3Service } from '@features/s3/services/s3.service';

import { Brand } from '../entities/brand.entity';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { FindManyBrandsDto } from '../dto/find-many-brands.dto';
import { FindManyBrandsStoreDto } from '../dto/find-many-brands-store.dto';
import { StoreBrandModel } from '../models/store-brand.model';
import { BrandSortBy } from '@features/brand/enums/brand-sort.enum';

@Injectable()
export class BrandService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 10;

  constructor(
    @InjectRepository(Brand)
    private readonly _brandRepository: Repository<Brand>,
    private readonly _s3Service: S3Service,
  ) {}

  async create(dto: CreateBrandDto, updatedBy: string): Promise<Brand> {
    const { logoUrl: rawLogoUrl, ...rest } = dto;
    const logoUrl = await this._s3Service.resolveImage(
      rawLogoUrl ?? null,
      null,
      FEATURES.BRAND,
    );
    const brand = this._brandRepository.create({ ...rest, logoUrl, updatedBy });
    const saved = await this._brandRepository.save(brand);

    return (await this._findOneWithRelations(saved.id))!;
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    updatedBy: string,
  ): Promise<Brand> {
    const existing = await this._brandRepository.findOne({
      where: { id },
      lock: { mode: 'optimistic', version: dto.version },
    });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const { logoUrl: rawLogoUrl, ...rest } = dto;
    const logoUrl = await this._s3Service.resolveImage(
      rawLogoUrl,
      existing.logoUrl,
      FEATURES.BRAND,
    );
    const saved = await this._brandRepository.save({
      ...existing,
      ...rest,
      logoUrl,
      updatedBy,
    });

    return (await this._findOneWithRelations(saved.id))!;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const brand = await this._brandRepository.findOneBy({ id });

    if (!brand) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._brandRepository.update(id, { updatedBy });
    await this._brandRepository.softDelete(id);
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const brand = await this._brandRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!brand) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._brandRepository.restore(id);
    await this._brandRepository.update(id, { updatedBy });
  }

  async hardDelete(id: string): Promise<void> {
    const brand = await this._brandRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!brand) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (brand.logoUrl) {
      await this._s3Service.deleteImages([brand.logoUrl]);
    }

    await this._brandRepository.delete(id);
  }

  async findOneById(id: string): Promise<Brand> {
    const brand = await this._findOneWithRelations(id);

    if (!brand) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return brand;
  }

  async findMany(dto: FindManyBrandsDto): Promise<PaginatedData<Brand>> {
    const search = dto?.search;
    const sortBy = dto?.sortBy ?? BrandSortBy.NAME;
    const sortOrder = dto?.sortOrder ?? SortOrder.ASC;
    const withDeleted = dto?.includeDeleted ?? false;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._brandRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.country', 'country')
      .addSelect(['country.id', 'country.name', 'country.code'])
      .leftJoin('brand.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .orderBy(`brand.${sortBy}`, sortOrder);

    if (withDeleted) {
      qb.withDeleted();
    }

    if (search) {
      qb.andWhere('brand.name ILIKE :search', { search: `%${search}%` });
    }

    if (dto?.countryId) {
      qb.andWhere('brand.countryId = :countryId', { countryId: dto.countryId });
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
    dto: FindManyBrandsStoreDto,
    language: Language,
  ): Promise<PaginatedData<StoreBrandModel>> {
    const sortBy = dto?.sortBy ?? BrandSortBy.NAME;
    const sortOrder = dto?.sortOrder ?? SortOrder.ASC;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._brandRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.country', 'country')
      .addSelect(['country.code', 'country.name'])
      .orderBy(`brand.${sortBy}`, sortOrder);

    if (dto?.search) {
      qb.andWhere('brand.name ILIKE :search', { search: `%${dto.search}%` });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((b) => this._toStoreBrand(b, language)),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private _toStoreBrand(brand: Brand, language: Language): StoreBrandModel {
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logoUrl: brand.logoUrl,
      country: brand.country
        ? {
            code: brand.country.code,
            name: resolveLocalized(brand.country.name, language),
          }
        : null,
    };
  }

  private async _findOneWithRelations(id: string): Promise<Brand | null> {
    return this._brandRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.country', 'country')
      .addSelect(['country.id', 'country.name', 'country.code'])
      .leftJoin('brand.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('brand.id = :id', { id })
      .getOne();
  }
}
