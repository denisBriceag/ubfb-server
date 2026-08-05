import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SortOrder } from '@core/types/sorting-order.enum';
import { Type } from 'class-transformer';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';

export enum UserSortBy {
  NAME = 'name',
  EMAIL = 'email',
  ROLE = 'role',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  DELETED_AT = 'deletedAt',
}

export class FindManyUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy?: UserSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @ToBoolean()
  includeDeleted?: boolean = false;
}
