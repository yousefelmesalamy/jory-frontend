import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { WishlistItem } from '../models';
import { API_URL } from '../tokens/api-url.token';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly apiUrl = inject(API_URL);

  /** TODO: GET {apiUrl}/wishlist/ */
  list(): Observable<WishlistItem[]> {
    return of([]);
  }

  /** TODO: POST {apiUrl}/wishlist/ */
  add(productId: number): Observable<WishlistItem | null> {
    return of(null);
  }

  /** TODO: DELETE {apiUrl}/wishlist/{itemId}/ */
  remove(itemId: number): Observable<void> {
    return of(undefined);
  }
}
