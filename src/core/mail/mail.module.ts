import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { MailConfig, mailConfig } from '@core/mail/configs/mail.config';
import { MailService } from './services/mail.service';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
  imports: [
    ConfigModule.forFeature(mailConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule.forFeature(mailConfig)],
      inject: [mailConfig.KEY],
      useFactory: (mailConfig: MailConfig) => ({
        transport: {
          host: mailConfig.host,
          port: mailConfig.port,
          secure: mailConfig.secure,
          auth: {
            user: mailConfig.user,
            pass: mailConfig.password,
          },
        },
        defaults: {
          from: `"${mailConfig.fromName}" <${mailConfig.fromAddress}>`,
        },
      }),
    }),
  ],
})
export class MailModule {}
