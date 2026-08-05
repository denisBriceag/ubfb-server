import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';

export class FindManyProductCollectionsDto {
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeDeleted?: boolean = false;
}
