import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { User } from '@features/user/entities/user.entity';
import { ProductCollectionItem } from './product-collection-item.entity';

@Entity('product_collections')
export class ProductCollection extends BaseEntity {
  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => ProductCollectionItem, (item) => item.collection)
  items: ProductCollectionItem[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
