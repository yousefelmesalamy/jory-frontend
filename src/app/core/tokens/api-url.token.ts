import { InjectionToken } from '@angular/core';

/** Base path every service prefixes its requests with. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
