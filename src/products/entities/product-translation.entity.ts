import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_translations')
@Index(['productId', 'languageCode'], { unique: true })
export class ProductTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 5 })
  languageCode: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'json', nullable: true })
  descriptionDelta: any | null;

  @Column({ type: 'text', nullable: true })
  descriptionText: string | null;

  @ManyToOne(() => Product, (p) => p.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
