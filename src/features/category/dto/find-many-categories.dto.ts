import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';
import { SortOrder } from '@core/types/sorting-order.enum';
import { CategorySortBy } from '@features/category/enums/category-sort.enum';

export class FindManyCategoriesDto {
  @IsOptional()
  @Transform(({ value }): string | null | undefined =>
    value === 'null' ? null : (value as string | undefined),
  )
  @ValidateIf((dto: FindManyCategoriesDto) => dto.parentId !== null)
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(CategorySortBy)
  sortBy?: CategorySortBy;

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
  limit?: number = 50;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeDeleted?: boolean = false;
}
