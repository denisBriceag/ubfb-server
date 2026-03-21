import { BadRequestException, Injectable } from '@nestjs/common';
import { S3Service } from '@features/s3/services/s3.service';

@Injectable()
export class UploadsService {
  private readonly allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Upload files to S3 and return their permanent CloudFront URLs.
   * entity param is used as the S3 folder prefix (e.g. 'brands', 'categories', 'products').
   */
  async saveFiles(
    entity: string,
    _id: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      if (!this.allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP allowed.`,
        );
      }

      const tempUrl = await this.s3Service.uploadTempImage(file, entity);
      const images = await this.s3Service.promoteTempImage(tempUrl, entity);
      urls.push(images.src);
    }

    return urls;
  }

  /**
   * Delete a single image from S3 by its src URL.
   */
  async deleteFile(src: string): Promise<void> {
    await this.s3Service.deleteImageWithSrcset({ src, srcset: [] });
  }

  /**
   * Delete all images for an entity/id from S3.
   * No-op here — S3 doesn't have folders; individual files are deleted via deleteFile().
   */
  async deleteFolder(_entity: string, _id: string): Promise<void> {
    // Individual product images are deleted one-by-one via deleteFile() before hard delete.
  }
}
