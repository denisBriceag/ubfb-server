import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  OptimisticLockVersionMismatchError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import {
  resolveLocalized,
  resolveLocalizedNullable,
} from '@core/utils/resolve-localized.util';
import { collated, sortByLocalized } from '@core/utils/localized-collator.util';
import { S3Service } from '@features/s3/services/s3.service';

import { Category } from '@features/category/entities/category.entity';

import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { FindManyProductsDto } from '../dto/find-many-products.dto';
import { FindManyProductsStoreDto } from '../dto/find-many-products-store.dto';
import { StoreProductModel } from '../models/store-product.model';
import {
  BrandsFilter,
  CategoryFilter,
  CountriesFilter,
  PackagingTypesFilter,
  StoreProductFiltersModel,
} from '../models/store-product-filters.model';
import {
  ProductSortBy,
  ProductStoreSortBy,
} from '@features/product/enums/product-sort.enum';

interface CategoryIndexRow {
  id: string;
  parentId: string | null;
  slug: string;
  name: Record<Language, string>;
  isActive: boolean;
}

@Injectable()
export class ProductService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 20;

  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: Repository<Product>,
    private readonly _s3Service: S3Service,
    private readonly _dataSource: DataSource,
  ) {}

  async create(dto: CreateProductDto, updatedBy: string): Promise<Product> {
    const { images: rawImages, relatedProductIds, ...rest } = dto;
    const images = await this._resolveImages(rawImages ?? [], []);
    const product = this._productRepository.create({
      ...rest,
      images,
      updatedBy,
    });

    if (relatedProductIds?.length) {
      product.relatedProducts = await this._productRepository.findBy({
        id: In(relatedProductIds),
      });
    }

    const saved = await this._productRepository.save(product);

    return (await this._findOneWithRelations(saved.id))!;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    updatedBy: string,
  ): Promise<Product> {
    const { saved, obsoleteImages } = await this._dataSource.transaction(
      async (manager) => {
        const existing = await manager.findOne(Product, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!existing) {
          throw new NotFoundException({
            message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
            errorCode: ERROR_MAP.INVALID_ID,
          });
        }

        if (existing.version !== dto.version) {
          throw new OptimisticLockVersionMismatchError(
            FEATURES.PRODUCT,
            dto.version,
            existing.version,
          );
        }

        const { images: rawImages, relatedProductIds, ...rest } = dto;
        const { urls: images, obsolete } = await this._resolveImagesDeferred(
          rawImages,
          existing.images,
        );

        if (relatedProductIds !== undefined) {
          existing.relatedProducts = relatedProductIds.length
            ? await manager.findBy(Product, { id: In(relatedProductIds) })
            : [];
        }

        const updated = await manager.save(Product, {
          ...existing,
          ...rest,
          images,
          updatedBy,
        });

        return { saved: updated, obsoleteImages: obsolete };
      },
    );

    if (obsoleteImages.length) {
      await this._s3Service.deleteImages(obsoleteImages);
    }

    return (await this._findOneWithRelations(saved.id))!;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const product = await this._productRepository.findOneBy({ id });

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._productRepository.update(id, { updatedBy });
    await this._productRepository.softDelete(id);
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const product = await this._productRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._productRepository.restore(id);
    await this._productRepository.update(id, { updatedBy });
  }

  async hardDelete(id: string): Promise<void> {
    const product = await this._productRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._productRepository.delete(id);

    if (product.images.length > 0) {
      await this._s3Service.deleteImages(product.images);
    }
  }

  async findOneById(id: string): Promise<Product> {
    const product = await this._findOneWithRelations(id);

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return product;
  }

  async findMany(dto: FindManyProductsDto): Promise<PaginatedData<Product>> {
    // Rolls up the subtree the same way the storefront does, but over every
    // category rather than only the reachable ones: the back office is where
    // products stranded under a deactivated category have to be findable, so
    // no visibility set is passed. Loaded only when a filter needs it.
    const categoryIds = dto?.categorySlug
      ? this._resolveCategoryScope(
          await this._loadCategoryIndex(),
          dto.categorySlug,
        )
      : null;
    const search = dto?.search;
    const sortBy = dto?.sortBy ?? ProductSortBy.CREATED_AT;
    const sortOrder = dto?.sortOrder ?? SortOrder.DESC;
    const withDeleted = dto?.includeDeleted ?? false;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const qb = this._productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect(['category.id', 'category.slug', 'category.name'])
      .leftJoin('product.brand', 'brand')
      .addSelect(['brand.id', 'brand.slug', 'brand.name'])
      .leftJoin('product.country', 'country')
      .addSelect(['country.id', 'country.name', 'country.code'])
      .leftJoin('product.packagingType', 'packagingType')
      .addSelect(['packagingType.id', 'packagingType.code'])
      .leftJoin('product.updater', 'updater')
      .addSelect(['updater.id', 'updater.email']);

    // Via a select alias: a raw `COLLATE` expression breaks TypeORM's
    // DISTINCT-subquery rewrite for paginated joined queries.
    if (sortBy === ProductSortBy.NAME) {
      qb.addSelect(collated('product.name'), 'product_name_sort');
      qb.orderBy('product_name_sort', sortOrder);
    } else {
      qb.orderBy(`product.${sortBy}`, sortOrder);
    }

    if (withDeleted) {
      qb.withDeleted();
    }

    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    this._applyCategoryScope(qb, 'product', categoryIds);

    if (dto?.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: dto.brandSlug });
    }

    if (dto?.countryCode) {
      qb.andWhere('country.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto?.packagingTypeCode) {
      qb.andWhere('packagingType.code = :packagingTypeCode', {
        packagingTypeCode: dto.packagingTypeCode,
      });
    }

    if (dto?.isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive: dto.isActive });
    }

    if (dto?.isWholesale !== undefined) {
      qb.andWhere('product.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto?.isGiftBox !== undefined) {
      qb.andWhere('product.isGiftBox = :isGiftBox', {
        isGiftBox: dto.isGiftBox,
      });
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
    dto: FindManyProductsStoreDto,
    language: Language,
  ): Promise<PaginatedData<StoreProductModel>> {
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;
    const sortBy = dto?.sortBy ?? ProductStoreSortBy.CREATED_AT;
    const sortOrder = dto?.sortOrder ?? SortOrder.DESC;
    const qb = this._buildStoreProductQb();

    this._applyStoreFilters(
      qb,
      dto,
      await this._resolveStoreCategoryScope(dto),
    );

    if (sortBy === ProductStoreSortBy.NAME) {
      qb.addSelect(collated('product.name', language), 'product_name_sort');
      qb.orderBy('product_name_sort', sortOrder);
    } else {
      qb.orderBy(`product.${sortBy}`, sortOrder);
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => this._toStoreProduct(p, language)),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneBySlugStore(
    slug: string,
    language: Language,
  ): Promise<StoreProductModel> {
    const product = await this._buildStoreProductQb()
      .andWhere('product.slug = :slug', { slug })
      .getOne();

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('slug', slug, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return this._toStoreProduct(product, language);
  }

  async findRelatedStore(
    slug: string,
    language: Language,
  ): Promise<StoreProductModel[]> {
    const product = await this._productRepository.findOneBy({
      slug,
      isActive: true,
    });

    if (!product) return [];

    const related = await this._buildStoreProductQb()
      .innerJoin(
        'product_related_products',
        'prp',
        'prp.related_product_id = product.id AND prp.product_id = :productId',
        { productId: product.id },
      )
      .getMany();

    return related.map((p) => this._toStoreProduct(p, language));
  }

  async findFilters(
    dto: FindManyProductsStoreDto,
    language: Language,
  ): Promise<StoreProductFiltersModel> {
    // Resolved once and shared: six facets would otherwise each re-read and
    // re-walk the same category tree. Unlike the list endpoints this always
    // needs the index, because the category facet rolls counts up the tree
    // whether or not a category filter is active.
    const index = await this._loadCategoryIndex();
    const reachable = this._reachableCategoryIds(index);
    const categoryIds = this._resolveCategoryScope(
      index,
      dto.categorySlug,
      reachable,
    );

    const [
      categories,
      brands,
      countries,
      packagingTypes,
      priceRange,
      alcoholPercentageRange,
    ] = await Promise.all([
      this._facetCategories(dto, language, index, reachable),
      this._facetBrands(dto, language, categoryIds),
      this._facetCountries(dto, language, categoryIds),
      this._facetPackagingTypes(dto, language, categoryIds),
      this._facetPriceRange(dto, categoryIds),
      this._facetAlcoholRange(dto, categoryIds),
    ]);

    return {
      categories,
      brands,
      countries,
      packagingTypes,
      priceRange,
      alcoholPercentageRange,
    };
  }

  private _buildStoreProductQb(): SelectQueryBuilder<Product> {
    return this._productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect(['category.slug', 'category.name'])
      .leftJoin('product.brand', 'brand')
      .addSelect(['brand.slug', 'brand.name'])
      .leftJoin('product.country', 'country')
      .addSelect(['country.code', 'country.name'])
      .leftJoin('product.packagingType', 'packagingType')
      .addSelect(['packagingType.code', 'packagingType.label'])
      .where('product.isActive = true');
  }

  private _applyStoreFilters(
    qb: SelectQueryBuilder<Product>,
    dto: FindManyProductsStoreDto,
    categoryIds: string[] | null,
  ): void {
    if (dto.search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${dto.search}%` });
    }

    this._applyCategoryScope(qb, 'product', categoryIds);

    if (dto.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: dto.brandSlug });
    }

    if (dto.countryCode) {
      qb.andWhere('country.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeCode) {
      qb.andWhere('packagingType.code = :packagingTypeCode', {
        packagingTypeCode: dto.packagingTypeCode,
      });
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('product.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('product.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('product.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('product.isGiftBox = :isGiftBox', {
        isGiftBox: dto.isGiftBox,
      });
    }
  }

  private _toStoreProduct(
    product: Product,
    language: Language,
  ): StoreProductModel {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description
        ? (product.description[language] ?? product.description.en)
        : null,
      metaTitle: resolveLocalizedNullable(product.metaTitle, language),
      metaDescription: resolveLocalizedNullable(
        product.metaDescription,
        language,
      ),
      images: product.images,
      price: product.price,
      sku: product.sku,
      volumeMl: product.volumeMl,
      weightG: product.weightG,
      unitCount: product.unitCount,
      alcoholPercentage: product.alcoholPercentage,
      isWholesale: product.isWholesale,
      isGiftBox: product.isGiftBox,
      category: {
        slug: (product.category as any).slug,
        name: resolveLocalized((product.category as any).name, language),
      },
      brand: product.brand
        ? {
            slug: (product.brand as any).slug,
            name: (product.brand as any).name,
          }
        : null,
      country: product.country
        ? {
            code: (product.country as any).code,
            name: resolveLocalized((product.country as any).name, language),
          }
        : null,
      packagingType: product.packagingType
        ? {
            code: (product.packagingType as any).code,
            label: resolveLocalized(
              (product.packagingType as any).label,
              language,
            ),
          }
        : null,
    };
  }

  /**
   * Categories form a tree, so `?categorySlug=vin` has to match everything
   * beneath `vin` as well — otherwise every non-leaf category in the menu is a
   * link to an empty page.
   *
   * The whole (small) category table is read at most once per request and
   * walked in Node rather than issuing a recursive CTE at each of the seven
   * places `categorySlug` is applied. The walk carries a visited set, so a
   * cycle that slipped past `CategoryService._isDescendant` cannot hang the
   * request.
   *
   * How much of the tree counts depends on the surface, and is decided by the
   * visibility set passed to `_resolveCategoryScope` rather than here — the
   * storefront stays inside `_reachableCategoryIds`, the back office walks
   * everything.
   * */
  private async _loadCategoryIndex(): Promise<CategoryIndexRow[]> {
    return this._productRepository.manager
      .createQueryBuilder(Category, 'category')
      .select([
        'category.id',
        'category.parentId',
        'category.slug',
        'category.name',
        'category.isActive',
      ])
      .getMany();
  }

  /**
   * Ids of categories the storefront menu can actually reach: active, with an
   * unbroken chain of active parents up to a root. `CategoryService.findTree`
   * builds from `parentId === null` downwards over active rows only, so a live
   * category under a hidden parent is silently dropped there — anything the
   * menu cannot show must not be offered as a filter either.
   * */
  private _reachableCategoryIds(index: CategoryIndexRow[]): Set<string> {
    const byId = new Map(index.map((c) => [c.id, c]));
    const reachable = new Set<string>();

    for (const category of index) {
      const chain: string[] = [];
      const seen = new Set<string>();
      let current: CategoryIndexRow | undefined = category;
      let ok = true;

      while (current) {
        if (!current.isActive || seen.has(current.id)) {
          ok = false;
          break;
        }

        seen.add(current.id);
        chain.push(current.id);

        if (!current.parentId) {
          break;
        }

        const parent = byId.get(current.parentId);

        // Parent missing from the index (soft-deleted): the tree orphans this
        // branch, so it is not reachable.
        if (!parent) {
          ok = false;
          break;
        }

        current = parent;
      }

      if (ok) {
        for (const id of chain) {
          reachable.add(id);
        }
      }
    }

    return reachable;
  }

  /**
   * The storefront's category scope: the subtree rooted at `dto.categorySlug`
   * restricted to what the menu can actually reach, or `null` when no
   * category filter is requested. Loads the index only when there is a slug
   * to resolve — the common case is no filter at all, and the whole table
   * would otherwise be read on every product list request.
   * */
  private async _resolveStoreCategoryScope(
    dto: FindManyProductsStoreDto,
  ): Promise<string[] | null> {
    if (!dto.categorySlug) {
      return null;
    }

    const index = await this._loadCategoryIndex();

    return this._resolveCategoryScope(
      index,
      dto.categorySlug,
      this._reachableCategoryIds(index),
    );
  }

  /**
   * Ids of the subtree rooted at `slug`, or `null` when no category filter is
   * requested. An unknown slug yields an empty array, which callers turn into
   * "match nothing" rather than "match everything".
   *
   * `reachable` is the storefront's visibility set — pass it to keep the walk
   * inside what the menu exposes. Omitting it (the admin surface) walks every
   * category in the index, hidden ones included.
   * */
  private _resolveCategoryScope(
    index: CategoryIndexRow[],
    slug?: string,
    reachable?: Set<string>,
  ): string[] | null {
    if (!slug) {
      return null;
    }

    const isVisible = (id: string): boolean => !reachable || reachable.has(id);
    const root = index.find((c) => c.slug === slug && isVisible(c.id));

    if (!root) {
      return [];
    }

    const childrenOf = new Map<string, CategoryIndexRow[]>();

    for (const category of index) {
      if (!isVisible(category.id) || !category.parentId) {
        continue;
      }

      const siblings = childrenOf.get(category.parentId) ?? [];
      siblings.push(category);
      childrenOf.set(category.parentId, siblings);
    }

    const ids: string[] = [];
    const seen = new Set<string>();
    const queue = [root];

    while (queue.length) {
      const current = queue.shift()!;

      if (seen.has(current.id)) {
        continue;
      }

      seen.add(current.id);
      ids.push(current.id);
      queue.push(...(childrenOf.get(current.id) ?? []));
    }

    return ids;
  }

  /** Applies a resolved category scope to any query builder over products. */
  private _applyCategoryScope(
    qb: SelectQueryBuilder<Product>,
    alias: string,
    categoryIds: string[] | null,
  ): void {
    if (categoryIds === null) {
      return;
    }

    if (!categoryIds.length) {
      qb.andWhere('1 = 0');

      return;
    }

    qb.andWhere(`${alias}.categoryId IN (:...categoryIds)`, { categoryIds });
  }

  private async _facetCategories(
    dto: FindManyProductsStoreDto,
    language: Language,
    index: CategoryIndexRow[],
    reachable: Set<string>,
  ): Promise<CategoryFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .select('c.slug', 'slug')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      // The store category tree only exposes active categories, so a facet
      // built from inactive ones would offer a filter the menu never shows.
      .andWhere('c.isActive = true')
      // No name here: `_rollUpCategoryCounts` resolves it from the category
      // index, which it already holds for the tree walk.
      .groupBy('c.slug');

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeCode) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.code = :packagingTypeCode',
        {
          packagingTypeCode: dto.packagingTypeCode,
        },
      );
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const raw = await qb.getRawMany<{ slug: string; count: string }>();

    return this._rollUpCategoryCounts(raw, index, language, reachable);
  }

  /**
   * Turns per-category counts into per-subtree counts, so a parent reports
   * everything filed beneath it instead of being an invisible node in the
   * storefront menu.
   *
   * The totals deliberately overlap: a product under `vin-rosu` is counted for
   * `vin-rosu` and again for `vin`. Summing the facet is therefore meaningless
   * — each entry answers "how many products would I get if I clicked this",
   * which is exactly what the category filter now returns.
   * */
  private _rollUpCategoryCounts(
    raw: { slug: string; count: string }[],
    index: CategoryIndexRow[],
    language: Language,
    reachable: Set<string>,
  ): CategoryFilter[] {
    const bySlug = new Map(index.map((c) => [c.slug, c]));
    const byId = new Map(index.map((c) => [c.id, c]));
    const totals = new Map<string, number>();

    // Walk each category's ancestors, adding its own count to every one of
    // them. The visited set keeps a cycle from looping forever, and an
    // inactive ancestor prunes the rest of the chain.
    for (const row of raw) {
      const count = parseInt(row.count, 10);
      let current = bySlug.get(row.slug);
      const seen = new Set<string>();

      while (current && reachable.has(current.id) && !seen.has(current.id)) {
        seen.add(current.id);
        totals.set(current.slug, (totals.get(current.slug) ?? 0) + count);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }

    const entries: CategoryFilter[] = [];

    for (const [slug, count] of totals) {
      const category = bySlug.get(slug);

      if (category) {
        entries.push({
          slug,
          name: resolveLocalized(category.name, language),
          count,
        });
      }
    }

    return sortByLocalized(entries, language, (item) => item.name);
  }

  private async _facetBrands(
    dto: FindManyProductsStoreDto,
    language: Language,
    categoryIds: string[] | null,
  ): Promise<BrandsFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.brand', 'b')
      .select('b.slug', 'slug')
      .addSelect('b.name', 'name')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('b.slug')
      .addGroupBy('b.name');

    this._applyCategoryScope(qb, 'p', categoryIds);

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeCode) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.code = :packagingTypeCode',
        {
          packagingTypeCode: dto.packagingTypeCode,
        },
      );
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const raw = await qb.getRawMany<{
      slug: string;
      name: string;
      count: string;
    }>();

    return sortByLocalized(
      raw.map((r) => ({
        slug: r.slug,
        name: r.name,
        count: parseInt(r.count, 10),
      })),
      language,
      (item) => item.name,
    );
  }

  private async _facetCountries(
    dto: FindManyProductsStoreDto,
    language: Language,
    categoryIds: string[] | null,
  ): Promise<CountriesFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.country', 'co')
      .select('co.code', 'code')
      // Same en-then-code fallback as the packaging-type facet: `->>` on its
      // own would put a NULL name behind a non-null type.
      .addSelect(
        `COALESCE(co.name->>'${language}', co.name->>'en', co.code)`,
        'name',
      )
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('co.code')
      .addGroupBy('co.name');

    this._applyCategoryScope(qb, 'p', categoryIds);

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.packagingTypeCode) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.code = :packagingTypeCode',
        {
          packagingTypeCode: dto.packagingTypeCode,
        },
      );
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const raw = await qb.getRawMany<{
      code: string;
      name: string;
      count: string;
    }>();

    return sortByLocalized(
      raw.map((r) => ({
        code: r.code,
        name: r.name,
        count: parseInt(r.count, 10),
      })),
      language,
      (item) => item.name,
    );
  }

  private async _facetPackagingTypes(
    dto: FindManyProductsStoreDto,
    language: Language,
    categoryIds: string[] | null,
  ): Promise<PackagingTypesFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.packagingType', 'pt')
      .select('pt.code', 'code')
      // Mirrors `resolveLocalized`: the requested language, then `en`, then
      // the code — `->>` alone yields NULL for a key a row happens to lack,
      // and both this row type and `PackagingTypesFilter` promise a string.
      .addSelect(
        `COALESCE(pt.label->>'${language}', pt.label->>'en', pt.code)`,
        'label',
      )
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('pt.code')
      .addGroupBy('pt.label');

    this._applyCategoryScope(qb, 'p', categoryIds);

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const raw = await qb.getRawMany<{
      code: string;
      label: string;
      count: string;
    }>();

    // Ordered in Node: the database collation is `C`, so SQL would sort these
    // labels by byte — wrong for ro diacritics, Cyrillic and mixed case. The
    // facet is a short, complete list, so sorting it here is exact.
    return sortByLocalized(
      raw.map((r) => ({
        code: r.code,
        label: r.label,
        count: parseInt(r.count, 10),
      })),
      language,
      (item) => item.label,
    );
  }

  private async _facetPriceRange(
    dto: FindManyProductsStoreDto,
    categoryIds: string[] | null,
  ): Promise<{ min: number; max: number } | null> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .select('MIN(p.price)', 'min')
      .addSelect('MAX(p.price)', 'max')
      .where('p.isActive = true');

    this._applyCategoryScope(qb, 'p', categoryIds);

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeCode) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.code = :packagingTypeCode',
        {
          packagingTypeCode: dto.packagingTypeCode,
        },
      );
    }

    if (dto.minAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage >= :minAlcohol', {
        minAlcohol: dto.minAlcohol,
      });
    }

    if (dto.maxAlcohol !== undefined) {
      qb.andWhere('p.alcoholPercentage <= :maxAlcohol', {
        maxAlcohol: dto.maxAlcohol,
      });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const result = await qb.getRawOne<{
      min: string | null;
      max: string | null;
    }>();

    if (!result?.min) return null;

    return { min: parseFloat(result.min), max: parseFloat(result.max!) };
  }

  private async _facetAlcoholRange(
    dto: FindManyProductsStoreDto,
    categoryIds: string[] | null,
  ): Promise<{ min: number; max: number } | null> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .select('MIN(p.alcoholPercentage)', 'min')
      .addSelect('MAX(p.alcoholPercentage)', 'max')
      .where('p.isActive = true AND p.alcoholPercentage IS NOT NULL');

    this._applyCategoryScope(qb, 'p', categoryIds);

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeCode) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.code = :packagingTypeCode',
        {
          packagingTypeCode: dto.packagingTypeCode,
        },
      );
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.isWholesale !== undefined) {
      qb.andWhere('p.isWholesale = :isWholesale', {
        isWholesale: dto.isWholesale,
      });
    }

    if (dto.isGiftBox !== undefined) {
      qb.andWhere('p.isGiftBox = :isGiftBox', { isGiftBox: dto.isGiftBox });
    }

    if (dto.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${dto.search}%` });
    }

    const result = await qb.getRawOne<{
      min: string | null;
      max: string | null;
    }>();

    if (!result?.min) return null;

    return { min: parseFloat(result.min), max: parseFloat(result.max!) };
  }

  /**
   * @description Deletion-free variant of _resolveImages for use inside transactions:
   * temp uploads are only copied to the permanent bucket, and everything
   * that became obsolete (removed images, consumed temp uploads) is
   * returned so the caller can delete it after commit.
   */
  private async _resolveImagesDeferred(
    incoming: string[] | undefined,
    existing: string[],
  ): Promise<{ urls: string[]; obsolete: string[] }> {
    if (incoming === undefined) return { urls: existing, obsolete: [] };

    const obsolete = existing.filter((url) => !incoming.includes(url));
    const urls: string[] = [];

    for (const url of incoming) {
      const resolved = await this._s3Service.resolveImageDeferred(
        url,
        null,
        FEATURES.PRODUCT,
      );

      urls.push(resolved.url!);
      obsolete.push(...resolved.obsolete);
    }

    return { urls, obsolete };
  }

  private async _resolveImages(
    incoming: string[] | undefined,
    existing: string[],
  ): Promise<string[]> {
    if (incoming === undefined) return existing;

    const toDelete = existing.filter((url) => !incoming.includes(url));

    if (toDelete.length > 0) {
      await this._s3Service.deleteImages(toDelete);
    }

    const result: string[] = [];

    for (const url of incoming) {
      if (this._s3Service.isTempUrl(url)) {
        result.push(
          await this._s3Service.promoteTempImage(url, FEATURES.PRODUCT),
        );
      } else {
        result.push(url);
      }
    }

    return result;
  }

  private async _findOneWithRelations(id: string): Promise<Product | null> {
    return this._productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect(['category.id', 'category.slug', 'category.name'])
      .leftJoin('product.brand', 'brand')
      .addSelect(['brand.id', 'brand.slug', 'brand.name'])
      .leftJoin('product.country', 'country')
      .addSelect(['country.id', 'country.name', 'country.code'])
      .leftJoin('product.packagingType', 'packagingType')
      .addSelect(['packagingType.id', 'packagingType.code'])
      .leftJoin('product.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .leftJoin('product.relatedProducts', 'related')
      .addSelect([
        'related.id',
        'related.slug',
        'related.name',
        'related.images',
        'related.isGiftBox',
      ])
      .where('product.id = :id', { id })
      .getOne();
  }
}
