import {
  Body,
  Controller,
  FileTypeValidator,
  HttpStatus,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { S3Service } from '../services/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Images } from '@core/types/images';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { multerMemoryStorage } from '../configs/multer.config';
import { AuthType } from '@core/types/auth-type.enum';
import { Auth } from '@core/decorators/auth.decorator';
import { TempImage } from '@features/s3/types/temp-image';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { FEATURES } from '@core/constants';
import { Role } from '@core/decorators/role.decorator';
import { Roles } from '@core/types/roles.enum';
import { CreateImageDto } from '@features/s3/dto/create-image.dto';

const operations = getSwaggerOperations(FEATURES.FILE);

@ApiTags('S3')
@Auth(AuthType.Bearer)
@Controller('')
export class S3Controller {
  constructor(private readonly _s3Service: S3Service) {}

  @Post('temp-upload/:feature')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
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
  @UseInterceptors(FileInterceptor('file', multerMemoryStorage))
  async uploadTemp(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/webp|image\/png)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Param('feature') feature: string,
  ): Promise<TempImage> {
    const tempUrl = await this._s3Service.uploadTempImage(file, feature);

    return { tempUrl };
  }

  @Post('upload/:feature')
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
  async upload(
    @Body() { url }: CreateImageDto,
    @Param('feature') feature: string,
  ): Promise<Images> {
    return await this._s3Service.promoteTempImage(url, feature);
  }
}
