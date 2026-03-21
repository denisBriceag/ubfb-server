import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_MAP, ErrorsEnum } from '@core/constants';
import { Brand } from './entities/brand.entity';
import { BrandTranslation } from './entities/brand-translation.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UploadsService } from '../uploads/uploads.service';
import { flattenTranslation } from '../common/helpers/flatten-translation.helper';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(BrandTranslation)
    private readonly brandTransRepo: Repository<BrandTranslation>,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAllPublic(lang: string, search?: string, page = 1, limit = 16) {
    const qb = this.brandRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .where('b.deletedAt IS NULL')
      .andWhere('b.isActive = true');

    if (search) {
      qb.andWhere('tr.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('b.sortOrder', 'ASC').addOrderBy('b.slug', 'ASC');

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const data = items.map((b) =>
      flattenTranslation<{ id: string; slug: string; name: string; logo: string | null }>(
        { ...b, translations: b.translations },
        lang,
      ),
    );

    return {
      data: data.map((b) => ({ id: b.id, slug: b.slug, name: b.name, logo: (b as any).logo })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAdmin() {
    const items = await this.brandRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.translations', 'tr')
      .where('b.deletedAt IS NULL')
      .orderBy('b.sortOrder', 'ASC')
      .getMany();

    return items.map((b) => this.formatAdminBrand(b));
  }

  async findOneAdmin(id: string) {
    const b = await this.brandRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.translations', 'tr')
      .where('b.id = :id', { id })
      .andWhere('b.deletedAt IS NULL')
      .getOne();
    if (!b) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return this.formatAdminBrand(b);
  }

  async create(dto: CreateBrandDto, currentUserId: string) {
    let slug = dto.slug ?? generateSlug(dto.translations.ru.name);
    slug = await this.resolveUniqueSlug(slug);

    const brand = this.brandRepo.create({
      slug,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      updatedBy: currentUserId,
    });
    const saved = await this.brandRepo.save(brand);
    await this.saveTranslations(saved.id, dto.translations);
    return this.findOneAdmin(saved.id);
  }

  async update(id: string, dto: UpdateBrandDto, currentUserId: string) {
    const brand = await this.findBrandOrFail(id);
    if (dto.version !== undefined && brand.version !== dto.version) {
      throw new ConflictException({ message: ErrorsEnum.VERSION_MISMATCH, errorCode: ERROR_MAP.VERSION_MISMATCH });
    }
    if (dto.slug && dto.slug !== brand.slug) {
      dto.slug = await this.resolveUniqueSlug(dto.slug, id);
    }
    Object.assign(brand, {
      slug: dto.slug ?? brand.slug,
      isActive: dto.isActive ?? brand.isActive,
      sortOrder: dto.sortOrder ?? brand.sortOrder,
      updatedBy: currentUserId,
    });
    await this.brandRepo.save(brand);
    if (dto.translations) {
      await this.saveTranslations(id, dto.translations);
    }
    return this.findOneAdmin(id);
  }

  async softDelete(id: string, currentUserId: string) {
    const brand = await this.findBrandOrFail(id);
    // TODO: check no active products use this brand
    brand.isActive = false;
    brand.updatedBy = currentUserId;
    await this.brandRepo.save(brand);
    await this.brandRepo.softDelete(id);
  }

  async hardDelete(id: string) {
    const brand = await this.brandRepo.findOne({ where: { id }, withDeleted: true });
    if (!brand) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    if (!brand.deletedAt) {
      throw new BadRequestException({ message: ErrorsEnum.OPERATION_ERROR, errorCode: ERROR_MAP.OPERATION_ERROR });
    }
    if (brand.logo) {
      await this.uploadsService.deleteFile(brand.logo);
    }
    await this.brandRepo.delete(id);
  }

  async uploadLogo(id: string, file: Express.Multer.File, currentUserId: string) {
    const brand = await this.findBrandOrFail(id);
    if (brand.logo) {
      await this.uploadsService.deleteFile(brand.logo);
    }
    const [url] = await this.uploadsService.saveFiles('brands', id, [file]);
    brand.logo = url;
    brand.updatedBy = currentUserId;
    await this.brandRepo.save(brand);
    return { logo: url };
  }

  async reorder(items: { id: string; sortOrder: number }[], currentUserId: string) {
    for (const item of items) {
      await this.brandRepo.update(item.id, {
        sortOrder: item.sortOrder,
        updatedBy: currentUserId,
      });
    }
  }

  private async findBrandOrFail(id: string): Promise<Brand> {
    const b = await this.brandRepo
      .createQueryBuilder('b')
      .where('b.id = :id', { id })
      .andWhere('b.deletedAt IS NULL')
      .getOne();
    if (!b) throw new NotFoundException({ message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION, errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION });
    return b;
  }

  private formatAdminBrand(b: Brand) {
    const translations: Record<string, any> = {};
    for (const t of b.translations ?? []) {
      translations[t.languageCode] = { name: t.name };
    }
    return {
      id: b.id,
      slug: b.slug,
      logo: b.logo,
      isActive: b.isActive,
      sortOrder: b.sortOrder,
      version: b.version,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      translations,
    };
  }

  private async saveTranslations(brandId: string, translations: any) {
    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = translations[lang];
      if (tDto) {
        const existing = await this.brandTransRepo.findOne({
          where: { brandId, languageCode: lang },
        });
        if (existing) {
          existing.name = tDto.name;
          await this.brandTransRepo.save(existing);
        } else {
          await this.brandTransRepo.save(
            this.brandTransRepo.create({ brandId, languageCode: lang, name: tDto.name }),
          );
        }
      }
    }
  }

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (true) {
      const qb = this.brandRepo
        .createQueryBuilder('b')
        .where('b.slug = :slug', { slug })
        .withDeleted();
      if (excludeId) qb.andWhere('b.id != :id', { id: excludeId });
      const existing = await qb.getOne();
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
