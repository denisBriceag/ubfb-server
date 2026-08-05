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

import { CountryService } from '../services/country.service';
import { CreateCountryDto } from '../dto/create-country.dto';
import { UpdateCountryDto } from '../dto/update-country.dto';
import { FindManyCountriesDto } from '../dto/find-many-countries.dto';
import { SearchCountriesDto } from '../dto/search-countries.dto';
import { CountrySuggestion } from '../models/country-suggestion.model';
import { Country } from '../entities/country.entity';

const operations = getSwaggerOperations(FEATURES.COUNTRY);

@ApiTags('Countries')
@Controller('')
@Auth(AuthType.Bearer)
@UseInterceptors(ClassSerializerInterceptor)
export class CountryController {
  constructor(private readonly _countryService: CountryService) {}

  @Post()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.CREATE_NEW })
  @ApiResponse({ status: HttpStatus.CREATED, type: Country })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async create(
    @Body() dto: CreateCountryDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Country> {
    return this._countryService.create(dto, currentUserId);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_ALL_WITH_PAG })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findMany(@Query() dto: FindManyCountriesDto): Promise<PaginatedData<Country>> {
    return this._countryService.findMany(dto);
  }

  // Must stay above `@Get(':id')`: Nest matches routes in declaration order,
  // so moving it below would make `/countries/search` resolve as an id.
  @Get('search')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: 'Search countries in the external provider' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiResponse({ status: HttpStatus.BAD_GATEWAY, description: 'Countries provider is unavailable' })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async search(@Query() dto: SearchCountriesDto): Promise<CountrySuggestion[]> {
    return this._countryService.search(dto);
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Country })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findOne(@Param('id') id: string): Promise<Country> {
    return this._countryService.findOneById(id);
  }

  @Patch(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE_BY_ID })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Country })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCountryDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Country> {
    return this._countryService.update(id, dto, currentUserId);
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
    return this._countryService.softDelete(id, currentUserId);
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
    return this._countryService.restore(id, currentUserId);
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
    return this._countryService.hardDelete(id);
  }
}
