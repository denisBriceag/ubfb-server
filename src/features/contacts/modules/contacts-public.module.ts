import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '@features/contacts/entities/contacts.entity';
import { Domains } from '@core/types/domains.enum';
import { ContactsService } from '@features/contacts/services/contacts.service';
import { DOMAIN } from '@core/constants/domain';
import { ContactsPublicController } from '@features/contacts/controllers/contacts-public.controller';
import { UserModule } from '@features/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), UserModule],
  providers: [
    ContactsService,
    {
      provide: DOMAIN,
      useValue: Domains.STORE,
    },
  ],
  controllers: [ContactsPublicController],
})
export class ContactsStoreModule {}
