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
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { FEATURES } from '@core/constants';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';

import { ProductCollectionService } from '../services/product-collection.service';
import { CreateProductCollectionDto } from '../dto/create-product-collection.dto';
import { UpdateProductCollectionDto } from '../dto/update-product-collection.dto';
import { AddCollectionItemDto } from '../dto/add-collection-item.dto';
import { ProductCollection } from '../entities/product-collection.entity';
import { ProductCollectionItem } from '../entities/product-collection-item.entity';

const operations = getSwaggerOperations(FEATURES.PRODUCT_COLLECTION);

@ApiTags('Product Collections')
@Controller('')
@Auth(AuthType.Bearer)
@UseInterceptors(ClassSerializerInterceptor)
export class ProductCollectionController {
  constructor(private readonly _collectionService: ProductCollectionService) {}

  @Post()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.CREATE_NEW })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductCollection })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async create(
    @Body() dto: CreateProductCollectionDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<ProductCollection> {
    return this._collectionService.create(dto, currentUserId);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_ALL })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findAll(): Promise<ProductCollection[]> {
    return this._collectionService.findAll();
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCollection })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findOne(@Param('id') id: string): Promise<ProductCollection> {
    return this._collectionService.findOneById(id);
  }

  @Patch(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCollection })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCollectionDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<ProductCollection> {
    return this._collectionService.update(id, dto, currentUserId);
  }

  @Delete(':id/soft')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.SOFT_DELETE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async softDelete(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<void> {
    return this._collectionService.softDelete(id, currentUserId);
  }

  @Patch(':id/restore')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.RESTORE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async restore(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<void> {
    return this._collectionService.restore(id, currentUserId);
  }

  @Delete(':id/hard')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.HARD_DELETE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this._collectionService.hardDelete(id);
  }

  @Post(':id/items')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: 'Add product to collection' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductCollectionItem })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async addItem(
    @Param('id') collectionId: string,
    @Body() dto: AddCollectionItemDto,
  ): Promise<ProductCollectionItem> {
    return this._collectionService.addItem(collectionId, dto);
  }

  @Delete(':id/items/:productId')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove product from collection' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async removeItem(
    @Param('id') collectionId: string,
    @Param('productId') productId: string,
  ): Promise<void> {
    return this._collectionService.removeItem(collectionId, productId);
  }
}
