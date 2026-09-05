/** Envelope every paginated DRF list endpoint returns. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
