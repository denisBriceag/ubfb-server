import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagingType } from '../entities/packaging-type.entity';
import { PackagingTypeService } from '../services/packaging-type.service';
import { PackagingTypeStoreController } from '../controllers/packaging-type-store.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PackagingType])],
  providers: [PackagingTypeService],
  controllers: [PackagingTypeStoreController],
})
export class PackagingTypeStoreModule {}
