import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { ProductTranslation } from './product-translation.entity';
import { ProductImage } from './product-image.entity';
import { ProductAttribute } from './product-attribute.entity';
import { User } from '@features/user/entities/user.entity';
import { Brand } from '../../brands/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { Country } from '../../catalog/entities/country.entity';
import { VolumeUnit } from '../../catalog/entities/volume-unit.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, { nullable: false })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  countryId: string | null;

  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'countryId' })
  country: Country | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  volumeValue: number | null;

  @Column({ type: 'uuid', nullable: true })
  volumeUnitId: string | null;

  @ManyToOne(() => VolumeUnit, { nullable: true })
  @JoinColumn({ name: 'volumeUnitId' })
  volumeUnit: VolumeUnit | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  alcoholDegree: number | null;

  @Column({ type: 'boolean', default: false })
  isNew: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => ProductTranslation, (t) => t.product, { cascade: true })
  translations: ProductTranslation[];

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductAttribute, (attr) => attr.product, { cascade: true })
  attributes: ProductAttribute[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
