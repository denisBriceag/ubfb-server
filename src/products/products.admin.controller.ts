import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetAttributeDto } from './dto/set-attribute.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IntersectionType } from '@nestjs/mapped-types';

class AdminProductsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  withDeleted?: boolean;
}

@ApiTags('Admin Products')
@ApiBearerAuth('access-token')
@Auth(AuthType.Bearer)
@Role(Roles.SUPER_ADMIN, Roles.ADMIN)
@Controller()
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products (admin)' })
  findAll(@Query() query: AdminProductsQueryDto) {
    return this.productsService.findAllAdmin(
      { isActive: query.isActive, withDeleted: query.withDeleted },
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id (admin)' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  create(@Body() dto: CreateProductDto, @Request() req: any) {
    return this.productsService.create(dto, req.user.sub);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder products' })
  reorder(@Body() dto: ReorderDto, @Request() req: any) {
    return this.productsService.reorder(dto.items, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: any,
  ) {
    return this.productsService.update(id, dto, req.user.sub);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle product isActive' })
  toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.productsService.toggleActive(id, req.user.sub);
  }

  @Patch(':id/new')
  @ApiOperation({ summary: 'Toggle product isNew' })
  toggleNew(@Param('id') id: string, @Request() req: any) {
    return this.productsService.toggleNew(id, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete product' })
  softDelete(@Param('id') id: string, @Request() req: any) {
    return this.productsService.softDelete(id, req.user.sub);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete product (must be soft-deleted first)' })
  hardDelete(@Param('id') id: string) {
    return this.productsService.hardDelete(id);
  }

  // ─── IMAGES ────────────────────────────────────────────────────────────────

  @Post(':id/images')
  @ApiOperation({ summary: 'Upload product images (max 5, 5MB each)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  addImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    return this.productsService.addImages(id, files, req.user.sub);
  }

  @Patch(':id/images/reorder')
  @ApiOperation({ summary: 'Reorder product images' })
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderDto,
    @Request() req: any,
  ) {
    return this.productsService.reorderImages(id, dto.items, req.user.sub);
  }

  @Patch(':id/images/:imageId')
  @ApiOperation({ summary: 'Update product image (alt, sortOrder)' })
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
    @Request() req: any,
  ) {
    return this.productsService.updateImage(id, imageId, dto, req.user.sub);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete product image' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
  ) {
    return this.productsService.deleteImage(id, imageId, req.user.sub);
  }

  // ─── ATTRIBUTES ────────────────────────────────────────────────────────────

  @Post(':id/attributes')
  @ApiOperation({ summary: 'Set product attributes (upsert batch)' })
  setAttributes(
    @Param('id') id: string,
    @Body() dto: SetAttributeDto[],
    @Request() req: any,
  ) {
    return this.productsService.setAttributes(id, dto, req.user.sub);
  }

  @Delete(':id/attributes/:attributeDefinitionId')
  @ApiOperation({ summary: 'Delete product attribute' })
  deleteAttribute(
    @Param('id') id: string,
    @Param('attributeDefinitionId') attributeDefinitionId: string,
    @Request() req: any,
  ) {
    return this.productsService.deleteAttribute(id, attributeDefinitionId, req.user.sub);
  }
}
