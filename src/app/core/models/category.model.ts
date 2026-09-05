/** Matches `CategorySerializer`. Listing returns roots with `children` nested one level deep. */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  display_order: number;
  children: readonly Category[];
}

/** TODO: fill in remaining fields from the backend `OriginSerializer` once submitted. */
export interface Origin {
  id: number;
  name: string;
  slug: string;
}
