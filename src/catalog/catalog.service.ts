import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VolumeUnit } from './entities/volume-unit.entity';
import { VolumeUnitTranslation } from './entities/volume-unit-translation.entity';
import { Country } from './entities/country.entity';
import { CountryTranslation } from './entities/country-translation.entity';
import { CreateVolumeUnitDto } from './dto/create-volume-unit.dto';
import { UpdateVolumeUnitDto } from './dto/update-volume-unit.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(VolumeUnit)
    private readonly vuRepo: Repository<VolumeUnit>,
    @InjectRepository(VolumeUnitTranslation)
    private readonly vuTransRepo: Repository<VolumeUnitTranslation>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(CountryTranslation)
    private readonly countryTransRepo: Repository<CountryTranslation>,
  ) {}

  // ─── VOLUME UNITS ───────────────────────────────────────────────────────────

  async findAllVolumeUnitsPublic(lang: string) {
    const items = await this.vuRepo
      .createQueryBuilder('vu')
      .leftJoinAndSelect(
        'vu.translations',
        'tr',
        'tr.languageCode = :lang',
        { lang },
      )
      .where('vu.deletedAt IS NULL')
      .andWhere('vu.isActive = true')
      .orderBy('vu.code', 'ASC')
      .getMany();

    return items.map((vu) => ({
      id: vu.id,
      code: vu.code,
      label: vu.translations[0]?.label ?? '',
    }));
  }

  async findAllVolumeUnitsAdmin() {
    const items = await this.vuRepo
      .createQueryBuilder('vu')
      .leftJoinAndSelect('vu.translations', 'tr')
      .where('vu.deletedAt IS NULL')
      .orderBy('vu.code', 'ASC')
      .getMany();

    return items.map((vu) => {
      const translations: Record<string, any> = {};
      for (const t of vu.translations) {
        translations[t.languageCode] = { label: t.label };
      }
      return { id: vu.id, code: vu.code, isActive: vu.isActive, version: vu.version, translations };
    });
  }

  async createVolumeUnit(dto: CreateVolumeUnitDto, currentUserId: string) {
    const existing = await this.vuRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Volume unit with this code already exists');
    }
    const vu = this.vuRepo.create({ code: dto.code, updatedBy: currentUserId });
    const saved = await this.vuRepo.save(vu);

    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = (dto.translations as any)[lang];
      if (tDto) {
        await this.vuTransRepo.save(
          this.vuTransRepo.create({
            volumeUnitId: saved.id,
            languageCode: lang,
            label: tDto.label,
          }),
        );
      }
    }
    return this.findVolumeUnitByIdAdmin(saved.id);
  }

  async updateVolumeUnit(id: string, dto: UpdateVolumeUnitDto, currentUserId: string) {
    const vu = await this.findVolumeUnitOrFail(id);
    if (dto.version !== undefined && vu.version !== dto.version) {
      throw new ConflictException('Entity modified by another user. Refresh and retry.');
    }
    if (dto.code) vu.code = dto.code;
    vu.updatedBy = currentUserId;
    await this.vuRepo.save(vu);

    if (dto.translations) {
      const langs = ['ru', 'ro', 'en'] as const;
      for (const lang of langs) {
        const tDto = (dto.translations as any)[lang];
        if (tDto) {
          const existing = await this.vuTransRepo.findOne({
            where: { volumeUnitId: id, languageCode: lang },
          });
          if (existing) {
            existing.label = tDto.label;
            await this.vuTransRepo.save(existing);
          } else {
            await this.vuTransRepo.save(
              this.vuTransRepo.create({ volumeUnitId: id, languageCode: lang, label: tDto.label }),
            );
          }
        }
      }
    }
    return this.findVolumeUnitByIdAdmin(id);
  }

  async softDeleteVolumeUnit(id: string, currentUserId: string) {
    const vu = await this.findVolumeUnitOrFail(id);
    vu.isActive = false;
    vu.updatedBy = currentUserId;
    await this.vuRepo.save(vu);
    await this.vuRepo.softDelete(id);
  }

  async hardDeleteVolumeUnit(id: string) {
    const vu = await this.vuRepo.findOne({ where: { id }, withDeleted: true });
    if (!vu) throw new NotFoundException('Volume unit not found');
    if (!vu.deletedAt) {
      throw new BadRequestException('Soft delete first before hard delete');
    }
    await this.vuRepo.delete(id);
  }

  private async findVolumeUnitOrFail(id: string): Promise<VolumeUnit> {
    const vu = await this.vuRepo
      .createQueryBuilder('vu')
      .where('vu.id = :id', { id })
      .andWhere('vu.deletedAt IS NULL')
      .getOne();
    if (!vu) throw new NotFoundException('Volume unit not found');
    return vu;
  }

  private async findVolumeUnitByIdAdmin(id: string) {
    const vu = await this.vuRepo
      .createQueryBuilder('vu')
      .leftJoinAndSelect('vu.translations', 'tr')
      .where('vu.id = :id', { id })
      .andWhere('vu.deletedAt IS NULL')
      .getOne();
    if (!vu) throw new NotFoundException('Volume unit not found');
    const translations: Record<string, any> = {};
    for (const t of vu.translations) {
      translations[t.languageCode] = { label: t.label };
    }
    return { id: vu.id, code: vu.code, isActive: vu.isActive, version: vu.version, translations };
  }

  // ─── COUNTRIES ──────────────────────────────────────────────────────────────

  async findAllCountriesPublic(lang: string) {
    const items = await this.countryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr', 'tr.languageCode = :lang', { lang })
      .where('c.deletedAt IS NULL')
      .andWhere('c.isActive = true')
      .orderBy('c.code', 'ASC')
      .getMany();

    return items.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.translations[0]?.name ?? '',
    }));
  }

  async findAllCountriesAdmin() {
    const items = await this.countryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr')
      .where('c.deletedAt IS NULL')
      .orderBy('c.code', 'ASC')
      .getMany();

    return items.map((c) => {
      const translations: Record<string, any> = {};
      for (const t of c.translations) {
        translations[t.languageCode] = { name: t.name };
      }
      return { id: c.id, code: c.code, isActive: c.isActive, version: c.version, translations };
    });
  }

  async createCountry(dto: CreateCountryDto, currentUserId: string) {
    const existing = await this.countryRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Country with this code already exists');
    const country = this.countryRepo.create({ code: dto.code, updatedBy: currentUserId });
    const saved = await this.countryRepo.save(country);

    const langs = ['ru', 'ro', 'en'] as const;
    for (const lang of langs) {
      const tDto = (dto.translations as any)[lang];
      if (tDto) {
        await this.countryTransRepo.save(
          this.countryTransRepo.create({ countryId: saved.id, languageCode: lang, name: tDto.name }),
        );
      }
    }
    return this.findCountryByIdAdmin(saved.id);
  }

  async updateCountry(id: string, dto: UpdateCountryDto, currentUserId: string) {
    const country = await this.findCountryOrFail(id);
    if (dto.version !== undefined && country.version !== dto.version) {
      throw new ConflictException('Entity modified by another user. Refresh and retry.');
    }
    if (dto.code) country.code = dto.code;
    country.updatedBy = currentUserId;
    await this.countryRepo.save(country);

    if (dto.translations) {
      const langs = ['ru', 'ro', 'en'] as const;
      for (const lang of langs) {
        const tDto = (dto.translations as any)[lang];
        if (tDto) {
          const existing = await this.countryTransRepo.findOne({
            where: { countryId: id, languageCode: lang },
          });
          if (existing) {
            existing.name = tDto.name;
            await this.countryTransRepo.save(existing);
          } else {
            await this.countryTransRepo.save(
              this.countryTransRepo.create({ countryId: id, languageCode: lang, name: tDto.name }),
            );
          }
        }
      }
    }
    return this.findCountryByIdAdmin(id);
  }

  async softDeleteCountry(id: string, currentUserId: string) {
    const country = await this.findCountryOrFail(id);
    country.isActive = false;
    country.updatedBy = currentUserId;
    await this.countryRepo.save(country);
    await this.countryRepo.softDelete(id);
  }

  async hardDeleteCountry(id: string) {
    const country = await this.countryRepo.findOne({ where: { id }, withDeleted: true });
    if (!country) throw new NotFoundException('Country not found');
    if (!country.deletedAt) {
      throw new BadRequestException('Soft delete first before hard delete');
    }
    await this.countryRepo.delete(id);
  }

  private async findCountryOrFail(id: string): Promise<Country> {
    const c = await this.countryRepo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.deletedAt IS NULL')
      .getOne();
    if (!c) throw new NotFoundException('Country not found');
    return c;
  }

  private async findCountryByIdAdmin(id: string) {
    const c = await this.countryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.translations', 'tr')
      .where('c.id = :id', { id })
      .andWhere('c.deletedAt IS NULL')
      .getOne();
    if (!c) throw new NotFoundException('Country not found');
    const translations: Record<string, any> = {};
    for (const t of c.translations) {
      translations[t.languageCode] = { name: t.name };
    }
    return { id: c.id, code: c.code, isActive: c.isActive, version: c.version, translations };
  }
}
