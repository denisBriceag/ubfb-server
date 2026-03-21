import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { AttributeDefinition } from '../../categories/entities/attribute-definition.entity';

@Entity('product_attributes')
@Index(['productId', 'attributeDefinitionId'], { unique: true })
export class ProductAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  attributeDefinitionId: string;

  @Column({ type: 'varchar' })
  value: string;

  @ManyToOne(() => Product, (p) => p.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attributeDefinitionId' })
  attributeDefinition: AttributeDefinition;
}
