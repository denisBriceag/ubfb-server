import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ClassSerializerInterceptor,
  HttpCode,
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
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';

import { BrandService } from '../services/brand.service';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { FindManyBrandsDto } from '../dto/find-many-brands.dto';
import { Brand } from '../entities/brand.entity';

const operations = getSwaggerOperations(FEATURES.BRAND);

@ApiTags('Brands')
@Controller('')
@Auth(AuthType.Bearer)
@UseInterceptors(ClassSerializerInterceptor)
export class BrandController {
  constructor(private readonly _brandService: BrandService) {}

  @Post()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.CREATE_NEW })
  @ApiResponse({ status: HttpStatus.CREATED, type: Brand })
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
    @Body() dto: CreateBrandDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Brand> {
    return this._brandService.create(dto, currentUserId);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_ALL_WITH_PAG })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findMany(
    @Query() dto: FindManyBrandsDto,
  ): Promise<PaginatedData<Brand>> {
    return this._brandService.findMany(dto);
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Brand })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findOne(@Param('id') id: string): Promise<Brand> {
    return this._brandService.findOneById(id);
  }

  @Patch(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Brand })
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
    @Body() dto: UpdateBrandDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Brand> {
    return this._brandService.update(id, dto, currentUserId);
  }

  @Delete(':id/soft')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.SOFT_DELETE_BY_ID })
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
    return this._brandService.softDelete(id, currentUserId);
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
    return this._brandService.restore(id, currentUserId);
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
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this._brandService.hardDelete(id);
  }
}
