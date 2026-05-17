import { StorePackagingTypeModel } from '@features/packaging-type/models/store-packaging-type.model';
import { StoreCountryModel } from '@features/country/models/store-country.model';
import { StoreBrandModel } from '@features/brand/models/store-brand.model';
import { StoreCategoryNode } from '@features/category/models/store-category.model';

export interface StoreProductModel {
  id: string;
  slug: string;
  name: string;
  description: object | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: string[];
  price: number;
  sku: string | null;
  volumeMl: number | null;
  weightG: number | null;
  unitCount: number;
  alcoholPercentage: number | null;
  isWholesale: boolean;
  isGiftBox: boolean;
  category: Pick<StoreCategoryNode, 'slug' | 'name'>;
  brand: Pick<StoreBrandModel, 'slug' | 'name'> | null;
  country: StoreCountryModel | null;
  packagingType: StorePackagingTypeModel | null;
}
