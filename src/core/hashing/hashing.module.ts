import { Global, Module } from '@nestjs/common';
import { HashingService } from './services/bcrypt/bcrypt.service';
import { BcryptService } from './services/hashing/hashing.service';

@Global()
@Module({
  providers: [{ provide: HashingService, useClass: BcryptService }],
  exports: [{ provide: HashingService, useClass: BcryptService }],
})
export class HashingModule {}
