import { registerAs } from '@nestjs/config';
import * as process from 'node:process';
export const S3_CONFIG_KEY = 's3';

export default registerAs(S3_CONFIG_KEY, () => {
  return {
    access_key: process.env.AWS_ACCESS_KEY_ID || '',
    secret_key: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_S3_REGION || '',
    bucket_name: process.env.AWS_BUCKET || '',
    bucket_name_temp: process.env.AWS_BUCKET_TEMP || '',
    cloudfront_url: process.env.AWS_CLOUDFRONT_URL || '',
  };
});
