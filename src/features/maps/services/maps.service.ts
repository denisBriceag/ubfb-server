import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maps } from '../entities/maps.entity';
import { CreateMapsCoordsDto } from '../dto/create-maps-coords.dto';
import { UpdateMapsCoords } from '../dto/update-maps-coords';
import { ERROR_MAP, ErrorsEnum } from '@core/types/errors.enum';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';
import { UserService } from '@features/user/services/user.service';

@Injectable()
export class MapsService {
  constructor(
    @InjectRepository(Maps)
    private readonly _mapsRepository: Repository<Maps>,
    @Inject(DOMAIN) private readonly _domain: Domains,
    private readonly _userService: UserService,
  ) {}

  async create(
    createMapsCoordsDto: CreateMapsCoordsDto,
    updatedBy: string,
  ): Promise<Maps> {
    const existingMap = await this._mapsRepository.findOne({ where: {} });

    if (existingMap) {
      throw new ConflictException({
        message: ErrorsEnum.RESOURCE_ALREADY_EXISTS,
        errorCode: ERROR_MAP.GENERIC_CONFLICT_EXCEPTION,
      });
    }

    const newMaps = {
      ...createMapsCoordsDto,
      updatedBy,
      updater: await this._userService.findUpdater(updatedBy),
    };

    return await this._mapsRepository.save(newMaps);
  }

  async update(
    updateMapsCoordsDto: UpdateMapsCoords,
    updatedBy: string,
  ): Promise<Maps> {
    const mapToUpdate = await this._mapsRepository.findOne({
      where: {},
      lock: { mode: 'optimistic', version: updateMapsCoordsDto.version },
    });

    if (!mapToUpdate) {
      throw new NotFoundException({
        message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION,
      });
    }

    const updatedMaps = {
      ...mapToUpdate,
      ...updateMapsCoordsDto,
      updatedBy,
      updater: await this._userService.findUpdater(updatedBy),
    };

    return await this._mapsRepository.save(updatedMaps);
  }

  async getCoords(): Promise<Maps> {
    const qb = this._mapsRepository.createQueryBuilder('m');

    if (this._domain === Domains.STORE) {
      qb.select([
        'm.centerLat',
        'm.centerLng',
        'm.markerLat',
        'm.markerLng',
        'm.zoom',
      ]);
    } else {
      qb.leftJoin('m.updater', 'u').select('m').addSelect(['u.id', 'u.email']);
    }

    const map = await qb.getOne();

    if (!map) {
      throw new NotFoundException({
        message: ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION,
        errorCode: ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION,
      });
    }

    return map;
  }
}
