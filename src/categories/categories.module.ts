import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { AttributeDefinition } from './entities/attribute-definition.entity';
import { AttributeDefinitionTranslation } from './entities/attribute-definition-translation.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      CategoryTranslation,
      AttributeDefinition,
      AttributeDefinitionTranslation,
    ]),
    UploadsModule,
  ],
  providers: [CategoriesService],
  exports: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule {}
