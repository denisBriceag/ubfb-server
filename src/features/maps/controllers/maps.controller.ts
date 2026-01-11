import { Controller, Get, Post, Patch, Body, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Maps } from '../entities/maps.entity';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { Roles } from '@core/types/roles.enum';
import { FEATURES } from '@core/constants';

import { MapsService } from '../services/maps.service';
import { CreateMapsCoordsDto } from '../dto/create-maps-coords.dto';
import { UpdateMapsCoords } from '../dto/update-maps-coords';
import { AuthType } from '@core/types/auth-type.enum';
import { Auth } from '@core/decorators/auth.decorator';
import { Role } from '@core/decorators/role.decorator';
import { ActiveUser } from '@core/decorators/active-user.decorator';

const operations = getSwaggerOperations(FEATURES.MAPS);

@ApiTags('Maps')
@Controller('')
export class MapsController {
  constructor(private readonly _mapsService: MapsService) {}

  @Post()
  @Auth(AuthType.Bearer)
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.CREATE_NEW,
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
  async createCoords(
    @Body() createMapsCoordsDto: CreateMapsCoordsDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Maps> {
    return this._mapsService.create(createMapsCoordsDto, currentUserId);
  }

  @Get()
  @Auth(AuthType.None)
  @ApiOperation({
    summary: operations.GET_ALL,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.CREATE_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  async getCoords(): Promise<Maps> {
    return this._mapsService.getCoords();
  }

  @Patch()
  @Auth(AuthType.Bearer)
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.UPDATE_SUCCESS,
    type: Maps,
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
  async updateCoords(
    @Body() updateMapsCoords: UpdateMapsCoords,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Maps> {
    return this._mapsService.update(updateMapsCoords, currentUserId);
  }
}
