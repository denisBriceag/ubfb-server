import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories.module';
import { CategoriesAdminController } from '../categories.admin.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [CategoriesAdminController],
})
export class CategoriesAdminModule {}
