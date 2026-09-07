export type ProductType = 'COFFEE' | 'EQUIPMENT' | 'ROASTING_MACHINE' | 'ACCESSORY';
export type CoffeeProcess = 'WASHED' | 'NATURAL' | 'HONEY' | 'ANAEROBIC' | 'WET_HULLED';
export type RoastLevel = 'LIGHT' | 'MEDIUM' | 'MEDIUM_DARK' | 'DARK';
export type GrindType = 'WHOLE_BEAN' | 'ESPRESSO' | 'FILTER' | 'FRENCH_PRESS' | 'TURKISH';
export type BestSellingWindow = 'week' | 'month' | 'year';

/**
 * Shape every `LocalizedChoiceField` on the backend serializes to: the raw code
 * plus a label already picked for the request's `Accept-Language`. An unset
 * choice (e.g. no grind on a variant) comes through as `{ value: '', label: '' }`.
 */
export interface LocalizedChoice<T extends string> {
  value: T | '';
  label: string;
}
export type ProductOrdering =
  | 'price'
  | '-price'
  | 'created_at'
  | '-created_at'
  | 'rating_avg'
  | '-rating_avg'
  | 'name'
  | '-name';

/** The category/roaster summaries a product listing embeds — not the full records. */
export interface ProductCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface ProductRoasterRef {
  id: number;
  name: string;
  slug: string;
  country: string;
}

export interface CoffeeOrigin {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
  display_order: number;
}

/** Shaped after `GET /api/products/` list rows; field names mirror the JSON as-is. */
export interface Product {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  product_type: LocalizedChoice<ProductType>;
  category: ProductCategoryRef;
  roaster: ProductRoasterRef | null;
  is_featured: boolean;
  rating_avg: string;
  rating_count: number;
  price_from: string;
  compare_at_price_from: string | null;
  is_on_sale: boolean;
  in_stock: boolean;
  primary_image: ProductImage | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  label: string;
  weight_grams: number | null;
  grind: LocalizedChoice<GrindType>;
  price: string;
  compare_at_price: string | null;
  stock_quantity: number;
  is_on_sale: boolean;
  discount_percent: number;
  in_stock: boolean;
}

/** `CoffeeProfileSerializer` — origin attributes coffee products carry, absent for
 * equipment and machines. `region`/`farm`/`variety`/`tasting_notes` are blank
 * strings rather than null when unset; `altitude_masl`/`harvest_year`/
 * `cupping_score` are the only fields that can be null. */
export interface CoffeeProfile {
  origin: CoffeeOrigin;
  region: string;
  farm: string;
  process: LocalizedChoice<CoffeeProcess>;
  variety: string;
  roast_level: LocalizedChoice<RoastLevel>;
  altitude_masl: number | null;
  tasting_notes: string;
  harvest_year: number | null;
  cupping_score: string | null;
}

/** `GET /api/products/{slug}/` — the list shape plus the full detail fields. */
export interface ProductDetail extends Product {
  description: string;
  variants: ProductVariant[];
  images: ProductImage[];
  coffee_profile: CoffeeProfile | null;
}

/**
 * `GET /api/products/` query params. All optional and AND-combined — an absent
 * key is simply not sent, rather than sent with an empty/default value.
 */
export interface ProductFilters {
  search?: string;
  category?: string;
  roaster?: string;
  type?: ProductType;
  origin?: string;
  process?: CoffeeProcess;
  roast?: RoastLevel;
  brand?: string;
  machine_type?: MachineType;
  min_price?: number;
  max_price?: number;
  on_sale?: boolean;
  in_stock?: boolean;
  best_selling?: BestSellingWindow;
  ordering?: ProductOrdering;
  page?: number;
  page_size?: number;
}

export type MachineType =
  | 'DRUM_ROASTER'
  | 'FLUID_BED_ROASTER'
  | 'SAMPLE_ROASTER'
  | 'GRINDER'
  | 'BREWER'
  | 'KETTLE'
  | 'OTHER';

/** How the rail draws a facet: `range` is the price pair, `boolean` a switch. */
export type FacetKind = 'choice' | 'range' | 'boolean';

export interface FacetOption {
  readonly value: string;
  readonly label: string;
}

/**
 * One filter group, as the backend says it should appear for this category.
 * Labels arrive already localized, so the frontend holds no second copy of the
 * roast/process/machine copy deck.
 */
export interface Facet {
  readonly key: string;
  readonly label: string;
  readonly kind: FacetKind;
  readonly options: readonly FacetOption[];
}

export interface FacetResponse {
  readonly product_type: ProductType | null;
  readonly facets: readonly Facet[];
}
