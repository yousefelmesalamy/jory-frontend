/** Envelope every paginated DRF list endpoint returns. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Field name → list of validation messages, as returned in `ApiError.error.details`. */
export type ApiFieldErrors = Record<string, string[]>;

/** The general error envelope every endpoint uses except SimpleJWT's own login 401. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details: ApiFieldErrors;
  };
}

/** SimpleJWT's own shape for a failed login — no envelope, just `detail`. */
export interface SimpleJwtError {
  detail: string;
}
