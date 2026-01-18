import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@features/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { HashingService } from '@core/hashing';
import { SortOrder } from '@core/types/sorting-order.enum';
import { Roles } from '@core/types/roles.enum';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/types/errors.enum';
import { PaginatedData } from '@core/types/paginted-data';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FindManyUsersDto, UserSortBy } from '../dto/find-many-users.dto';

@Injectable()
export class UserService {
  private readonly _defaultPage = 1;
  private readonly _defaultLimit = 10;

  constructor(
    @InjectRepository(User) private readonly _userRepository: Repository<User>,
    private readonly _hashingService: HashingService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    withPassword = false,
    updatedBy: User['updatedBy'] = null,
    isExternallyCreated = false,
  ): Promise<Omit<User, 'password'> | User> {
    const hashedPassword = await this._hashingService.hash(
      createUserDto.password,
    );

    const newUser = { ...createUserDto, password: hashedPassword } as
      | Omit<User, 'password'>
      | User;

    if (isExternallyCreated) {
      newUser.updatedBy = updatedBy;
      newUser.updater = await this._userRepository.findOne({
        where: { id: updatedBy as string },
        select: ['id', 'email'],
      });
    }

    const user = await this._userRepository.save(newUser);

    const { password, ...userData } = user;

    if (withPassword) {
      return user;
    }

    return userData;
  }

  async softDelete(
    id: User['id'],
    updatedBy: User['updatedBy'],
    userRole: User['role'],
  ): Promise<void> {
    if (id === updatedBy) {
      throw new ForbiddenException({
        message: ErrorsEnum.SELF_DELETION_NOT_ALLOWED,
        errorCode: ERROR_MAP.SELF_DELETION_NOT_ALLOWED,
      });
    }

    const user = await this._userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (userRole === user.role) {
      throw new ForbiddenException({
        message: ErrorsEnum.NOT_ENOUGH_PERMISSIONS_OPERATION,
        errorCode: ERROR_MAP.NOT_ENOUGH_PERMISSIONS_OPERATION,
      });
    }

    const userToSoftDelete = {
      ...user,
      updatedBy,
      updater: await this._userRepository.findOne({
        where: { id: updatedBy as string },
        select: ['id', 'email'],
      }),
    };

    await this._userRepository.softDelete(userToSoftDelete.id);
  }

  async hardDelete(
    id: User['id'],
    updatedBy: User['id'],
    userRole: User['role'],
  ): Promise<void> {
    if (id === updatedBy) {
      throw new ForbiddenException({
        message: ErrorsEnum.SELF_DELETION_NOT_ALLOWED,
        errorCode: ERROR_MAP.SELF_DELETION_NOT_ALLOWED,
      });
    }

    const user = await this._userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    if (userRole === user.role) {
      throw new ForbiddenException({
        message: ErrorsEnum.NOT_ENOUGH_PERMISSIONS_OPERATION,
        errorCode: ERROR_MAP.NOT_ENOUGH_PERMISSIONS_OPERATION,
      });
    }

    await this._userRepository.delete(user.id);
  }

  async restore(id: User['id'], updatedBy: User['updatedBy']): Promise<void> {
    const user = await this._userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const userToSoftDelete = {
      ...user,
      updatedBy,
      updater: await this._userRepository.findOne({
        where: { id: updatedBy as string },
        select: ['id', 'email'],
      }),
    };

    await this._userRepository.restore(userToSoftDelete.id);
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
    updatedBy: User['updatedBy'],
    currentRole: User['role'],
  ): Promise<User> {
    const updateData: Partial<User> = { ...updateUserDto, updatedBy };

    if (
      (currentRole === Roles.ADMIN && updateUserDto.role !== Roles.USER) ||
      (currentRole === Roles.SUPER_ADMIN &&
        updateUserDto.role === Roles.SUPER_ADMIN)
    ) {
      throw new ForbiddenException({
        message: ErrorsEnum.NOT_ENOUGH_PERMISSIONS_OPERATION,
        errorCode: ERROR_MAP.NOT_ENOUGH_PERMISSIONS_OPERATION,
      });
    }

    if (updateUserDto.password) {
      updateData.password = await this._hashingService.hash(
        updateUserDto.password,
      );
    }

    const existingUser = await this._userRepository.findOne({
      where: { id },
      lock: { mode: 'optimistic', version: updateUserDto.version },
    });

    if (!existingUser) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const user = await this._userRepository.save({
      ...existingUser,
      ...updateData,
    });

    user.updater = await this._userRepository.findOne({
      where: { id: updatedBy as string },
      select: ['id', 'email'],
    });

    return user;
  }

  async findUpdater(id: User['id']): Promise<User | null> {
    const exists = await this._userRepository.exists({ where: { id } });

    if (!exists) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return this._userRepository.findOne({
      where: { id },
      select: ['id', 'email'],
    });
  }

  async findOneById(id: User['id'], withDeleted = true): Promise<User> {
    const queryBuilder = this._userRepository
      .createQueryBuilder('user')
      .leftJoin('user.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('user.id = :id', { id });

    if (withDeleted) {
      queryBuilder.withDeleted();
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    return user;
  }

  async findOneByEmail(
    email: User['email'],
    withPassword = false,
  ): Promise<User> {
    const queryBuilder = this._userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoin('user.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('user.email = :email', { email });

    if (withPassword) {
      queryBuilder.addSelect('user.password');
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('email', email, 'user'),
        errorCode: ERROR_MAP.INVALID_EMAIL,
      });
    }

    return user;
  }

  async findMany(dto: FindManyUsersDto): Promise<PaginatedData<User>> {
    const search = dto?.search;
    const sortBy = dto?.sortBy ?? UserSortBy.CREATED_AT;
    const sortOrder = dto?.sortOrder ?? SortOrder.DESC;
    const withDeleted = dto?.includeDeleted ?? false;
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const queryBuilder = this._userRepository
      .createQueryBuilder('user')
      .leftJoin('user.updater', 'updater')
      .addSelect(['updater.id', 'updater.email']);

    if (withDeleted) {
      queryBuilder.withDeleted();
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.name ILIKE :search', {
            search: `%${search}%`,
          }).orWhere('user.email ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // Sorting logic
    if (sortBy === UserSortBy.ROLE) {
      const roleOrder = `CASE 
        WHEN user.role = '${Roles.SUPER_ADMIN}' THEN 1
        WHEN user.role = '${Roles.ADMIN}' THEN 2
        WHEN user.role = '${Roles.USER}' THEN 3
        ELSE 4
      END`;
      queryBuilder.orderBy(roleOrder, sortOrder);
    } else if (sortBy === UserSortBy.DELETED_AT) {
      // Soft-deleted users at bottom when sorting by deletedAt
      queryBuilder
        .orderBy('user.deletedAt', sortOrder, 'NULLS LAST')
        .addOrderBy('user.createdAt', SortOrder.DESC);
    } else {
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [items, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      page,
      pageSize: limit,
      total,
      totalPages,
    };
  }
}
