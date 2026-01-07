import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@core/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
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
  private readonly _nonPasswordColumns: (keyof Omit<User, 'password'>)[] = [
    'id',
    'version',
    'email',
    'name',
    'role',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'updatedBy',
  ];

  constructor(
    @InjectRepository(User) private readonly _userRepository: Repository<User>,
    private readonly _hashingService: HashingService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    updatedBy: User['updatedBy'] = null,
    withPassword = false,
  ): Promise<User> {
    const hashedPassword = await this._hashingService.hash(
      createUserDto.password,
    );

    try {
      const user = await this._userRepository
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email: createUserDto.email,
          name: createUserDto.name,
          password: hashedPassword,
          role: createUserDto.role,
          updatedBy,
        })
        .returning(withPassword ? '*' : this._nonPasswordColumns)
        .execute();

      return user.raw[0];
    } catch (error) {
      if (error.code === ErrorsEnum.PG_UNIQUE_VIOLATION) {
        throw new ConflictException({
          message: ErrorsEnum.GENERIC_CONFLICT_EXCEPTION,
          errorCode: ERROR_MAP.GENERIC_CONFLICT_EXCEPTION,
        });
      }

      throw error;
    }
  }

  async softDelete(
    id: User['id'],
    updatedBy: User['updatedBy'],
  ): Promise<void> {
    const result = await this._userRepository
      .createQueryBuilder()
      .update(User)
      .set({ updatedBy })
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    await this._userRepository
      .createQueryBuilder()
      .softDelete()
      .from(User)
      .where('id = :id', { id })
      .execute();
  }

  async hardDelete(id: User['id']): Promise<void> {
    const result = await this._userRepository
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
    updatedBy: User['updatedBy'],
    currentRole: User['role'],
  ): Promise<User> {
    const updateData: Partial<User> = { ...updateUserDto, updatedBy };

    if (
      currentRole === Roles.USER ||
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

    const result = await this._userRepository
      .createQueryBuilder()
      .update(User)
      .set(updateData)
      .where('id = :id', { id })
      .returning(this._nonPasswordColumns)
      .execute()
      .catch((error) => {
        if (error instanceof OptimisticLockVersionMismatchError) {
          throw new ConflictException({
            message: ErrorsEnum.VERSION_MISMATCH,
            errorCode: ERROR_MAP.VERSION_MISMATCH,
          });
        }

        throw error;
      });

    if (result.affected === 0) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.notFound('id', id, 'user'),
        errorCode: ERROR_MAP.INVALID_ID,
      });
    }

    const user = result.raw[0];

    user.updater = await this._userRepository.findOne({
      where: { id: updatedBy as string },
      select: ['id', 'email'],
    });

    return user;
  }

  async findOneById(id: User['id']): Promise<User> {
    const queryBuilder = this._userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoin('user.updater', 'updater')
      .addSelect(['updater.id', 'updater.email'])
      .where('user.id = :id', { id });

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
    const page = dto?.page ?? this._defaultPage;
    const limit = dto?.limit ?? this._defaultLimit;

    const queryBuilder = this._userRepository
      .createQueryBuilder('user')
      .withDeleted() // Include soft-deleted users
      .leftJoin('user.updater', 'updater')
      .addSelect(['updater.id', 'updater.email']);

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
