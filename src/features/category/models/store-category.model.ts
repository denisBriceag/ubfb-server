export interface StoreCategoryNode {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  depth: number;
  position: number;
  children: StoreCategoryNode[];
}
