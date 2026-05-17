export interface StoreBrandModel {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  country: { code: string; name: string } | null;
}
