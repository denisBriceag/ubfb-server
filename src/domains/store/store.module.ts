import { Module } from '@nestjs/common';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';

@Module({
  imports: [ContactsPublicModule],
})
export class StoreModule {}
