import { Module } from '@nestjs/common';
import { ContactsService } from '@features/contacts/services/contacts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '@features/contacts/entities/contacts.entity';
import { UserModule } from '@features/user/user.module';
import { Domains } from '@core/types/domains.enum';
import { DOMAIN } from '@core/constants/domain';
import { ContactsController } from '@features/contacts/controllers/contacts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), UserModule],
  providers: [
    ContactsService,
    {
      provide: DOMAIN,
      useValue: Domains.ADMIN,
    },
  ],
  controllers: [ContactsController],
})
export class ContactsAdminModule {}
