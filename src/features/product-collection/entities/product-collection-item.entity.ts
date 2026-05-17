import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from '@features/product/entities/product.entity';
import { ProductCollection } from './product-collection.entity';

@Entity('product_collection_items')
export class ProductCollectionItem {
  @PrimaryColumn({ type: 'uuid' })
  collectionId: string;

  @PrimaryColumn({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductCollection, (collection) => collection.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  collection: ProductCollection;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', default: 0 })
  position: number;
}
