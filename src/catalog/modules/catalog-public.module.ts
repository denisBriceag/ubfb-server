import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog.module';
import { CatalogController } from '../catalog.controller';

@Module({
  imports: [CatalogModule],
  controllers: [CatalogController],
})
export class CatalogPublicModule {}
