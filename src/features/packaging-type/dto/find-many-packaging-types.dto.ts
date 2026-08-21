import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '@core/decorators/to-boolean.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindManyPackagingTypesDto {
  /**
   * `@IsBoolean()` is not optional here: `ToBoolean` passes values it does
   * not recognise through untouched precisely so this rejects them. Without
   * it `?includeDeleted=nope` survives validation as a truthy string and
   * returns soft-deleted types to a request that asked for the opposite.
   * */
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Include soft-deleted packaging types in the list.',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeDeleted?: boolean = false;
}
