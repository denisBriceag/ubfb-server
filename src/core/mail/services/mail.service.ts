import { Inject, Injectable } from '@nestjs/common';
import { mailConfig } from '@core/mail/configs/mail.config';
import type { ConfigType } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailSubject } from '@core/mail/enums/mail-subject.enum';

@Injectable()
export class MailService {
  constructor(
    private readonly _mailerService: MailerService,
    @Inject(mailConfig.KEY)
    private readonly _config: ConfigType<typeof mailConfig>,
  ) {}

  sendPasswordResetEmail(emailTo: string): Promise<void> {
    return this._mailerService.sendMail({
      to: emailTo,
      from: this._config.fromName,
      subject: EmailSubject.PASSWORD_RESET,
      text: EmailSubject.PASSWORD_RESET,
    });
  }
}
