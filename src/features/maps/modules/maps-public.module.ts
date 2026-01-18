import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maps } from '@features/maps/entities/maps.entity';
import { Domains } from '@core/types/domains.enum';
import { MapsService } from '@features/maps/services/maps.service';
import { DOMAIN } from '@core/constants/domain';
import { MapsPublicController } from '@features/maps/controllers/maps-public.controller';
import { UserModule } from '@features/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Maps]), UserModule],
  controllers: [MapsPublicController],
  providers: [
    MapsService,
    {
      provide: DOMAIN,
      useValue: Domains.STORE,
    },
  ],
})
export class MapsPublicModule {}
