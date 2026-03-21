import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity('attribute_definition_translations')
@Index(['attributeDefinitionId', 'languageCode'], { unique: true })
export class AttributeDefinitionTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attributeDefinitionId: string;

  @Column({ type: 'varchar', length: 5 })
  languageCode: string;

  @Column({ type: 'varchar' })
  label: string;

  @ManyToOne(
    () => AttributeDefinition,
    (ad) => ad.translations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'attributeDefinitionId' })
  attributeDefinition: AttributeDefinition;
}
