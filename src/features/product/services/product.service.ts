import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { SortOrder } from '@core/types/sorting-order.enum';
import { ERROR_MAP, ERROR_MESSAGES } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import {
  resolveLocalized,
  resolveLocalizedNullable,
} from '@core/utils/resolve-localized.util';
import { S3Service } from '@features/s3/services/s3.service';

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

@Injectable()
export class ProductService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 20;

  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: Repository<Product>,
    private readonly _s3Service: S3Service,
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
    const existing = await this._productRepository.findOne({
      where: { id },
      lock: { mode: 'optimistic', version: dto.version },
      relations: { relatedProducts: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const { images: rawImages, relatedProductIds, ...rest } = dto;
    const images = await this._resolveImages(rawImages, existing.images);

    if (relatedProductIds !== undefined) {
      existing.relatedProducts = relatedProductIds.length
        ? await this._productRepository.findBy({ id: In(relatedProductIds) })
        : [];
    }

    const saved = await this._productRepository.save({
      ...existing,
      ...rest,
      images,
      updatedBy,
    });

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

    if (product.images.length > 0) {
      await this._s3Service.deleteImages(product.images);
    }

    await this._productRepository.delete(id);
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
      .addSelect(['packagingType.id', 'packagingType.name'])
      .leftJoin('product.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .orderBy(`product.${sortBy}`, sortOrder);

    if (withDeleted) {
      qb.withDeleted();
    }

    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    if (dto?.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

    if (dto?.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: dto.brandSlug });
    }

    if (dto?.countryCode) {
      qb.andWhere('country.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto?.packagingTypeName) {
      qb.andWhere('packagingType.name = :packagingTypeName', {
        packagingTypeName: dto.packagingTypeName,
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

    this._applyStoreFilters(qb, dto);

    qb.orderBy(`product.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

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
    const [
      categories,
      brands,
      countries,
      packagingTypes,
      priceRange,
      alcoholPercentageRange,
    ] = await Promise.all([
      this._facetCategories(dto, language),
      this._facetBrands(dto),
      this._facetCountries(dto, language),
      this._facetPackagingTypes(dto, language),
      this._facetPriceRange(dto),
      this._facetAlcoholRange(dto),
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
      .addSelect(['packagingType.name', 'packagingType.label'])
      .where('product.isActive = true');
  }

  private _applyStoreFilters(
    qb: SelectQueryBuilder<Product>,
    dto: FindManyProductsStoreDto,
  ): void {
    if (dto.search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${dto.search}%` });
    }

    if (dto.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

    if (dto.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: dto.brandSlug });
    }

    if (dto.countryCode) {
      qb.andWhere('country.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeName) {
      qb.andWhere('packagingType.name = :packagingTypeName', {
        packagingTypeName: dto.packagingTypeName,
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
            name: (product.packagingType as any).name,
            label: resolveLocalizedNullable(
              (product.packagingType as any).label,
              language,
            ),
          }
        : null,
    };
  }

  private async _facetCategories(
    dto: FindManyProductsStoreDto,
    language: Language,
  ): Promise<CategoryFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .select('c.slug', 'slug')
      .addSelect(`c.name->>'${language}'`, 'name')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('c.slug')
      .addGroupBy('c.name')
      .orderBy(`c.name->>'${language}'`, 'ASC');

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

    if (dto.packagingTypeName) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.name = :packagingTypeName',
        {
          packagingTypeName: dto.packagingTypeName,
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

    return raw.map((r) => ({
      slug: r.slug,
      name: r.name,
      count: parseInt(r.count, 10),
    }));
  }

  private async _facetBrands(
    dto: FindManyProductsStoreDto,
  ): Promise<BrandsFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.brand', 'b')
      .select('b.slug', 'slug')
      .addSelect('b.name', 'name')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('b.slug')
      .addGroupBy('b.name')
      .orderBy('b.name', 'ASC');

    if (dto.categorySlug) {
      qb.innerJoin('p.category', 'c').andWhere('c.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

    if (dto.countryCode) {
      qb.innerJoin('p.country', 'co').andWhere('co.code = :countryCode', {
        countryCode: dto.countryCode,
      });
    }

    if (dto.packagingTypeName) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.name = :packagingTypeName',
        {
          packagingTypeName: dto.packagingTypeName,
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

    return raw.map((r) => ({
      slug: r.slug,
      name: r.name,
      count: parseInt(r.count, 10),
    }));
  }

  private async _facetCountries(
    dto: FindManyProductsStoreDto,
    language: Language,
  ): Promise<CountriesFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.country', 'co')
      .select('co.code', 'code')
      .addSelect(`co.name->>'${language}'`, 'name')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('co.code')
      .addGroupBy('co.name')
      .orderBy(`co.name->>'${language}'`, 'ASC');

    if (dto.categorySlug) {
      qb.innerJoin('p.category', 'c').andWhere('c.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

    if (dto.brandSlug) {
      qb.innerJoin('p.brand', 'b').andWhere('b.slug = :brandSlug', {
        brandSlug: dto.brandSlug,
      });
    }

    if (dto.packagingTypeName) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.name = :packagingTypeName',
        {
          packagingTypeName: dto.packagingTypeName,
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

    return raw.map((r) => ({
      code: r.code,
      name: r.name,
      count: parseInt(r.count, 10),
    }));
  }

  private async _facetPackagingTypes(
    dto: FindManyProductsStoreDto,
    language: Language,
  ): Promise<PackagingTypesFilter[]> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .innerJoin('p.packagingType', 'pt')
      .select('pt.name', 'name')
      .addSelect(`pt.label->>'${language}'`, 'label')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('p.isActive = true')
      .groupBy('pt.name')
      .addGroupBy('pt.label')
      .orderBy('pt.name', 'ASC');

    if (dto.categorySlug) {
      qb.innerJoin('p.category', 'c').andWhere('c.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

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
      name: string;
      label: string | null;
      count: string;
    }>();

    return raw.map((r) => ({
      name: r.name,
      label: r.label,
      count: parseInt(r.count, 10),
    }));
  }

  private async _facetPriceRange(
    dto: FindManyProductsStoreDto,
  ): Promise<{ min: number; max: number } | null> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .select('MIN(p.price)', 'min')
      .addSelect('MAX(p.price)', 'max')
      .where('p.isActive = true');

    if (dto.categorySlug) {
      qb.innerJoin('p.category', 'c').andWhere('c.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

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

    if (dto.packagingTypeName) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.name = :packagingTypeName',
        {
          packagingTypeName: dto.packagingTypeName,
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
  ): Promise<{ min: number; max: number } | null> {
    const qb = this._productRepository
      .createQueryBuilder('p')
      .select('MIN(p.alcoholPercentage)', 'min')
      .addSelect('MAX(p.alcoholPercentage)', 'max')
      .where('p.isActive = true AND p.alcoholPercentage IS NOT NULL');

    if (dto.categorySlug) {
      qb.innerJoin('p.category', 'c').andWhere('c.slug = :categorySlug', {
        categorySlug: dto.categorySlug,
      });
    }

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

    if (dto.packagingTypeName) {
      qb.innerJoin('p.packagingType', 'pt').andWhere(
        'pt.name = :packagingTypeName',
        {
          packagingTypeName: dto.packagingTypeName,
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
      .addSelect(['packagingType.id', 'packagingType.name'])
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
