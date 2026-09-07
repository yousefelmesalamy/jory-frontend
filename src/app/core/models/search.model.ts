import type { ProductImage, ProductType } from './product.model';

/**
 * One type-ahead row from `GET /api/search/suggest/`.
 *
 * Deliberately thinner than `Product` — the endpoint returns a row, not a card.
 * Note `product_type` arrives raw here (`'COFFEE'`), not as the localized
 * `{ value, label }` pair the product list serializer emits.
 */
export interface ProductSuggestion {
  id: number;
  name: string;
  slug: string;
  product_type: ProductType;
  price_from: string;
  primary_image: ProductImage | null;
}

/** Matches `CategorySlimSerializer` — enough to label a row and route from it. */
export interface CategorySuggestion {
  id: number;
  name: string;
  slug: string;
}

export interface SearchSuggestions {
  products: readonly ProductSuggestion[];
  categories: readonly CategorySuggestion[];
}
