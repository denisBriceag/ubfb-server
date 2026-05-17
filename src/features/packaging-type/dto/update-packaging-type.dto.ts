import { PartialType } from '@nestjs/swagger';
import { CreatePackagingTypeDto } from './create-packaging-type.dto';

export class UpdatePackagingTypeDto extends PartialType(CreatePackagingTypeDto) {}
