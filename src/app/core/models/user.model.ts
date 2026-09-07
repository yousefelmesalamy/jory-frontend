export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  phone: string;
  date_joined: string;
}

/** `full_name` and `phone` are optional; the backend enforces the rest. */
export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  full_name?: string;
  phone?: string;
}

/** Matches the backend `AddressSerializer` — see the Address Book Manifest. */
export interface Address {
  id: number;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street_address: string;
  postal_code: string;
  notes: string;
  is_default: boolean;
  created_at: string;
}

/** Writable fields for create (POST) and full replace (PUT). `id` and
 * `created_at` are server-assigned; `is_default` is deliberately left off —
 * the manifest's default-address rules make hand-editing it from a general
 * save risky (see the "Set as default" gotcha), so that's a dedicated action
 * instead (`AddressService.patch`). */
export type AddressPayload = Omit<Address, 'id' | 'created_at' | 'is_default'>;
