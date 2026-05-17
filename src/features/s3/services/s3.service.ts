import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/constants';

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import sharp from 'sharp';
import s3Config from '../configs/s3.config';

const MINIMUM_IMAGE_WIDTH = 1000;

@Injectable()
export class S3Service {
  private readonly _logger = new Logger(S3Service.name);
  private readonly _s3Client: S3Client;

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

  isTempUrl(url: string): boolean {
    return url.includes(this._s3Config.bucket_name_temp);
  }

  async resolveImage(
    incoming: string | null | undefined,
    existing: string | null,
    feature: string,
  ): Promise<string | null> {
    if (incoming === undefined) return existing;

    if (incoming === null) {
      if (existing) await this.deleteImages([existing]);

      return null;
    }

    if (this.isTempUrl(incoming)) {
      if (existing) await this.deleteImages([existing]);

      return this.promoteTempImage(incoming, feature);
    }

    return incoming;
  }

  async uploadTempImage(
    file: Express.Multer.File,
    feature: string,
  ): Promise<string> {
    const metadata = await sharp(file.buffer).metadata();

    if (!metadata.width) {
      throw new NotAcceptableException({
        message: ErrorsEnum.IMAGE_WITHOUT_WIDTH,
        errorCode: ERROR_MAP.IMAGE_WITHOUT_WIDTH,
      });
    }

    if (metadata.width < MINIMUM_IMAGE_WIDTH) {
      throw new NotAcceptableException({
        message: ERROR_MESSAGES.imageMinimumWidth(MINIMUM_IMAGE_WIDTH),
        errorCode: ERROR_MAP.IMAGE_MINIMUM_WIDTH,
      });
    }

    if (file.originalname.split('.').length > 2) {
      throw new NotAcceptableException({
        message: ErrorsEnum.IMAGE_NO_DOTS,
        errorCode: ERROR_MAP.IMAGE_NO_DOTS,
      });
    }

    const key = `${feature}/${crypto.randomUUID()}-${file.originalname.replace(/\s/g, '')}`;

    await this._uploadToS3(
      this._s3Config.bucket_name_temp,
      key,
      file.buffer,
      file.mimetype,
    );

    return `https://${this._s3Config.bucket_name_temp}.s3.${this._s3Config.region}.amazonaws.com/${key}`;
  }

  async promoteTempImage(tempUrl: string, feature: string): Promise<string> {
    const sourceKey = new URL(tempUrl).pathname.slice(1);
    const destKey = `${feature}/${crypto.randomUUID()}/${path.basename(sourceKey)}`;

    try {
      await this._s3Client.send(
        new CopyObjectCommand({
          Bucket: this._s3Config.bucket_name,
          CopySource: `${this._s3Config.bucket_name_temp}/${sourceKey}`,
          Key: destKey,
        }),
      );
    } catch {
      throw new InternalServerErrorException({
        message: ErrorsEnum.S3_UPLOAD_FAILED,
        errorCode: ERROR_MAP.S3_UPLOAD_FAILED,
      });
    }

    try {
      await this._s3Client.send(
        new DeleteObjectCommand({
          Bucket: this._s3Config.bucket_name_temp,
          Key: sourceKey,
        }),
      );
    } catch {
      this._logger.warn(
        `Failed to delete temp image after promotion: ${sourceKey}`,
      );
    }

    return `${this._s3Config.cloudfront_url}/${destKey}`;
  }

  async deleteImages(urls: string[]): Promise<void> {
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      const bucket = url.includes(this._s3Config.bucket_name_temp)
        ? this._s3Config.bucket_name_temp
        : this._s3Config.bucket_name;

      try {
        await this._s3Client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
      } catch {
        this._logger.warn(`Failed to delete image: ${key}`);
      }
    }
  }

  private async _uploadToS3(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      await this._s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch {
      throw new InternalServerErrorException({
        message: ErrorsEnum.S3_UPLOAD_FAILED,
        errorCode: ERROR_MAP.S3_UPLOAD_FAILED,
      });
    }
  }
}
