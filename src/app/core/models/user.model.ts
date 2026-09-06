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

/** TODO: fill in from the backend `AddressSerializer` once submitted. */
export interface Address {
  id: number;
}
