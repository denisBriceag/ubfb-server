import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog.module';
import { CatalogAdminController } from '../catalog.admin.controller';

@Module({
  imports: [CatalogModule],
  controllers: [CatalogAdminController],
})
export class CatalogAdminModule {}
