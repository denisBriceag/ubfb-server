import {
  Body,
  Controller,
  FileTypeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { S3Service } from '../services/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Images } from '@core/types/images';
import { ApiTags } from '@nestjs/swagger';
import { multerMemoryStorage } from '../configs/multer.config';
import { AuthType } from '../../authentication/types/auth-type.enum';
import { Auth } from '../../authentication/decorators/auth.decorator';

@ApiTags('S3')
@Auth(AuthType.None)
@Controller('')
export class S3Controller {
  constructor(private readonly _s3Service: S3Service) {}

  @Post('temp-upload/:feature')
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
  ) {
    const tempUrl = await this._s3Service.uploadTempImage(file, feature);

    return { tempUrl };
  }

  @Post('upload/:feature')
  async upload(
    @Body() { url }: { url: string },
    @Param('feature') feature: string,
  ): Promise<Images> {
    return await this._s3Service.promoteTempImage(url, feature);
  }
}
