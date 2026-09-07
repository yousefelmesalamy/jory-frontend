import { ProductVariant } from './product.model';
import { Voucher } from './voucher.model';

/** `CartVariantSerializer` — a variant plus the product identity, so a line
 * renders standalone. Notably carries no image: the cart API doesn't embed one. */
export interface CartLineVariant extends ProductVariant {
  product_name: string;
  product_slug: string;
}

export interface CartItem {
  id: number;
  variant: CartLineVariant;
  quantity: number;
  line_total: string;
}

/** Server-computed money. The client never sends these figures, only reads them. */
export interface CartTotals {
  subtotal: string;
  discount_total: string;
  shipping_cost: string;
  grand_total: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  voucher: Voucher | null;
  totals: CartTotals;
}
