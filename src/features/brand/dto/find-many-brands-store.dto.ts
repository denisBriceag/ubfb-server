import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * No `sortBy`/`sortOrder`: the storefront never re-orders brands. It reads
 * them alphabetically to build product filters, so the ordering is fixed
 * server-side and stays consistent across clients.
 * */
export class FindManyBrandsStoreDto {
  @IsOptional()
  @IsString()
  search?: string;

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
}
