import { Controller, Get, HttpStatus } from '@nestjs/common';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  getSwaggerOperations,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { Maps } from '@features/maps/entities/maps.entity';
import { MapsService } from '@features/maps/services/maps.service';
import { FEATURES } from '@core/constants';

const operations = getSwaggerOperations(FEATURES.MAPS);

@ApiTags('Maps')
@Controller('')
export class MapsPublicController {
  constructor(private readonly _mapsService: MapsService) {}

  @Get()
  @Auth(AuthType.None)
  @ApiOperation({
    summary: operations.GET_ALL,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.GET_ALL_SUCCESS,
  })
  async getCoords(): Promise<Maps> {
    return this._mapsService.getCoords();
  }
}
