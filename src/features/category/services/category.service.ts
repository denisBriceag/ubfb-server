import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { collated, sortByLocalized } from '@core/utils/localized-collator.util';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { S3Service } from '@features/s3/services/s3.service';
import { StoreCategoryNode } from '../models/store-category.model';

import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FindManyCategoriesDto } from '../dto/find-many-categories.dto';
import { CategorySortBy } from '@features/category/enums/category-sort.enum';

@Injectable()
export class CategoryService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 50;

  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: Repository<Category>,
    private readonly _s3Service: S3Service,
    private readonly _dataSource: DataSource,
  ) {}

  async create(dto: CreateCategoryDto, updatedBy: string): Promise<Category> {
    let depth = 0;

    if (dto.parentId) {
      const parent = await this._categoryRepository.findOneBy({
        id: dto.parentId,
      });

      if (!parent) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.notFound(
            'id',
            dto.parentId,
            FEATURES.CATEGORY,
          ),
          errorCode: ERROR_MAP.INVALID_ID,
        });
      }

      depth = parent.depth + 1;
    }

    const { imageUrl: rawImageUrl, ...rest } = dto;
    const imageUrl = await this._s3Service.resolveImage(
      rawImageUrl ?? null,
      null,
      FEATURES.CATEGORY,
    );
    const category = this._categoryRepository.create({
      ...rest,
      imageUrl,
      depth,
      updatedBy,
    });
    const saved = await this._categoryRepository.save(category);

    return (await this._findOneWithRelations(saved.id))!;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    updatedBy: string,
  ): Promise<Category> {
    const { saved, obsoleteImages } = await this._dataSource.transaction(
      async (manager) => {
        const existing = await manager.findOne(Category, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!existing) {
          throw new NotFoundException({
            message: ERROR_MESSAGES.notFound('id', id, FEATURES.CATEGORY),
            errorCode: ERROR_MAP.INVALID_ID,
          });
        }

        if (existing.version !== dto.version) {
          throw new OptimisticLockVersionMismatchError(
            FEATURES.CATEGORY,
            dto.version,
            existing.version,
          );
        }

        let depth = existing.depth;

        if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
          if (dto.parentId === null) {
            depth = 0;
          } else {
            if (
              dto.parentId === id ||
              (await this._isDescendant(id, dto.parentId, manager))
            ) {
              throw new BadRequestException({
                message:
                  'Cannot assign a category or its descendant as its own parent.',
                errorCode: ERROR_MAP.OPERATION_ERROR,
              });
            }

            const parent = await manager.findOneBy(Category, {
              id: dto.parentId,
            });

            if (!parent) {
              throw new NotFoundException({
                message: ERROR_MESSAGES.notFound(
                  'id',
                  dto.parentId,
                  FEATURES.CATEGORY,
                ),
                errorCode: ERROR_MAP.INVALID_ID,
              });
            }

            depth = parent.depth + 1;
          }
        }

        const { imageUrl: rawImageUrl, ...rest } = dto;
        const { url: imageUrl, obsolete } =
          await this._s3Service.resolveImageDeferred(
            rawImageUrl,
            existing.imageUrl,
            FEATURES.CATEGORY,
          );
        const updated = await manager.save(Category, {
          ...existing,
          ...rest,
          imageUrl,
          depth,
          updatedBy,
        });

        if (depth !== existing.depth) {
          await this._cascadeDepth(updated.id, depth, manager);
        }

        return { saved: updated, obsoleteImages: obsolete };
      },
    );

    if (obsoleteImages.length) {
      await this._s3Service.deleteImages(obsoleteImages);
    }

    return (await this._findOneWithRelations(saved.id))!;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const category = await this._categoryRepository.findOneBy({ id });

    if (!category) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.CATEGORY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._categoryRepository.update(id, { updatedBy });
    await this._categoryRepository.softDelete(id);
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const category = await this._categoryRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!category) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.CATEGORY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._categoryRepository.restore(id);
    await this._categoryRepository.update(id, { updatedBy });
  }

  async hardDelete(id: string): Promise<void> {
    const category = await this._categoryRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!category) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.CATEGORY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._categoryRepository.delete(id);

    if (category.imageUrl) {
      await this._s3Service.deleteImages([category.imageUrl]);
    }
  }

  async findOneById(id: string): Promise<Category> {
    const category = await this._findOneWithRelations(id);

    if (!category) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.CATEGORY),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return category;
  }

  async findMany(
    dto: FindManyCategoriesDto,
    language?: Language,
  ): Promise<PaginatedData<Category>> {
    const sortBy = dto?.sortBy ?? CategorySortBy.CREATED_AT;
    const sortOrder = dto?.sortOrder ?? SortOrder.ASC;
    const withDeleted = dto?.includeDeleted ?? false;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.parent', 'parent')
      .addSelect(['parent.id', 'parent.name'])
      .leftJoin('category.updater', 'updater')
      .addSelect(['updater.id', 'updater.email']);

    if (sortBy === CategorySortBy.NAME) {
      qb.addSelect(
        collated(`category.name->>'${language ?? 'en'}'`, language),
        'category_name_sort',
      );
      qb.orderBy('category_name_sort', sortOrder);
    } else {
      qb.orderBy(`category.${sortBy}`, sortOrder);
    }

    if (withDeleted) {
      qb.withDeleted();
    }

    if (dto?.parentId !== undefined) {
      if (dto.parentId === null) {
        qb.andWhere('category.parentId IS NULL');
      } else {
        qb.andWhere('category.parentId = :parentId', {
          parentId: dto.parentId,
        });
      }
    }

    if (dto?.isActive !== undefined) {
      qb.andWhere('category.isActive = :isActive', { isActive: dto.isActive });
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

  async findTree(language: Language): Promise<StoreCategoryNode[]> {
    const categories = await this._categoryRepository.find({
      where: { isActive: true },
      // Only a deterministic tie-break; the real ordering is applied per level
      // in `_buildTree`, alphabetically on the localized name.
      order: { createdAt: 'ASC' },
    });

    return this._buildTree(categories, null, language);
  }

  /**
   * Sorts every level of the tree, so children are alphabetical within their
   * own parent rather than only at the root. Done in Node because the whole
   * tree is loaded at once and the database collation cannot order `ă` or
   * Cyrillic correctly — see `sortByLocalized`.
   * */
  private _buildTree(
    categories: Category[],
    parentId: string | null,
    language: Language,
  ): StoreCategoryNode[] {
    const nodes = categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: resolveLocalized(c.name, language),
        imageUrl: c.imageUrl,
        depth: c.depth,
        children: this._buildTree(categories, c.id, language),
      }));

    return sortByLocalized(nodes, language, (node) => node.name);
  }

  private async _isDescendant(
    categoryId: string,
    targetId: string,
    manager: EntityManager = this._categoryRepository.manager,
  ): Promise<boolean> {
    const children = await manager.findBy(Category, {
      parentId: categoryId,
    });

    for (const child of children) {
      if (child.id === targetId) return true;
      if (await this._isDescendant(child.id, targetId, manager)) return true;
    }

    return false;
  }

  private async _cascadeDepth(
    parentId: string,
    parentDepth: number,
    manager: EntityManager = this._categoryRepository.manager,
  ): Promise<void> {
    const children = await manager.findBy(Category, { parentId });

    for (const child of children) {
      const childDepth = parentDepth + 1;

      await manager.update(Category, child.id, { depth: childDepth });
      await this._cascadeDepth(child.id, childDepth, manager);
    }
  }

  private async _findOneWithRelations(id: string): Promise<Category | null> {
    return this._categoryRepository
      .createQueryBuilder('category')
      .withDeleted()
      .leftJoin('category.parent', 'parent')
      .addSelect(['parent.id', 'parent.name'])
      .leftJoin('category.children', 'children', 'children.deletedAt IS NULL')
      .addSelect([
        'children.id',
        'children.name',
        'children.depth',
        'children.isActive',
      ])
      .leftJoin('category.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('category.id = :id', { id })
      .getOne();
  }
}
