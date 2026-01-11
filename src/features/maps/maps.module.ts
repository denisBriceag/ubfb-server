import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maps } from '@features/maps/entities/maps.entity';
import { UserModule } from '@features/user/user.module';
import { Domains } from '@core/types/domains.enum';

import { MapsService } from './services/maps.service';
import { MapsController } from './controllers/maps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Maps]), UserModule],
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {
  static forRoot(domain: Domains): DynamicModule {
    return {
      module: MapsModule,
      providers: [
        {
          provide: 'DOMAIN',
          useValue: domain,
        },
      ],
    };
  }
}
