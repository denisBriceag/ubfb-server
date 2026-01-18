import { Module } from '@nestjs/common';
import { MapsPublicModule } from '@features/maps/modules/maps-public.module';
import { ContactsPublicModule } from '@features/contacts/modules/contacts-public.module';

@Module({
  imports: [MapsPublicModule, ContactsPublicModule],
})
export class StoreModule {}
