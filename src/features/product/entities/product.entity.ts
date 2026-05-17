import { Check, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@core/entities/base.entity';
import { Language } from '@core/types/language';
import { QuillDelta } from '@core/types/quill-delta';
import { Category } from '@features/category/entities/category.entity';
import { Brand } from '@features/brand/entities/brand.entity';
import { Country } from '@features/country/entities/country.entity';
import { PackagingType } from '@features/packaging-type/entities/packaging-type.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('products')
@Check(
  '"alcoholPercentage" IS NULL OR ("alcoholPercentage" >= 0 AND "alcoholPercentage" <= 100)',
)
export class Product extends BaseEntity {
  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'jsonb', nullable: true })
  description: Record<Language, QuillDelta> | null;

  @Column({ type: 'jsonb', nullable: true })
  metaTitle: Record<Language, string> | null;

  @Column({ type: 'jsonb', nullable: true })
  metaDescription: Record<Language, string> | null;

  @Exclude()
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Exclude()
  @Column({ type: 'uuid', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { nullable: true })
  @JoinColumn({ name: 'brandId' })
  brand: Brand | null;

  @Exclude()
  @Column({ type: 'uuid', nullable: true })
  countryId: string | null;

  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'countryId' })
  country: Country | null;

  @Exclude()
  @Column({ type: 'uuid', nullable: true })
  packagingTypeId: string | null;

  @ManyToOne(() => PackagingType, { nullable: true })
  @JoinColumn({ name: 'packagingTypeId' })
  packagingType: PackagingType | null;

  @Column({ type: 'int', nullable: true })
  volumeMl: number | null;

  @Column({ type: 'int', nullable: true })
  weightG: number | null;

  @Column({ type: 'int', default: 1 })
  unitCount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: { to: (v: number | null) => v, from: (v: string | null) => (v !== null ? parseFloat(v) : null) },
  })
  alcoholPercentage: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  price: number;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  sku: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isWholesale: boolean;

  @Column({ default: false })
  isGiftBox: boolean;

  @ManyToMany(() => Product)
  @JoinTable({
    name: 'product_related_products',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'related_product_id', referencedColumnName: 'id' },
  })
  relatedProducts: Product[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
