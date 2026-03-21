import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Brand } from './brand.entity';

@Entity('brand_translations')
@Index(['brandId', 'languageCode'], { unique: true })
export class BrandTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  brandId: string;

  @Column({ type: 'varchar', length: 5 })
  languageCode: string;

  @Column({ type: 'varchar' })
  name: string;

  @ManyToOne(() => Brand, (b) => b.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;
}
