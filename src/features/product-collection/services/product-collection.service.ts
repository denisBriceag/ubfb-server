import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/types/errors.enum';
import { FEATURES } from '@core/constants';
import { Language } from '@core/types/language';
import { resolveLocalized } from '@core/utils/resolve-localized.util';
import { Product } from '@features/product/entities/product.entity';
import { StoreCollectionModel } from '../models/store-product-collection.model';

import { ProductCollection } from '../entities/product-collection.entity';
import { ProductCollectionItem } from '../entities/product-collection-item.entity';
import { CreateProductCollectionDto } from '../dto/create-product-collection.dto';
import { UpdateProductCollectionDto } from '../dto/update-product-collection.dto';
import { AddCollectionItemDto } from '../dto/add-collection-item.dto';
import { FindManyProductCollectionsDto } from '../dto/find-many-product-collections.dto';

const MAX_ACTIVE_COLLECTIONS = 3;

@Injectable()
export class ProductCollectionService {
  constructor(
    @InjectRepository(ProductCollection)
    private readonly _collectionRepository: Repository<ProductCollection>,
    @InjectRepository(ProductCollectionItem)
    private readonly _itemRepository: Repository<ProductCollectionItem>,
    @InjectRepository(Product)
    private readonly _productRepository: Repository<Product>,
  ) {}

  async create(
    dto: CreateProductCollectionDto,
    updatedBy: string,
  ): Promise<ProductCollection> {
    if (dto.isActive) {
      await this._assertActiveCollectionLimit();
    }

    const collection = this._collectionRepository.create({ ...dto, updatedBy });
    const saved = await this._collectionRepository.save(collection);

    return (await this._findOneWithItems(saved.id))!;
  }

  async update(
    id: string,
    dto: UpdateProductCollectionDto,
    updatedBy: string,
  ): Promise<ProductCollection> {
    const existing = await this._collectionRepository.findOne({
      where: { id },
      lock: { mode: 'optimistic', version: dto.version },
    });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT_COLLECTION),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (dto.isActive && !existing.isActive) {
      await this._assertActiveCollectionLimit();
    }

    const saved = await this._collectionRepository.save({
      ...existing,
      ...dto,
      updatedBy,
    });

    return (await this._findOneWithItems(saved.id))!;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const collection = await this._collectionRepository.findOneBy({ id });

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT_COLLECTION),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._collectionRepository.update(id, { updatedBy });
    await this._collectionRepository.softDelete(id);
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    const collection = await this._collectionRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT_COLLECTION),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (collection.isActive) {
      await this._assertActiveCollectionLimit();
    }

    await this._collectionRepository.restore(id);
    await this._collectionRepository.update(id, { updatedBy });
  }

  async hardDelete(id: string): Promise<void> {
    const collection = await this._collectionRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT_COLLECTION),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._collectionRepository.delete(id);
  }

  async findOneById(id: string): Promise<ProductCollection> {
    const collection = await this._findOneWithItems(id);

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PRODUCT_COLLECTION),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return collection;
  }

  async findAll(
    dto?: FindManyProductCollectionsDto,
  ): Promise<ProductCollection[]> {
    const withDeleted = dto?.includeDeleted ?? false;

    const qb = this._collectionRepository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'items')
      .leftJoin('items.product', 'product')
      .addSelect(['product.id', 'product.name', 'product.isActive'])
      .leftJoin('collection.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .orderBy('collection.position', 'ASC')
      .addOrderBy('collection.createdAt', 'DESC')
      .addOrderBy('items.position', 'ASC');

    if (withDeleted) {
      qb.withDeleted();
    }

    return qb.getMany();
  }

  async addItem(
    collectionId: string,
    dto: AddCollectionItemDto,
  ): Promise<ProductCollectionItem> {
    const collection = await this._collectionRepository.findOneBy({
      id: collectionId,
    });

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound(
          'id',
          collectionId,
          FEATURES.PRODUCT_COLLECTION,
        ),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const product = await this._productRepository.findOneBy({
      id: dto.productId,
    });

    if (!product) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', dto.productId, FEATURES.PRODUCT),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const existing = await this._itemRepository.findOneBy({
      collectionId,
      productId: dto.productId,
    });

    if (existing) {
      throw new ConflictException({
        message: ErrorsEnum.GENERIC_CONFLICT_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_CONFLICT_EXCEPTION,
      });
    }

    const item = this._itemRepository.create({
      collectionId,
      productId: dto.productId,
      position: dto.position ?? 0,
    });

    return this._itemRepository.save(item);
  }

  async removeItem(collectionId: string, productId: string): Promise<void> {
    const item = await this._itemRepository.findOneBy({
      collectionId,
      productId,
    });

    if (!item) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound(
          'productId',
          productId,
          FEATURES.PRODUCT_COLLECTION,
        ),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._itemRepository.delete({ collectionId, productId });
  }

  async findAllActiveStore(
    language: Language,
  ): Promise<StoreCollectionModel[]> {
    const collections = await this._buildStoreCollectionQb()
      .where('collection.isActive = true')
      .orderBy('collection.position', 'ASC')
      .addOrderBy('items.position', 'ASC')
      .getMany();

    return collections.map((c) => this._toStoreCollection(c, language));
  }

  async findOneBySlugStore(
    slug: string,
    language: Language,
  ): Promise<StoreCollectionModel> {
    const collection = await this._buildStoreCollectionQb()
      .where('collection.slug = :slug AND collection.isActive = true', { slug })
      .orderBy('items.position', 'ASC')
      .getOne();

    if (!collection) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound(
          'slug',
          slug,
          FEATURES.PRODUCT_COLLECTION,
        ),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return this._toStoreCollection(collection, language);
  }

  private _buildStoreCollectionQb() {
    return this._collectionRepository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'items')
      .leftJoin(
        'items.product',
        'product',
        'product.isActive = true AND product.deletedAt IS NULL',
      )
      .addSelect([
        'product.id',
        'product.slug',
        'product.name',
        'product.images',
        'product.price',
        'product.isWholesale',
      ])
      .innerJoin('product.category', 'product_category')
      .addSelect(['product_category.slug', 'product_category.name'])
      .leftJoin('product.brand', 'product_brand')
      .addSelect(['product_brand.slug', 'product_brand.name']);
  }

  private _toStoreCollection(
    collection: any,
    language: Language,
  ): StoreCollectionModel {
    return {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      position: collection.position,
      items: (collection.items ?? [])
        .filter((item: any) => item.product != null)
        .map((item: any) => ({
          position: item.position,
          product: {
            id: item.product.id,
            slug: item.product.slug,
            name: item.product.name,
            images: item.product.images,
            price: item.product.price,
            isWholesale: item.product.isWholesale,
            category: {
              slug: item.product.category.slug,
              name: resolveLocalized(item.product.category.name, language),
            },
            brand: item.product.brand
              ? { slug: item.product.brand.slug, name: item.product.brand.name }
              : null,
          },
        })),
    };
  }

  private async _assertActiveCollectionLimit(): Promise<void> {
    const activeCount = await this._collectionRepository.countBy({
      isActive: true,
    });

    if (activeCount >= MAX_ACTIVE_COLLECTIONS) {
      throw new BadRequestException({
        message: `Cannot have more than ${MAX_ACTIVE_COLLECTIONS} active collections. Deactivate one first.`,
        errorCode: ERROR_MAP.OPERATION_ERROR,
      });
    }
  }

  private async _findOneWithItems(
    id: string,
  ): Promise<ProductCollection | null> {
    return this._collectionRepository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'items')
      .leftJoin('items.product', 'product')
      .addSelect(['product.id', 'product.name', 'product.isActive'])
      .leftJoin('collection.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('collection.id = :id', { id })
      .orderBy('items.position', 'ASC')
      .getOne();
  }
}
