import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';
import { ReorderDto } from '../common/dto/reorder.dto';

@ApiTags('Admin Categories')
@ApiBearerAuth('access-token')
@Auth(AuthType.Bearer)
@Role(Roles.SUPER_ADMIN, Roles.ADMIN)
@Controller()
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get full category tree (admin)' })
  findAll() {
    return this.categoriesService.findTreeAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() dto: CreateCategoryDto, @Request() req: any) {
    return this.categoriesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    return this.categoriesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete category' })
  softDelete(@Param('id') id: string, @Request() req: any) {
    return this.categoriesService.softDelete(id, req.user.sub);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete category (must be soft-deleted first)' })
  hardDelete(@Param('id') id: string) {
    return this.categoriesService.hardDelete(id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder categories' })
  reorder(@Body() dto: ReorderDto, @Request() req: any) {
    return this.categoriesService.reorder(dto.items, req.user.sub);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload category image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.categoriesService.uploadImage(id, file, req.user.sub);
  }

  // ─── ATTRIBUTE DEFINITIONS ──────────────────────────────────────────────────

  @Get(':id/attributes')
  @ApiOperation({ summary: 'Get attribute definitions for category' })
  getAttributes(@Param('id') id: string) {
    return this.categoriesService.findAttributeDefinitions(id);
  }

  @Post(':id/attributes')
  @ApiOperation({ summary: 'Create attribute definition' })
  createAttribute(
    @Param('id') id: string,
    @Body() dto: CreateAttributeDefinitionDto,
    @Request() req: any,
  ) {
    return this.categoriesService.createAttributeDefinition(id, dto, req.user.sub);
  }

  @Patch(':id/attributes/:attrId')
  @ApiOperation({ summary: 'Update attribute definition' })
  updateAttribute(
    @Param('id') id: string,
    @Param('attrId') attrId: string,
    @Body() dto: UpdateAttributeDefinitionDto,
    @Request() req: any,
  ) {
    return this.categoriesService.updateAttributeDefinition(id, attrId, dto, req.user.sub);
  }

  @Delete(':id/attributes/:attrId')
  @ApiOperation({ summary: 'Delete attribute definition (also deletes product attribute values)' })
  deleteAttribute(
    @Param('id') id: string,
    @Param('attrId') attrId: string,
    @Request() req: any,
  ) {
    return this.categoriesService.deleteAttributeDefinition(id, attrId, req.user.sub);
  }

  @Patch(':id/attributes/reorder')
  @ApiOperation({ summary: 'Reorder attribute definitions' })
  reorderAttributes(
    @Param('id') id: string,
    @Body() dto: ReorderDto,
    @Request() req: any,
  ) {
    return this.categoriesService.reorderAttributeDefinitions(id, dto.items, req.user.sub);
  }
}
