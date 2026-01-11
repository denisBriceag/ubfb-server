import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HashingModule } from '@core/hashing';
import { DOMAIN } from '@core/constants/domain';
import { Domains } from '@core/types/domains.enum';

import { User } from '@features/user/entities/user.entity';

import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), HashingModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {
  static forRoot(domain: Domains): DynamicModule {
    return {
      module: UserModule,
      providers: [
        {
          provide: DOMAIN,
          useValue: domain,
        },
        UserService,
      ],
    };
  }
}
