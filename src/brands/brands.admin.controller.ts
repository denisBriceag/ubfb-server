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
import { BrandsService } from './brands.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ReorderDto } from '../common/dto/reorder.dto';

@ApiTags('Admin Brands')
@ApiBearerAuth('access-token')
@Auth(AuthType.Bearer)
@Role(Roles.SUPER_ADMIN, Roles.ADMIN)
@Controller()
export class BrandsAdminController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands (admin)' })
  findAll() {
    return this.brandsService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id' })
  findOne(@Param('id') id: string) {
    return this.brandsService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create brand' })
  create(@Body() dto: CreateBrandDto, @Request() req: any) {
    return this.brandsService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @Request() req: any,
  ) {
    return this.brandsService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete brand' })
  softDelete(@Param('id') id: string, @Request() req: any) {
    return this.brandsService.softDelete(id, req.user.sub);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete brand (must be soft-deleted first)' })
  hardDelete(@Param('id') id: string) {
    return this.brandsService.hardDelete(id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder brands' })
  reorder(@Body() dto: ReorderDto, @Request() req: any) {
    return this.brandsService.reorder(dto.items, req.user.sub);
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload brand logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.brandsService.uploadLogo(id, file, req.user.sub);
  }
}
