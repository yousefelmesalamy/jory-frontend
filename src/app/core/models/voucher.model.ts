export type DiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

/** `AppliedVoucherSerializer` — the voucher as it rides along on a cart. */
export interface Voucher {
  code: string;
  description: string;
  discount_type: DiscountType;
  value: string;
}
