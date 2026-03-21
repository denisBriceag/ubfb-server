import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands.module';
import { BrandsAdminController } from '../brands.admin.controller';

@Module({
  imports: [BrandsModule],
  controllers: [BrandsAdminController],
})
export class BrandsAdminModule {}
