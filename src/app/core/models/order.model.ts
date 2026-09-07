/** `OrderSerializer` — same shape at checkout, list, and detail. Only staff
 * (Django admin) move `status` past `PENDING`; the storefront's only write is
 * cancel. */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/** `payment_method` is always `'COD'` for now — no other method exists yet. */
export type PaymentMethod = 'COD';

export type PaymentStatus = 'UNPAID' | 'PAID';

/** A snapshot frozen at checkout — `product_name`/`variant_label`/`sku`/`unit_price`
 * won't reflect later catalog edits or even product deletion. Always render
 * order history from these fields, never by re-fetching the live product. */
export interface OrderItem {
  id: number;
  sku: string;
  product_name: string;
  variant_label: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: string;
  discount_total: string;
  shipping_cost: string;
  grand_total: string;
  /** `''` when no voucher was applied — never `null`. */
  voucher_code: string;
  /** ISO 8601 UTC — the order's creation time; there's no separate "confirmed at". */
  placed_at: string;
  recipient_name: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street_address: string;
  postal_code: string;
  notes: string;
  items: OrderItem[];
}

/** POST `/orders/` body, option A — checkout against a saved address.
 * `notes`, if given, overrides the saved address's own notes. */
export interface PlaceOrderWithSavedAddress {
  address_id: number;
  notes?: string;
}

/** POST `/orders/` body, option B — an inline address, not saved to the book. */
export interface PlaceOrderWithInlineAddress {
  recipient_name: string;
  phone: string;
  country: string;
  city: string;
  street_address: string;
  area?: string;
  postal_code?: string;
  notes?: string;
}

export type PlaceOrderPayload = PlaceOrderWithSavedAddress | PlaceOrderWithInlineAddress;
