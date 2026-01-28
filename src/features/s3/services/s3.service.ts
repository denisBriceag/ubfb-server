import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/constants';
import { Images } from '@core/types/images';
import { ImageSet } from '../types/image-set';
import { Readable } from 'stream';

import * as crypto from 'node:crypto';
import sharp from 'sharp';
import s3Config from '../configs/s3.config';

@Injectable()
export class S3Service {
  private readonly _s3Client: S3Client;
  private readonly _sizes: ImageSet[] = [
    { width: 320, label: 'phone_small' },
    { width: 480, label: 'phone_portrait' },
    { width: 640, label: 'phone_landscape' },
    { width: 768, label: 'tablets_portrait' },
    { width: 1024, label: 'tablets_landscape' },
    { width: 1280, label: 'desktop' },
  ];

  constructor(
    @Inject(s3Config.KEY)
    private readonly _s3Config: ConfigType<typeof s3Config>,
  ) {
    this._s3Client = new S3Client({
      credentials: {
        accessKeyId: this._s3Config.access_key,
        secretAccessKey: this._s3Config.secret_key,
      },
      region: this._s3Config.region,
    });
  }

  async uploadTempImage(
    file: Express.Multer.File,
    feature: string,
  ): Promise<string> {
    const metadata = await sharp(file.buffer).metadata();
    const minimumImageWidth =
      this._sizes.find((s) => s.label === 'desktop')?.width ?? 1280;

    if (!metadata.width) {
      throw new NotAcceptableException({
        message: ErrorsEnum.IMAGE_WITHOUT_WIDTH,
        errorCode: ERROR_MAP.IMAGE_WITHOUT_WIDTH,
      });
    }

    if (metadata.width < minimumImageWidth) {
      throw new NotAcceptableException({
        message: ERROR_MESSAGES.imageMinimumWidth(minimumImageWidth),
        errorCode: ERROR_MAP.IMAGE_MINIMUM_WIDTH,
      });
    }

    if (file?.originalname.split('.').length > 2) {
      throw new NotAcceptableException({
        message: ErrorsEnum.IMAGE_NO_DOTS,
        errorCode: ERROR_MAP.IMAGE_NO_DOTS,
      });
    }

    let key = `${feature}/${crypto.randomUUID()}-${file?.originalname.replace(/\s/g, '')}`;

    await this._uploadToS3(
      this._s3Config.bucket_name_temp,
      key,
      file?.buffer,
      file.mimetype,
    );

    return `https://${this._s3Config.bucket_name_temp}.s3.${this._s3Config.region}.amazonaws.com/${key}`;
  }

  async promoteTempImage(tempUrl: string, feature: string): Promise<Images> {
    const url = new URL(tempUrl);
    const key = url.pathname.slice(1);

    const buffer = await this._getBufferFromS3(
      this._s3Config.bucket_name_temp,
      key,
    );

    /**
     * At this point we surely know that the image has had metadata with width property
     * since it passed validation in the uploadTempImage method
     * */
    const metadata = (await sharp(buffer).metadata()) as { width: number };

    const file: Express.Multer.File = {
      originalname: key.split('/').pop() || '',
      buffer,
      mimetype: 'image/jpeg',
      fieldname: '',
      size: buffer.length,
      stream: Readable.from(buffer),
      destination: '',
      filename: '',
      path: '',
      encoding: '7bit',
    };

    return this._processAndUploadImage(file, metadata.width, feature);
  }

  async deleteImageWithSrcset<T extends { src: string; srcset: string[] }>(
    entity: T,
  ): Promise<void> {
    const keys = [entity.src, ...entity.srcset].map((url) => {
      const path = new URL(url).pathname;

      return path.startsWith('/') ? path.slice(1) : path;
    });

    for (const key of keys) {
      await this._s3Client.send(
        new DeleteObjectCommand({
          Bucket: this._s3Config.bucket_name,
          Key: key,
        }),
      );
    }
  }

  private async _processAndUploadImage(
    file: Express.Multer.File,
    originalWidth: number,
    folder: string,
  ): Promise<Images> {
    const subFolder = `${crypto.randomUUID()}`;
    const originalName = `${crypto.randomUUID()}-${file.originalname.replace(/\s/g, '')}`;
    const baseName = originalName.split('.')[0];
    const extension = originalName.split('.')[1];
    const keyPrefix = `${folder}/${subFolder}/${baseName}`;
    const contentType = 'image/jpeg';
    const originalKey = `${keyPrefix}-original.${extension}`;
    const sizes = this.getValidSizes(originalWidth);

    await this._uploadToS3(
      this._s3Config.bucket_name,
      originalKey,
      file.buffer,
      contentType,
    );

    const src = `${this._s3Config.cloudfront_url}/${originalKey}`;
    const srcset: string[] = [];

    for (const size of sizes) {
      const resizedBuffer = await sharp(file.buffer)
        .resize(size.width)
        .toBuffer();
      const key = `${keyPrefix}-${size.label}.${extension}`;

      await this._uploadToS3(
        this._s3Config.bucket_name,
        key,
        resizedBuffer,
        contentType,
      );

      srcset.push(`${this._s3Config.cloudfront_url}/${key} ${size.width}w`);
    }

    return { src, srcset };
  }

  private getValidSizes(originalWidth: number): ImageSet[] {
    return this._sizes.filter((size) => originalWidth >= size.width);
  }

  private async _uploadToS3(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this._s3Client.send(command);
    } catch (error) {
      throw new InternalServerErrorException({
        message: ErrorsEnum.S3_UPLOAD_FAILED,
        errorCode: ERROR_MAP.S3_UPLOAD_FAILED,
      });
    }
  }

  private async _getBufferFromS3(bucket: string, key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this._s3Client.send(command);

    if (!response.Body || !(response.Body instanceof Readable)) {
      throw new InternalServerErrorException(ErrorsEnum.S3_READ_FAILED);
    }

    return await this._streamToBuffer(response.Body);
  }

  private async _streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
