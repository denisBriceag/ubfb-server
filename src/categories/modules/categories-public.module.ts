import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories.module';
import { CategoriesController } from '../categories.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [CategoriesController],
})
export class CategoriesPublicModule {}
