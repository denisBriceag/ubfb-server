import { StoreCategoryNode } from '@features/category/models/store-category.model';
import { StoreBrandModel } from '@features/brand/models/store-brand.model';

export interface StoreCollectionItemModel {
  position: number;
  product: {
    id: string;
    slug: string;
    name: string;
    images: string[];
    price: number;
    isWholesale: boolean;
    category: Pick<StoreCategoryNode, 'slug' | 'name'>;
    brand: Pick<StoreBrandModel, 'slug' | 'name'> | null;
  };
}

export interface StoreCollectionModel {
  id: string;
  slug: string;
  name: string;
  position: number;
  items: StoreCollectionItemModel[];
}
