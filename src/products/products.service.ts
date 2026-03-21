import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductTranslation } from './entities/product-translation.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto, ProductSort } from './dto/product-filters.dto';
import { SetAttributeDto } from './dto/set-attribute.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UploadsService } from '../uploads/uploads.service';
import { deltaToPlainText } from '../common/helpers/delta-to-text.helper';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductTranslation)
    private readonly productTransRepo: Repository<ProductTranslation>,
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,
    @InjectRepository(ProductAttribute)
    private readonly productAttrRepo: Repository<ProductAttribute>,
    private readonly uploadsService: UploadsService,
  ) {}

  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  async findAllPublic(filters: ProductFiltersDto) {
    const { lang, page, limit } = filters;

    const qb = this.buildPublicBaseQuery(lang, filters);

    // Facets clone (before pagination)
    const facetQb = qb.clone();

    // Count for pagination
    const total = await qb.getCount();

    // Apply sort
    this.applySorting(qb, filters.sort, lang);

    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const data = items.map((p) => this.formatPublicProduct(p, lang));

    // Facets
    const facets = await this.computeFacets(facetQb, lang);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      facets,
    };
  }

  async findBySlugPublic(slug: string, lang: string) {
    const p = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.attributes', 'attr')
      .leftJoinAndSelect('attr.attributeDefinition', 'attrDef')
      .leftJoinAndSelect('attrDef.translations', 'attrTr', 'attrTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('brand.translations', 'brandTr', 'brandTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('cat.translations', 'catTr', 'catTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('cat.parent', 'parent')
      .leftJoinAndSelect('parent.translations', 'parentTr', 'parentTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.country', 'country')
      .leftJoinAndSelect('country.translations', 'countryTr', 'countryTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.volumeUnit', 'vu')
      .leftJoinAndSelect('vu.translations', 'vuTr', 'vuTr.languageCode = :lang', { lang })
      .where('p.slug = :slug', { slug })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .orderBy('img.sortOrder', 'ASC')
      .getOne();

    if (!p) throw new NotFoundException('Product not found');

    const tr = p.translations[0];

    // Related products
    const related = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.images', 'img')
      .where('p.categoryId = :categoryId', { categoryId: p.categoryId })
      .andWhere('p.id != :id', { id: p.id })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .orderBy('img.sortOrder', 'ASC')
      .take(4)
      .getMany();

    return {
      id: p.id,
      slug: p.slug,
      name: tr?.name ?? '',
      isNew: p.isNew,
      alcoholDegree: p.alcoholDegree,
      volumeValue: p.volumeValue,
      volumeUnit: p.volumeUnit
        ? { code: p.volumeUnit.code, label: p.volumeUnit.translations[0]?.label ?? '' }
        : null,
      brand: p.brand
        ? { id: p.brand.id, slug: p.brand.slug, name: p.brand.translations[0]?.name ?? '', logo: p.brand.logo }
        : null,
      category: p.category
        ? {
            id: p.category.id,
            slug: p.category.slug,
            name: p.category.translations[0]?.name ?? '',
            parent: p.category.parent
              ? {
                  id: p.category.parent.id,
                  slug: p.category.parent.slug,
                  name: p.category.parent.translations[0]?.name ?? '',
                }
              : null,
          }
        : null,
      country: p.country
        ? { code: p.country.code, name: p.country.translations[0]?.name ?? '' }
        : null,
      descriptionDelta: tr?.descriptionDelta ?? null,
      descriptionText: tr?.descriptionText ?? '',
      images: (p.images ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        sortOrder: img.sortOrder,
      })),
      attributes: (p.attributes ?? []).map((attr) => ({
        key: attr.attributeDefinition?.key ?? '',
        label: attr.attributeDefinition?.translations[0]?.label ?? '',
        value: attr.value,
        type: attr.attributeDefinition?.type ?? '',
        unit: attr.attributeDefinition?.unit ?? null,
      })),
      related: related.map((r) => this.formatPublicProduct(r, lang)),
    };
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  async findAllAdmin(
    filters: Partial<ProductFiltersDto> & { isActive?: boolean; withDeleted?: boolean },
    page = 1,
    limit = 16,
  ) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.translations', 'tr')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('brand.translations', 'brandTr')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('cat.translations', 'catTr');

    if (!filters.withDeleted) {
      qb.where('p.deletedAt IS NULL');
    } else {
      qb.withDeleted();
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: filters.isActive });
    }

    qb.orderBy('p.sortOrder', 'ASC').addOrderBy('p.createdAt', 'DESC');

    const total = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: items.map((p) => this.formatAdminProductSummary(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneAdmin(id: string) {
    const p = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.translations', 'tr')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.attributes', 'attr')
      .leftJoinAndSelect('attr.attributeDefinition', 'attrDef')
      .leftJoinAndSelect('attrDef.translations', 'attrTr')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('brand.translations', 'brandTr')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('cat.translations', 'catTr')
      .leftJoinAndSelect('p.country', 'country')
      .leftJoinAndSelect('country.translations', 'countryTr')
      .leftJoinAndSelect('p.volumeUnit', 'vu')
      .leftJoinAndSelect('vu.translations', 'vuTr')
      .where('p.id = :id', { id })
      .andWhere('p.deletedAt IS NULL')
      .orderBy('img.sortOrder', 'ASC')
      .getOne();

    if (!p) throw new NotFoundException('Product not found');
    return this.formatAdminProductFull(p);
  }

  async create(dto: CreateProductDto, currentUserId: string) {
    let slug = dto.slug ?? generateSlug(dto.translations.ru.name);
    slug = await this.resolveUniqueSlug(slug);

    const product = this.productRepo.create({
      slug,
      brandId: dto.brandId,
      categoryId: dto.categoryId,
      countryId: dto.countryId ?? null,
      volumeValue: dto.volumeValue ?? null,
      volumeUnitId: dto.volumeUnitId ?? null,
      alcoholDegree: dto.alcoholDegree ?? null,
      isNew: dto.isNew ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      updatedBy: currentUserId,
    });
    const saved = await this.productRepo.save(product);
    await this.saveTranslations(saved.id, dto.translations);
    return this.findOneAdmin(saved.id);
  }

  async update(id: string, dto: UpdateProductDto, currentUserId: string) {
    const product = await this.findProductOrFail(id);
    if (dto.version !== undefined && product.version !== dto.version) {
      throw new ConflictException('Entity modified by another user. Refresh and retry.');
    }
    if (dto.slug && dto.slug !== product.slug) {
      dto.slug = await this.resolveUniqueSlug(dto.slug, id);
    }
    Object.assign(product, {
      slug: dto.slug ?? product.slug,
      brandId: dto.brandId ?? product.brandId,
      categoryId: dto.categoryId ?? product.categoryId,
      countryId: dto.countryId !== undefined ? (dto.countryId ?? null) : product.countryId,
      volumeValue: dto.volumeValue !== undefined ? (dto.volumeValue ?? null) : product.volumeValue,
      volumeUnitId: dto.volumeUnitId !== undefined ? (dto.volumeUnitId ?? null) : product.volumeUnitId,
      alcoholDegree: dto.alcoholDegree !== undefined ? (dto.alcoholDegree ?? null) : product.alcoholDegree,
      isNew: dto.isNew ?? product.isNew,
      isActive: dto.isActive ?? product.isActive,
      sortOrder: dto.sortOrder ?? product.sortOrder,
      updatedBy: currentUserId,
    });
    await this.productRepo.save(product);
    if (dto.translations) {
      await this.saveTranslations(id, dto.translations);
    }
    return this.findOneAdmin(id);
  }

  async softDelete(id: string, currentUserId: string) {
    const product = await this.findProductOrFail(id);
    product.isActive = false;
    product.updatedBy = currentUserId;
    await this.productRepo.save(product);
    await this.productRepo.softDelete(id);
  }

  async hardDelete(id: string) {
    const product = await this.productRepo.findOne({ where: { id }, withDeleted: true });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.deletedAt) {
      throw new BadRequestException('Soft delete first before hard delete');
    }
    await this.uploadsService.deleteFolder('products', id);
    await this.productRepo.delete(id);
  }

  async toggleActive(id: string, currentUserId: string) {
    const product = await this.findProductOrFail(id);
    product.isActive = !product.isActive;
    product.updatedBy = currentUserId;
    return this.productRepo.save(product);
  }

  async toggleNew(id: string, currentUserId: string) {
    const product = await this.findProductOrFail(id);
    product.isNew = !product.isNew;
    product.updatedBy = currentUserId;
    return this.productRepo.save(product);
  }

  async reorder(items: { id: string; sortOrder: number }[], currentUserId: string) {
    for (const item of items) {
      await this.productRepo.update(item.id, {
        sortOrder: item.sortOrder,
        updatedBy: currentUserId,
      });
    }
  }

  // ─── IMAGES ──────────────────────────────────────────────────────────────────

  async addImages(id: string, files: Express.Multer.File[], currentUserId: string) {
    await this.findProductOrFail(id);

    const existingCount = await this.productImageRepo.count({
      where: { productId: id },
    });

    if (existingCount + files.length > 5) {
      throw new BadRequestException('Maximum 5 images per product');
    }

    const maxSortResult = await this.productImageRepo
      .createQueryBuilder('img')
      .select('MAX(img.sortOrder)', 'max')
      .where('img.productId = :id', { id })
      .getRawOne();

    let nextSort = (maxSortResult?.max ?? -1) + 1;
    const urls = await this.uploadsService.saveFiles('products', id, files);

    const images: ProductImage[] = [];
    for (const url of urls) {
      const img = this.productImageRepo.create({
        productId: id,
        url,
        alt: null,
        sortOrder: nextSort++,
      });
      images.push(await this.productImageRepo.save(img));
    }

    await this.productRepo.update(id, { updatedBy: currentUserId });
    return images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, sortOrder: img.sortOrder }));
  }

  async updateImage(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
    currentUserId: string,
  ) {
    const img = await this.productImageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!img) throw new NotFoundException('Image not found');
    if (dto.alt !== undefined) img.alt = dto.alt ?? null;
    if (dto.sortOrder !== undefined) img.sortOrder = dto.sortOrder;
    await this.productImageRepo.save(img);
    await this.productRepo.update(productId, { updatedBy: currentUserId });
    return { id: img.id, url: img.url, alt: img.alt, sortOrder: img.sortOrder };
  }

  async deleteImage(productId: string, imageId: string, currentUserId: string) {
    const img = await this.productImageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!img) throw new NotFoundException('Image not found');
    await this.uploadsService.deleteFile(img.url);
    await this.productImageRepo.delete(imageId);
    await this.productRepo.update(productId, { updatedBy: currentUserId });
  }

  async reorderImages(
    productId: string,
    items: { id: string; sortOrder: number }[],
    currentUserId: string,
  ) {
    await this.findProductOrFail(productId);
    for (const item of items) {
      await this.productImageRepo.update(
        { id: item.id, productId },
        { sortOrder: item.sortOrder },
      );
    }
    await this.productRepo.update(productId, { updatedBy: currentUserId });
  }

  // ─── ATTRIBUTES ──────────────────────────────────────────────────────────────

  async setAttributes(
    productId: string,
    attrs: SetAttributeDto[],
    currentUserId: string,
  ) {
    await this.findProductOrFail(productId);
    for (const attr of attrs) {
      const existing = await this.productAttrRepo.findOne({
        where: { productId, attributeDefinitionId: attr.attributeDefinitionId },
      });
      if (existing) {
        existing.value = attr.value;
        await this.productAttrRepo.save(existing);
      } else {
        await this.productAttrRepo.save(
          this.productAttrRepo.create({
            productId,
            attributeDefinitionId: attr.attributeDefinitionId,
            value: attr.value,
          }),
        );
      }
    }
    await this.productRepo.update(productId, { updatedBy: currentUserId });
  }

  async deleteAttribute(
    productId: string,
    attributeDefinitionId: string,
    currentUserId: string,
  ) {
    await this.findProductOrFail(productId);
    await this.productAttrRepo.delete({ productId, attributeDefinitionId });
    await this.productRepo.update(productId, { updatedBy: currentUserId });
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  private buildPublicBaseQuery(lang: string, filters: ProductFiltersDto) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('brand.translations', 'brandTr', 'brandTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('cat.translations', 'catTr', 'catTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.country', 'country')
      .leftJoinAndSelect('country.translations', 'countryTr', 'countryTr.languageCode = :lang', { lang })
      .leftJoinAndSelect('p.volumeUnit', 'vu')
      .leftJoinAndSelect('vu.translations', 'vuTr', 'vuTr.languageCode = :lang', { lang })
      .where('p.deletedAt IS NULL')
      .andWhere('p.isActive = true');

    if (filters.search) {
      qb.andWhere(
        '(tr.name ILIKE :search OR tr.descriptionText ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.categorySlug) {
      qb.andWhere(
        `(cat.slug = :catSlug OR EXISTS (
          SELECT 1 FROM categories parent
          WHERE parent.slug = :catSlug AND parent.id = cat."parentId"
        ))`,
        { catSlug: filters.categorySlug },
      );
    }

    if (filters.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: filters.brandSlug });
    }

    if (filters.countryCode) {
      qb.andWhere('country.code = :countryCode', { countryCode: filters.countryCode });
    }

    if (filters.isNew !== undefined) {
      qb.andWhere('p.isNew = :isNew', { isNew: filters.isNew });
    }

    if (filters.minDegree !== undefined) {
      qb.andWhere('p.alcoholDegree >= :minDegree', { minDegree: filters.minDegree });
    }

    if (filters.maxDegree !== undefined) {
      qb.andWhere('p.alcoholDegree <= :maxDegree', { maxDegree: filters.maxDegree });
    }

    if (filters.volumeUnitCode) {
      qb.andWhere('vu.code = :vuCode', { vuCode: filters.volumeUnitCode });
    }

    return qb;
  }

  private applySorting(qb: any, sort: ProductSort | undefined, lang: string) {
    switch (sort) {
      case ProductSort.NAME_ASC:
        qb.orderBy('tr.name', 'ASC');
        break;
      case ProductSort.NAME_DESC:
        qb.orderBy('tr.name', 'DESC');
        break;
      case ProductSort.NEWEST:
        qb.orderBy('p.createdAt', 'DESC');
        break;
      case ProductSort.ALCOHOL_ASC:
        qb.orderBy('p.alcoholDegree', 'ASC');
        break;
      case ProductSort.ALCOHOL_DESC:
        qb.orderBy('p.alcoholDegree', 'DESC');
        break;
      default:
        qb.orderBy('p.sortOrder', 'ASC').addOrderBy('p.createdAt', 'DESC');
    }
    qb.addOrderBy('img.sortOrder', 'ASC');
  }

  private async computeFacets(qb: any, lang: string) {
    // Run count aggregations on the base filtered query (without pagination/sort)
    const baseSubQuery = qb.getQuery();
    const baseParams = qb.getParameters();

    // Brands facet
    const brandsRaw = await this.productRepo
      .createQueryBuilder('p')
      .select('brand.slug', 'slug')
      .addSelect('brandTr.name', 'name')
      .addSelect('COUNT(p.id)', 'count')
      .innerJoin('p.brand', 'brand')
      .leftJoin('brand.translations', 'brandTr', 'brandTr.languageCode = :lang', { lang })
      .where(`p.id IN (${baseSubQuery})`)
      .setParameters(baseParams)
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .groupBy('brand.slug')
      .addGroupBy('brandTr.name')
      .getRawMany();

    // Countries facet
    const countriesRaw = await this.productRepo
      .createQueryBuilder('p')
      .select('country.code', 'code')
      .addSelect('countryTr.name', 'name')
      .addSelect('COUNT(p.id)', 'count')
      .innerJoin('p.country', 'country')
      .leftJoin('country.translations', 'countryTr', 'countryTr.languageCode = :lang', { lang })
      .where(`p.id IN (${baseSubQuery})`)
      .setParameters(baseParams)
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .groupBy('country.code')
      .addGroupBy('countryTr.name')
      .getRawMany();

    // VolumeUnits facet
    const vuRaw = await this.productRepo
      .createQueryBuilder('p')
      .select('vu.code', 'code')
      .addSelect('vuTr.label', 'label')
      .addSelect('COUNT(p.id)', 'count')
      .innerJoin('p.volumeUnit', 'vu')
      .leftJoin('vu.translations', 'vuTr', 'vuTr.languageCode = :lang', { lang })
      .where(`p.id IN (${baseSubQuery})`)
      .setParameters(baseParams)
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .groupBy('vu.code')
      .addGroupBy('vuTr.label')
      .getRawMany();

    // degreeRange
    const degreeRange = await this.productRepo
      .createQueryBuilder('p')
      .select('MIN(p.alcoholDegree)', 'min')
      .addSelect('MAX(p.alcoholDegree)', 'max')
      .where(`p.id IN (${baseSubQuery})`)
      .setParameters(baseParams)
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .getRawOne();

    return {
      brands: brandsRaw.map((r) => ({ slug: r.slug, name: r.name, count: Number(r.count) })),
      countries: countriesRaw.map((r) => ({ code: r.code, name: r.name, count: Number(r.count) })),
      volumeUnits: vuRaw.map((r) => ({ code: r.code, label: r.label, count: Number(r.count) })),
      degreeRange: {
        min: degreeRange?.min != null ? Number(degreeRange.min) : null,
        max: degreeRange?.max != null ? Number(degreeRange.max) : null,
      },
    };
  }

  private formatPublicProduct(p: Product, lang: string) {
    const tr = p.translations?.[0];
    const firstImg = (p.images ?? []).sort((a, b) => a.sortOrder - b.sortOrder)[0];
    return {
      id: p.id,
      slug: p.slug,
      name: tr?.name ?? '',
      isNew: p.isNew,
      alcoholDegree: p.alcoholDegree,
      volumeValue: p.volumeValue,
      volumeUnit: (p as any).volumeUnit
        ? {
            code: (p as any).volumeUnit.code,
            label: (p as any).volumeUnit.translations?.[0]?.label ?? '',
          }
        : null,
      brand: (p as any).brand
        ? {
            id: (p as any).brand.id,
            slug: (p as any).brand.slug,
            name: (p as any).brand.translations?.[0]?.name ?? '',
            logo: (p as any).brand.logo,
          }
        : null,
      category: (p as any).category
        ? {
            id: (p as any).category.id,
            slug: (p as any).category.slug,
            name: (p as any).category.translations?.[0]?.name ?? '',
          }
        : null,
      country: (p as any).country
        ? {
            code: (p as any).country.code,
            name: (p as any).country.translations?.[0]?.name ?? '',
          }
        : null,
      images: (p.images ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => ({ id: img.id, url: img.url, alt: img.alt, sortOrder: img.sortOrder })),
    };
  }

  private formatAdminProductSummary(p: Product) {
    const translations: Record<string, any> = {};
    for (const t of p.translations ?? []) {
      translations[t.languageCode] = { name: t.name };
    }
    return {
      id: p.id,
      slug: p.slug,
      isNew: p.isNew,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      alcoholDegree: p.alcoholDegree,
      volumeValue: p.volumeValue,
      brandId: p.brandId,
      categoryId: p.categoryId,
      version: p.version,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      translations,
      images: (p.images ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => ({ id: img.id, url: img.url, alt: img.alt, sortOrder: img.sortOrder })),
    };
  }

  private formatAdminProductFull(p: Product) {
    const translations: Record<string, any> = {};
    for (const t of p.translations ?? []) {
      translations[t.languageCode] = {
        name: t.name,
        descriptionDelta: t.descriptionDelta,
        descriptionText: t.descriptionText,
      };
    }
    return {
      id: p.id,
      slug: p.slug,
      isNew: p.isNew,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      alcoholDegree: p.alcoholDegree,
      volumeValue: p.volumeValue,
      brandId: p.brandId,
      categoryId: p.categoryId,
      countryId: p.countryId,
      volumeUnitId: p.volumeUnitId,
      version: p.version,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      translations,
      images: (p.images ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => ({ id: img.id, url: img.url, alt: img.alt, sortOrder: img.sortOrder })),
      attributes: (p.attributes ?? []).map((attr) => {
        const attrTranslations: Record<string, any> = {};
        for (const t of attr.attributeDefinition?.translations ?? []) {
          attrTranslations[t.languageCode] = { label: t.label };
        }
        return {
          attributeDefinitionId: attr.attributeDefinitionId,
          key: attr.attributeDefinition?.key ?? '',
          type: attr.attributeDefinition?.type ?? '',
          unit: attr.attributeDefinition?.unit ?? null,
          value: attr.value,
          translations: attrTranslations,
        };
      }),
    };
  }

  private async findProductOrFail(id: string): Promise<Product> {
    const p = await this.productRepo
      .createQueryBuilder('p')
      .where('p.id = :id', { id })
      .andWhere('p.deletedAt IS NULL')
      .getOne();
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  private async saveTranslations(productId: string, translations: any) {
    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = translations[lang];
      if (tDto) {
        const text =
          tDto.descriptionText ??
          (tDto.descriptionDelta ? deltaToPlainText(tDto.descriptionDelta) : null);

        const existing = await this.productTransRepo.findOne({
          where: { productId, languageCode: lang },
        });
        if (existing) {
          existing.name = tDto.name;
          existing.descriptionDelta = tDto.descriptionDelta ?? existing.descriptionDelta;
          existing.descriptionText = text ?? existing.descriptionText;
          await this.productTransRepo.save(existing);
        } else {
          await this.productTransRepo.save(
            this.productTransRepo.create({
              productId,
              languageCode: lang,
              name: tDto.name,
              descriptionDelta: tDto.descriptionDelta ?? null,
              descriptionText: text ?? null,
            }),
          );
        }
      }
    }
  }

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const qb = this.productRepo
        .createQueryBuilder('p')
        .where('p.slug = :slug', { slug })
        .withDeleted();
      if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
      const existing = await qb.getOne();
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
