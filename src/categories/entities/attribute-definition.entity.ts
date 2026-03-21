import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { Category } from './category.entity';
import { AttributeDefinitionTranslation } from './attribute-definition-translation.entity';
import { User } from '@features/user/entities/user.entity';

export enum AttributeType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

@Entity('attribute_definitions')
export class AttributeDefinition extends BaseEntity {
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'varchar' })
  key: string;

  @Column({ type: 'enum', enum: AttributeType })
  type: AttributeType;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(
    () => AttributeDefinitionTranslation,
    (t) => t.attributeDefinition,
    { cascade: true },
  )
  translations: AttributeDefinitionTranslation[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
