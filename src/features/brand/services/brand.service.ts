import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { collated } from '@core/utils/localized-collator.util';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { S3Service } from '@features/s3/services/s3.service';
import { Product } from '@features/product/entities/product.entity';

import { Brand } from '../entities/brand.entity';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { FindManyBrandsDto } from '../dto/find-many-brands.dto';
import { FindManyBrandsStoreDto } from '../dto/find-many-brands-store.dto';
import { StoreBrandModel } from '../models/store-brand.model';
import { BrandSortBy } from '@features/brand/enums/brand-sort.enum';

@Injectable()
export class BrandService {
  private readonly _logger = new Logger(BrandService.name);
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 10;

  constructor(
    @InjectRepository(Brand)
    private readonly _brandRepository: Repository<Brand>,
    private readonly _s3Service: S3Service,
    private readonly _dataSource: DataSource,
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

    // Re-read through findOneById so create, update and read all return the
    // same shape, `productCount` included.
    return this.findOneById(saved.id);
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    updatedBy: string,
  ): Promise<Brand> {
    const { saved, obsoleteImages } = await this._dataSource.transaction(
      async (manager) => {
        const existing = await manager.findOne(Brand, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!existing) {
          throw new NotFoundException({
            message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
            errorCode: ERROR_MAP.INVALID_ID,
          });
        }

        if (existing.version !== dto.version) {
          throw new OptimisticLockVersionMismatchError(
            FEATURES.BRAND,
            dto.version,
            existing.version,
          );
        }

        const { logoUrl: rawLogoUrl, ...rest } = dto;
        const { url: logoUrl, obsolete } =
          await this._s3Service.resolveImageDeferred(
            rawLogoUrl,
            existing.logoUrl,
            FEATURES.BRAND,
          );
        const updated = await manager.save(Brand, {
          ...existing,
          ...rest,
          logoUrl,
          updatedBy,
        });

        return { saved: updated, obsoleteImages: obsolete };
      },
    );

    if (obsoleteImages.length) {
      await this._s3Service.deleteImages(obsoleteImages);
    }

    return this.findOneById(saved.id);
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

    await this._assertNotReferenced(id);
    await this._brandRepository.delete(id);

    if (brand.logoUrl) {
      // The row is already gone, so a cleanup failure must not turn a
      // successful delete into an error response. `deleteImages` swallows S3
      // API errors itself, but a malformed URL throws before it gets there.
      try {
        await this._s3Service.deleteImages([brand.logoUrl]);
      } catch {
        this._logger.warn(
          `Brand ${id} was deleted but its logo could not be removed: ${brand.logoUrl}`,
        );
      }
    }
  }

  /**
   * Blocks a hard delete when products still point at the brand. The FK is
   * `NO ACTION`, so the delete would fail at the DB with an opaque violation;
   * this turns it into a precise, actionable message instead.
   *
   * Soft-deleted products are counted too: they physically remain and still
   * hold the foreign key, so they block the delete just the same.
   * */
  private async _assertNotReferenced(id: string): Promise<void> {
    const productCount = await this._brandRepository.manager.count(Product, {
      where: { brandId: id },
      withDeleted: true,
    });

    if (productCount === 0) {
      return;
    }

    throw new ConflictException({
      message: ERROR_MESSAGES.stillReferenced('Brand', [
        ERROR_MESSAGES.countOf(productCount, 'product'),
      ]),
      errorCode: ERROR_MAP.BRAND_IN_USE,
    });
  }

  /**
   * Counts referencing products for a page of brands in one grouped query.
   * Soft-deleted products are included, so the number is exactly what
   * `_assertNotReferenced` refuses on and what a soft delete would strip from
   * live product pages.
   * */
  private async _withProductCounts(items: Brand[]): Promise<Brand[]> {
    if (!items.length) {
      return items;
    }

    const rows = await this._brandRepository.manager
      .createQueryBuilder(Product, 'p')
      .select('p.brandId', 'id')
      .addSelect('COUNT(*)', 'count')
      .where('p.brandId IN (:...ids)', { ids: items.map((item) => item.id) })
      .withDeleted()
      .groupBy('p.brandId')
      .getRawMany<{ id: string; count: string }>();

    const counts = new Map(
      rows.map((row) => [row.id, parseInt(row.count, 10)]),
    );

    return items.map((item) =>
      Object.assign(item, { productCount: counts.get(item.id) ?? 0 }),
    );
  }

  async findOneById(id: string): Promise<Brand> {
    const brand = await this._findOneWithRelations(id);

    if (!brand) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.BRAND),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const [withCount] = await this._withProductCounts([brand]);

    return withCount;
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
      .addSelect(['updater.id', 'updater.email']);

    // The collated expression goes through a select alias: TypeORM rewrites
    // paginated joined queries into a DISTINCT subquery and cannot map a raw
    // `COLLATE` expression onto a column there.
    if (sortBy === BrandSortBy.NAME) {
      qb.addSelect(collated('brand.name'), 'brand_name_sort');
      qb.orderBy('brand_name_sort', sortOrder);
    } else {
      qb.orderBy(`brand.${sortBy}`, sortOrder);
    }

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
      items: await this._withProductCounts(items),
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
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._brandRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.country', 'country')
      .addSelect(['country.code', 'country.name'])
      // Always alphabetical: the storefront has no say in the ordering.
      .addSelect(collated('brand.name', language), 'brand_name_sort')
      .orderBy('brand_name_sort', SortOrder.ASC)
      // Only brands a visible product actually uses: a filter the storefront
      // can never satisfy is worse than a missing one.
      .where(
        `brand.id IN (
          SELECT p."brandId" FROM "products" p
          WHERE p."isActive" = true
            AND p."deletedAt" IS NULL
            AND p."brandId" IS NOT NULL
        )`,
      );

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
