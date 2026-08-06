import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async create(@Body() dto: CreatePackagingTypeDto): Promise<PackagingType> {
    return this._packagingTypeService.create(dto);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_ALL })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findAll(): Promise<PackagingType[]> {
    return this._packagingTypeService.findAll();
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_BY_ID })
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
  @ApiOperation({ summary: operations.UPDATE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PackagingType })
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
  ): Promise<PackagingType> {
    return this._packagingTypeService.update(id, dto);
  }

  @Delete(':id')
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
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async delete(@Param('id') id: string): Promise<void> {
    return this._packagingTypeService.delete(id);
  }
}
