import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { CreateVolumeUnitDto } from './dto/create-volume-unit.dto';
import { UpdateVolumeUnitDto } from './dto/update-volume-unit.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@ApiTags('Admin Catalog')
@ApiBearerAuth('access-token')
@Auth(AuthType.Bearer)
@Role(Roles.SUPER_ADMIN, Roles.ADMIN)
@Controller()
export class CatalogAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  // ─── VOLUME UNITS ───────────────────────────────────────────────────────────

  @Get('volume-units')
  @ApiOperation({ summary: 'Get all volume units (admin)' })
  getVolumeUnits() {
    return this.catalogService.findAllVolumeUnitsAdmin();
  }

  @Post('volume-units')
  @ApiOperation({ summary: 'Create volume unit' })
  createVolumeUnit(@Body() dto: CreateVolumeUnitDto, @Request() req: any) {
    return this.catalogService.createVolumeUnit(dto, req.user.sub);
  }

  @Patch('volume-units/:id')
  @ApiOperation({ summary: 'Update volume unit' })
  updateVolumeUnit(
    @Param('id') id: string,
    @Body() dto: UpdateVolumeUnitDto,
    @Request() req: any,
  ) {
    return this.catalogService.updateVolumeUnit(id, dto, req.user.sub);
  }

  @Delete('volume-units/:id')
  @ApiOperation({ summary: 'Soft delete volume unit' })
  softDeleteVolumeUnit(@Param('id') id: string, @Request() req: any) {
    return this.catalogService.softDeleteVolumeUnit(id, req.user.sub);
  }

  @Delete('volume-units/:id/hard')
  @ApiOperation({ summary: 'Hard delete volume unit' })
  hardDeleteVolumeUnit(@Param('id') id: string) {
    return this.catalogService.hardDeleteVolumeUnit(id);
  }

  // ─── COUNTRIES ──────────────────────────────────────────────────────────────

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries (admin)' })
  getCountries() {
    return this.catalogService.findAllCountriesAdmin();
  }

  @Post('countries')
  @ApiOperation({ summary: 'Create country' })
  createCountry(@Body() dto: CreateCountryDto, @Request() req: any) {
    return this.catalogService.createCountry(dto, req.user.sub);
  }

  @Patch('countries/:id')
  @ApiOperation({ summary: 'Update country' })
  updateCountry(
    @Param('id') id: string,
    @Body() dto: UpdateCountryDto,
    @Request() req: any,
  ) {
    return this.catalogService.updateCountry(id, dto, req.user.sub);
  }

  @Delete('countries/:id')
  @ApiOperation({ summary: 'Soft delete country' })
  softDeleteCountry(@Param('id') id: string, @Request() req: any) {
    return this.catalogService.softDeleteCountry(id, req.user.sub);
  }

  @Delete('countries/:id/hard')
  @ApiOperation({ summary: 'Hard delete country' })
  hardDeleteCountry(@Param('id') id: string) {
    return this.catalogService.hardDeleteCountry(id);
  }
}
