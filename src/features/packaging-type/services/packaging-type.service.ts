import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OptimisticLockVersionMismatchError, Repository } from 'typeorm';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { sortByLocalized } from '@core/utils/localized-collator.util';
import { Product } from '@features/product/entities/product.entity';

import { PackagingType } from '../entities/packaging-type.entity';
import { CreatePackagingTypeDto } from '../dto/create-packaging-type.dto';
import { UpdatePackagingTypeDto } from '../dto/update-packaging-type.dto';
import { FindManyPackagingTypesDto } from '../dto/find-many-packaging-types.dto';
import { StorePackagingTypeModel } from '../models/store-packaging-type.model';

@Injectable()
export class PackagingTypeService {
  constructor(
    @InjectRepository(PackagingType)
    private readonly _packagingTypeRepository: Repository<PackagingType>,
  ) {}

  async create(
    dto: CreatePackagingTypeDto,
    updatedBy: string,
  ): Promise<PackagingType> {
    // The unique index on `code` is not partial, so it covers soft-deleted
    // rows too. Left to the database, reusing the code of a type that was
    // soft-deleted returns a bare unique violation for a record the admin
    // cannot see anywhere in the UI; this names the situation and the way
    // out. A live duplicate still falls through to the constraint, which
    // reports the offending field on its own.
    const deleted = await this._packagingTypeRepository.findOne({
      where: { code: dto.code },
      withDeleted: true,
    });

    if (deleted?.deletedAt) {
      throw new ConflictException({
        message: ERROR_MESSAGES.softDeletedConflict(
          'packaging type',
          'code',
          dto.code,
        ),
        errorCode: ERROR_MAP.PACKAGING_TYPE_CODE_TAKEN,
      });
    }

    const packagingType = this._packagingTypeRepository.create({
      ...dto,
      updatedBy,
    });
    const saved = await this._packagingTypeRepository.save(packagingType);

    // Re-read through findOneById so every response — create, update and read
    // — carries the same shape, updater and `productCount` included.
    return this.findOneById(saved.id);
  }

  async update(
    id: string,
    dto: UpdatePackagingTypeDto,
    updatedBy: string,
  ): Promise<PackagingType> {
    const existing = await this._packagingTypeRepository.findOneBy({ id });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (existing.version !== dto.version) {
      throw new OptimisticLockVersionMismatchError(
        FEATURES.PACKAGING_TYPE,
        dto.version,
        existing.version,
      );
    }

    const saved = await this._packagingTypeRepository.save({
      ...existing,
      ...dto,
      updatedBy,
    });

    return this.findOneById(saved.id);
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const packagingType = await this._packagingTypeRepository.findOneBy({ id });

    if (!packagingType) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    // One transaction: the audit stamp and the delete describe the same act,
    // and a failure between them would leave the record undeleted but marked
    // as touched by whoever tried.
    await this._packagingTypeRepository.manager.transaction(async (manager) => {
      await manager.update(PackagingType, id, { updatedBy });
      await manager.softDelete(PackagingType, id);
    });
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const packagingType = await this._packagingTypeRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!packagingType) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._packagingTypeRepository.manager.transaction(async (manager) => {
      await manager.restore(PackagingType, id);
      await manager.update(PackagingType, id, { updatedBy });
    });
  }

  async hardDelete(id: string): Promise<void> {
    const packagingType = await this._packagingTypeRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!packagingType) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._assertNotReferenced(id);

    await this._packagingTypeRepository.delete(id);
  }

  /**
   * Blocks a hard delete when products still point at the packaging type.
   * The FK is `NO ACTION`, so the delete would fail at the DB with an opaque
   * violation; this turns it into a precise, actionable message instead.
   *
   * Soft-deleted products are counted too: they physically remain and still
   * hold the foreign key, so they block the delete just the same.
   * */
  private async _assertNotReferenced(id: string): Promise<void> {
    const productCount = await this._packagingTypeRepository.manager.count(
      Product,
      { where: { packagingTypeId: id }, withDeleted: true },
    );

    if (productCount === 0) {
      return;
    }

    throw new ConflictException({
      message: ERROR_MESSAGES.stillReferenced('Packaging type', [
        ERROR_MESSAGES.countOf(productCount, 'product'),
      ]),
      errorCode: ERROR_MAP.PACKAGING_TYPE_IN_USE,
    });
  }

  /**
   * Resolves soft-deleted types as well. `findAll({ includeDeleted: true })`
   * lists them, so 404-ing here would make every row in that list a dead
   * link, and there would be no way to inspect a type before restoring it.
   * The response carries `deletedAt`, so the caller can still tell them apart.
   * */
  async findOneById(id: string): Promise<PackagingType> {
    const packagingType = await this._findOneWithUpdater(id);

    if (!packagingType) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const [withCount] = await this._withProductCounts([packagingType]);

    return withCount;
  }

  /**
   * Deliberately unpaginated: this is a small lookup list and the admin UI
   * renders it whole. Ordered alphabetically on the label in `language`.
   * */
  async findAll(
    dto?: FindManyPackagingTypesDto,
    language: Language = 'en',
  ): Promise<PackagingType[]> {
    const qb = this._packagingTypeRepository
      .createQueryBuilder('packaging_type')
      .leftJoin('packaging_type.updater', 'updater')
      .addSelect(['updater.id', 'updater.email']);

    if (dto?.includeDeleted) {
      qb.withDeleted();
    }

    const items = await qb.getMany();
    const withCounts = await this._withProductCounts(items);

    return sortByLocalized(withCounts, language, (item) =>
      resolveLocalized(item.label, language),
    );
  }

  /**
   * Only types that at least one visible product actually uses: a filter the
   * storefront can never satisfy is worse than a missing one. The product
   * facets on `/store/products/filters` are the richer source (they carry
   * counts and respect the active filters) — this endpoint exists for the
   * cases that need the list on its own.
   * */
  async findAllStore(language: Language): Promise<StorePackagingTypeModel[]> {
    const items = await this._packagingTypeRepository
      .createQueryBuilder('packaging_type')
      .where(
        `packaging_type.id IN (
          SELECT p."packagingTypeId" FROM "products" p
          WHERE p."isActive" = true
            AND p."deletedAt" IS NULL
            AND p."packagingTypeId" IS NOT NULL
        )`,
      )
      .getMany();

    // Ordered in Node, not in SQL: the database collation is `C`, which sorts
    // by byte and mangles diacritics, Cyrillic and mixed case. Safe because
    // this list is never paginated.
    return sortByLocalized(
      items.map((packagingType) => ({
        code: packagingType.code,
        label: resolveLocalized(packagingType.label, language),
      })),
      language,
      (item) => item.label,
    );
  }

  /**
   * Counts referencing products in one grouped query rather than per row.
   * Soft-deleted products are included: they still hold the foreign key, so
   * this number is exactly what `_assertNotReferenced` will refuse on, and it
   * lets the admin UI warn before a soft delete blanks the packaging line on
   * live product pages.
   * */
  private async _withProductCounts(
    items: PackagingType[],
  ): Promise<PackagingType[]> {
    if (!items.length) {
      return items;
    }

    const rows = await this._packagingTypeRepository.manager
      .createQueryBuilder(Product, 'p')
      .select('p.packagingTypeId', 'id')
      .addSelect('COUNT(*)', 'count')
      .where('p.packagingTypeId IN (:...ids)', {
        ids: items.map((item) => item.id),
      })
      .withDeleted()
      .groupBy('p.packagingTypeId')
      .getRawMany<{ id: string; count: string }>();

    const counts = new Map(
      rows.map((row) => [row.id, parseInt(row.count, 10)]),
    );

    return items.map((item) =>
      Object.assign(item, { productCount: counts.get(item.id) ?? 0 }),
    );
  }

  private async _findOneWithUpdater(id: string): Promise<PackagingType | null> {
    return this._packagingTypeRepository
      .createQueryBuilder('packaging_type')
      .withDeleted()
      .leftJoin('packaging_type.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('packaging_type.id = :id', { id })
      .getOne();
  }
}
