import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@features/user/user.module';
import { Domains } from '@core/types/domains.enum';
import { Maps } from '@features/maps/entities/maps.entity';
import { MapsService } from '@features/maps/services/maps.service';
import { MapsController } from '@features/maps/controllers/maps.controller';
import { DOMAIN } from '@core/constants/domain';

@Module({
  imports: [TypeOrmModule.forFeature([Maps]), UserModule],
  controllers: [MapsController],
  providers: [
    MapsService,
    {
      provide: DOMAIN,
      useValue: Domains.ADMIN,
    },
  ],
})
export class MapsAdminModule {}
