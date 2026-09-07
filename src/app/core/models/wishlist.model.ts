import { Product } from './product.model';

/** Matches `WishlistItemSerializer`; `product` is the same shape `GET /api/products/` embeds. */
export interface WishlistItem {
  id: number;
  product: Product;
  created_at: string;
}
