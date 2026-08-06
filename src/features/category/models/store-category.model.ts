export interface StoreCategoryNode {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  depth: number;
  children: StoreCategoryNode[];
}
