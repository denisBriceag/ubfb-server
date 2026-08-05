import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';
import { SortOrder } from '@core/types/sorting-order.enum';
import { CountrySortBy } from '@features/country/enums/country-sort.enum';

export class FindManyCountriesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CountrySortBy)
  sortBy?: CountrySortBy;

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
