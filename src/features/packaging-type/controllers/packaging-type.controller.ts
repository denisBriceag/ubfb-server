import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  ClassSerializerInterceptor,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { ActiveLanguage } from '@core/decorators/active-language.decorator';
import type { Language } from '@core/types/language';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { FEATURES } from '@core/constants';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';

import { PackagingTypeService } from '../services/packaging-type.service';
import { CreatePackagingTypeDto } from '../dto/create-packaging-type.dto';
import { UpdatePackagingTypeDto } from '../dto/update-packaging-type.dto';
import { FindManyPackagingTypesDto } from '../dto/find-many-packaging-types.dto';
import { PackagingType } from '../entities/packaging-type.entity';

const operations = getSwaggerOperations(FEATURES.PACKAGING_TYPE);

@ApiTags('Packaging Types')
@Controller('')
@Auth(AuthType.Bearer)
@UseInterceptors(ClassSerializerInterceptor)
export class PackagingTypeController {
  constructor(private readonly _packagingTypeService: PackagingTypeService) {}

  @Post()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.CREATE_NEW })
  @ApiResponse({ status: HttpStatus.CREATED, type: PackagingType })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'A packaging type with this code already exists. `PACKAGING_TYPE_CODE_TAKEN` means the holder is soft-deleted and should be restored instead.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async create(
    @Body() dto: CreatePackagingTypeDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<PackagingType> {
    return this._packagingTypeService.create(dto, currentUserId);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.GET_ALL,
    description:
      'Ordered alphabetically by the label in the `x-language` locale. Not paginated: the list is small by design.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PackagingType] })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findAll(
    @Query() dto: FindManyPackagingTypesDto,
    @ActiveLanguage() language: Language,
  ): Promise<PackagingType[]> {
    return this._packagingTypeService.findAll(dto, language);
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.GET_BY_ID,
    description:
      'Resolves soft-deleted types too, so a row from `?includeDeleted=true` can be inspected before it is restored. Check `deletedAt` to tell them apart.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PackagingType })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findOne(@Param('id') id: string): Promise<PackagingType> {
    return this._packagingTypeService.findOneById(id);
  }

  @Patch(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.UPDATE_BY_ID,
    description:
      'Requires the current `version`. `code` cannot be changed: it is the key the storefront filters on.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PackagingType })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Version mismatch — the record was modified by someone else',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePackagingTypeDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<PackagingType> {
    return this._packagingTypeService.update(id, dto, currentUserId);
  }

  @Delete(':id/soft')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: operations.SOFT_DELETE_BY_ID,
    description:
      'Hides the type from the storefront. Products keep the foreign key but their packaging line reads as null until it is restored — check `productCount` before calling.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async softDelete(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<void> {
    return this._packagingTypeService.softDelete(id, currentUserId);
  }

  @Patch(':id/restore')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.RESTORE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async restore(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<void> {
    return this._packagingTypeService.restore(id, currentUserId);
  }

  @Delete(':id/hard')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.HARD_DELETE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Packaging type is still referenced by products',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this._packagingTypeService.hardDelete(id);
  }
}
