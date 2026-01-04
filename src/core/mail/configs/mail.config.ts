import { registerAs } from '@nestjs/config';

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromAddress: string;
};

export const MAIL_CONFIG_KEY = 'mail';

export const mailConfig = registerAs<MailConfig>(MAIL_CONFIG_KEY, () => ({
  host: process.env.MAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: false,
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  fromName: process.env.MAIL_FROM_NAME || 'UBFB Server',
  fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@ubfb.md',
}));
