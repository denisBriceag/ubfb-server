import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands.module';
import { BrandsController } from '../brands.controller';

@Module({
  imports: [BrandsModule],
  controllers: [BrandsController],
})
export class BrandsPublicModule {}
