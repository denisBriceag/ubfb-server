import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/types/errors.enum';
import { FEATURES } from '@core/constants';

import { PackagingType } from '../entities/packaging-type.entity';
import { CreatePackagingTypeDto } from '../dto/create-packaging-type.dto';
import { UpdatePackagingTypeDto } from '../dto/update-packaging-type.dto';

@Injectable()
export class PackagingTypeService {
  constructor(
    @InjectRepository(PackagingType)
    private readonly _packagingTypeRepository: Repository<PackagingType>,
  ) {}

  async create(dto: CreatePackagingTypeDto): Promise<PackagingType> {
    const existing = await this._packagingTypeRepository.findOneBy({
      name: dto.name,
    });

    if (existing) {
      throw new ConflictException({
        message: ErrorsEnum.GENERIC_CONFLICT_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_CONFLICT_EXCEPTION,
      });
    }

    const packagingType = this._packagingTypeRepository.create(dto);

    return this._packagingTypeRepository.save(packagingType);
  }

  async update(
    id: string,
    dto: UpdatePackagingTypeDto,
  ): Promise<PackagingType> {
    const existing = await this._packagingTypeRepository.findOneBy({ id });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return this._packagingTypeRepository.save({ ...existing, ...dto });
  }

  async delete(id: string): Promise<void> {
    const existing = await this._packagingTypeRepository.findOneBy({ id });

    if (!existing) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._packagingTypeRepository.delete(id);
  }

  async findOneById(id: string): Promise<PackagingType> {
    const packagingType = await this._packagingTypeRepository.findOneBy({ id });

    if (!packagingType) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, FEATURES.PACKAGING_TYPE),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return packagingType;
  }

  async findAll(): Promise<PackagingType[]> {
    return this._packagingTypeRepository.find({ order: { name: 'ASC' } });
  }
}
