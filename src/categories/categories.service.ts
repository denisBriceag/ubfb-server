import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_MAP, ErrorsEnum } from '@core/constants';
import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { AttributeDefinition } from './entities/attribute-definition.entity';
import { AttributeDefinitionTranslation } from './entities/attribute-definition-translation.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';
import { UploadsService } from '../uploads/uploads.service';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(CategoryTranslation)
    private readonly categoryTransRepo: Repository<CategoryTranslation>,
    @InjectRepository(AttributeDefinition)
    private readonly attrDefRepo: Repository<AttributeDefinition>,
    @InjectRepository(AttributeDefinitionTranslation)
    private readonly attrDefTransRepo: Repository<AttributeDefinitionTranslation>,
    private readonly uploadsService: UploadsService,
  ) {}

  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  async findTreePublic(lang: string) {
    // Fetch root categories with children
    const roots = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .leftJoinAndSelect('c.children', 'child', 'child.deletedAt IS NULL AND child.isActive = true')
      .leftJoinAndSelect('child.translations', 'ctr', 'ctr.languageCode = :lang', { lang })
      .where('c.deletedAt IS NULL')
      .andWhere('c.isActive = true')
      .andWhere('c.parentId IS NULL')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('child.sortOrder', 'ASC')
      .getMany();

    // For productCount we would need products repo; return 0 for now (products module will override)
    return roots.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.translations[0]?.name ?? '',
      image: cat.image,
      isOther: cat.isOther,
      sortOrder: cat.sortOrder,
      productCount: 0,
      children: cat.children.map((child) => ({
        id: child.id,
        slug: child.slug,
        name: child.translations[0]?.name ?? '',
        sortOrder: child.sortOrder,
        productCount: 0,
      })),
    }));
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  async findTreeAdmin() {
    const roots = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr')
      .leftJoinAndSelect('c.children', 'child', 'child.deletedAt IS NULL')
      .leftJoinAndSelect('child.translations', 'ctr')
      .where('c.deletedAt IS NULL')
      .andWhere('c.parentId IS NULL')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('child.sortOrder', 'ASC')
      .getMany();

    return roots.map((cat) => ({
      ...this.formatAdminCategory(cat),
      children: cat.children.map((child) => this.formatAdminCategory(child)),
    }));
  }

  async findOneAdmin(id: string) {
    const cat = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr')
      .where('c.id = :id', { id })
      .andWhere('c.deletedAt IS NULL')
      .getOne();
    if (!cat) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return this.formatAdminCategory(cat);
  }

  async create(dto: CreateCategoryDto, currentUserId: string) {
    // Validate max depth 2
    if (dto.parentId) {
      const parent = await this.categoryRepo
        .createQueryBuilder('c')
        .where('c.id = :id', { id: dto.parentId })
        .andWhere('c.deletedAt IS NULL')
        .getOne();
      if (!parent) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
      if (parent.parentId) {
        throw new BadRequestException({ message: ErrorsEnum.OPERATION_ERROR, errorCode: ERROR_MAP.OPERATION_ERROR });
      }
    }

    let slug = dto.slug ?? generateSlug(dto.translations.ru.name);
    slug = await this.resolveUniqueSlug(slug);

    const cat = this.categoryRepo.create({
      slug,
      parentId: dto.parentId ?? null,
      isOther: dto.isOther ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      updatedBy: currentUserId,
    });
    const saved = await this.categoryRepo.save(cat);
    await this.saveCategoryTranslations(saved.id, dto.translations);
    return this.findOneAdmin(saved.id);
  }

  async update(id: string, dto: UpdateCategoryDto, currentUserId: string) {
    const cat = await this.findCategoryOrFail(id);
    if (dto.version !== undefined && cat.version !== dto.version) {
      throw new ConflictException({ message: ErrorsEnum.VERSION_MISMATCH, errorCode: ERROR_MAP.VERSION_MISMATCH });
    }
    if (dto.slug && dto.slug !== cat.slug) {
      dto.slug = await this.resolveUniqueSlug(dto.slug, id);
    }
    Object.assign(cat, {
      slug: dto.slug ?? cat.slug,
      parentId: dto.parentId !== undefined ? (dto.parentId ?? null) : cat.parentId,
      isOther: dto.isOther ?? cat.isOther,
      isActive: dto.isActive ?? cat.isActive,
      sortOrder: dto.sortOrder ?? cat.sortOrder,
      updatedBy: currentUserId,
    });
    await this.categoryRepo.save(cat);
    if (dto.translations) {
      await this.saveCategoryTranslations(id, dto.translations);
    }
    return this.findOneAdmin(id);
  }

  async softDelete(id: string, currentUserId: string) {
    const cat = await this.findCategoryOrFail(id);
    // Reject if has active children
    const activeChildCount = await this.categoryRepo
      .createQueryBuilder('c')
      .where('c.parentId = :id', { id })
      .andWhere('c.deletedAt IS NULL')
      .andWhere('c.isActive = true')
      .getCount();
    if (activeChildCount > 0) {
      throw new BadRequestException({ message: ErrorsEnum.OPERATION_ERROR, errorCode: ERROR_MAP.OPERATION_ERROR });
    }
    // TODO: reject if has active products (products module not yet written)
    cat.isActive = false;
    cat.updatedBy = currentUserId;
    await this.categoryRepo.save(cat);
    await this.categoryRepo.softDelete(id);
  }

  async hardDelete(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id }, withDeleted: true });
    if (!cat) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    if (!cat.deletedAt) {
      throw new BadRequestException({ message: ErrorsEnum.OPERATION_ERROR, errorCode: ERROR_MAP.OPERATION_ERROR });
    }
    if (cat.image) {
      await this.uploadsService.deleteFile(cat.image);
    }
    await this.uploadsService.deleteFolder('categories', id);
    await this.categoryRepo.delete(id);
  }

  async uploadImage(id: string, file: Express.Multer.File, currentUserId: string) {
    const cat = await this.findCategoryOrFail(id);
    if (cat.image) {
      await this.uploadsService.deleteFile(cat.image);
    }
    const [url] = await this.uploadsService.saveFiles('categories', id, [file]);
    cat.image = url;
    cat.updatedBy = currentUserId;
    await this.categoryRepo.save(cat);
    return { image: url };
  }

  async reorder(items: { id: string; sortOrder: number }[], currentUserId: string) {
    for (const item of items) {
      await this.categoryRepo.update(item.id, {
        sortOrder: item.sortOrder,
        updatedBy: currentUserId,
      });
    }
  }

  // ─── ATTRIBUTE DEFINITIONS ───────────────────────────────────────────────────

  async findAttributeDefinitions(categoryId: string) {
    await this.findCategoryOrFail(categoryId);
    const attrs = await this.attrDefRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.translations', 'tr')
      .where('a.categoryId = :categoryId', { categoryId })
      .andWhere('a.deletedAt IS NULL')
      .orderBy('a.sortOrder', 'ASC')
      .getMany();

    return attrs.map((a) => this.formatAdminAttrDef(a));
  }

  async createAttributeDefinition(
    categoryId: string,
    dto: CreateAttributeDefinitionDto,
    currentUserId: string,
  ) {
    await this.findCategoryOrFail(categoryId);
    const attr = this.attrDefRepo.create({
      categoryId,
      key: dto.key,
      type: dto.type,
      unit: dto.unit ?? null,
      sortOrder: dto.sortOrder ?? 0,
      updatedBy: currentUserId,
    });
    const saved = await this.attrDefRepo.save(attr);
    await this.saveAttrTranslations(saved.id, dto.translations);
    return this.findAttrDefByIdAdmin(saved.id);
  }

  async updateAttributeDefinition(
    categoryId: string,
    attrId: string,
    dto: UpdateAttributeDefinitionDto,
    currentUserId: string,
  ) {
    const attr = await this.findAttrDefOrFail(attrId, categoryId);
    if (dto.version !== undefined && attr.version !== dto.version) {
      throw new ConflictException({ message: ErrorsEnum.VERSION_MISMATCH, errorCode: ERROR_MAP.VERSION_MISMATCH });
    }
    Object.assign(attr, {
      key: dto.key ?? attr.key,
      type: dto.type ?? attr.type,
      unit: dto.unit !== undefined ? (dto.unit ?? null) : attr.unit,
      sortOrder: dto.sortOrder ?? attr.sortOrder,
      updatedBy: currentUserId,
    });
    await this.attrDefRepo.save(attr);
    if (dto.translations) {
      await this.saveAttrTranslations(attrId, dto.translations);
    }
    return this.findAttrDefByIdAdmin(attrId);
  }

  async deleteAttributeDefinition(
    categoryId: string,
    attrId: string,
    currentUserId: string,
  ) {
    const attr = await this.findAttrDefOrFail(attrId, categoryId);
    attr.updatedBy = currentUserId;
    await this.attrDefRepo.save(attr);
    await this.attrDefRepo.softDelete(attrId);
    // ProductAttribute rows will cascade-delete via FK
  }

  async reorderAttributeDefinitions(
    categoryId: string,
    items: { id: string; sortOrder: number }[],
    currentUserId: string,
  ) {
    await this.findCategoryOrFail(categoryId);
    for (const item of items) {
      await this.attrDefRepo.update(item.id, {
        sortOrder: item.sortOrder,
        updatedBy: currentUserId,
      });
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async findCategoryOrFail(id: string): Promise<Category> {
    const cat = await this.categoryRepo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.deletedAt IS NULL')
      .getOne();
    if (!cat) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return cat;
  }

  private async findAttrDefOrFail(id: string, categoryId: string): Promise<AttributeDefinition> {
    const attr = await this.attrDefRepo
      .createQueryBuilder('a')
      .where('a.id = :id', { id })
      .andWhere('a.categoryId = :categoryId', { categoryId })
      .andWhere('a.deletedAt IS NULL')
      .getOne();
    if (!attr) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return attr;
  }

  private async findAttrDefByIdAdmin(id: string) {
    const attr = await this.attrDefRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.translations', 'tr')
      .where('a.id = :id', { id })
      .andWhere('a.deletedAt IS NULL')
      .getOne();
    if (!attr) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return this.formatAdminAttrDef(attr);
  }

  private formatAdminCategory(cat: Category) {
    const translations: Record<string, any> = {};
    for (const t of cat.translations ?? []) {
      translations[t.languageCode] = { name: t.name };
    }
    return {
      id: cat.id,
      slug: cat.slug,
      image: cat.image,
      isOther: cat.isOther,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      parentId: cat.parentId,
      version: cat.version,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      translations,
    };
  }

  private formatAdminAttrDef(attr: AttributeDefinition) {
    const translations: Record<string, any> = {};
    for (const t of attr.translations ?? []) {
      translations[t.languageCode] = { label: t.label };
    }
    return {
      id: attr.id,
      key: attr.key,
      type: attr.type,
      unit: attr.unit,
      sortOrder: attr.sortOrder,
      categoryId: attr.categoryId,
      version: attr.version,
      translations,
    };
  }

  private async saveCategoryTranslations(categoryId: string, translations: any) {
    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = translations[lang];
      if (tDto) {
        const existing = await this.categoryTransRepo.findOne({
          where: { categoryId, languageCode: lang },
        });
        if (existing) {
          existing.name = tDto.name;
          await this.categoryTransRepo.save(existing);
        } else {
          await this.categoryTransRepo.save(
            this.categoryTransRepo.create({ categoryId, languageCode: lang, name: tDto.name }),
          );
        }
      }
    }
  }

  private async saveAttrTranslations(attributeDefinitionId: string, translations: any) {
    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = translations[lang];
      if (tDto) {
        const existing = await this.attrDefTransRepo.findOne({
          where: { attributeDefinitionId, languageCode: lang },
        });
        if (existing) {
          existing.label = tDto.label;
          await this.attrDefTransRepo.save(existing);
        } else {
          await this.attrDefTransRepo.save(
            this.attrDefTransRepo.create({
              attributeDefinitionId,
              languageCode: lang,
              label: tDto.label,
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
      const qb = this.categoryRepo
        .createQueryBuilder('c')
        .where('c.slug = :slug', { slug })
        .withDeleted();
      if (excludeId) qb.andWhere('c.id != :id', { id: excludeId });
      const existing = await qb.getOne();
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
