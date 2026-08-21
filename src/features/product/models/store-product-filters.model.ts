import { StoreCategoryNode } from '@features/category/models/store-category.model';
import { StoreBrandModel } from '@features/brand/models/store-brand.model';
import { StoreCountryModel } from '@features/country/models/store-country.model';
import { StorePackagingTypeModel } from '@features/packaging-type/models/store-packaging-type.model';

export type CategoryFilter = Pick<StoreCategoryNode, 'slug' | 'name'> & {
  count: number;
};
export type BrandsFilter = Pick<StoreBrandModel, 'slug' | 'name'> & {
  count: number;
};
export type CountriesFilter = Pick<StoreCountryModel, 'code' | 'name'> & {
  count: number;
};
export type PackagingTypesFilter = Pick<
  StorePackagingTypeModel,
  'label' | 'code'
> & {
  count: number;
};

export interface StoreProductFiltersModel {
  categories: CategoryFilter[];
  brands: BrandsFilter[];
  countries: CountriesFilter[];
  packagingTypes: PackagingTypesFilter[];
  priceRange: { min: number; max: number } | null;
  alcoholPercentageRange: { min: number; max: number } | null;
}
