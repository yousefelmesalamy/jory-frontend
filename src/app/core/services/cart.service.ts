import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Cart } from '../models';
import { API_URL } from '../tokens/api-url.token';

/**
 * The one place cart state lives. `cart` stays null until a real request fills
 * it, so every consumer renders its empty state by default.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = inject(API_URL);

  readonly cart = signal<Cart | null>(null);

  /** TODO: GET {apiUrl}/cart/ */
  load(): Observable<Cart | null> {
    return of(null);
  }

  /** TODO: POST {apiUrl}/cart/items/ */
  addItem(variantId: number, quantity: number): Observable<Cart | null> {
    return of(null);
  }

  /** TODO: PATCH {apiUrl}/cart/items/{itemId}/ */
  updateItem(itemId: number, quantity: number): Observable<Cart | null> {
    return of(null);
  }

  /** TODO: DELETE {apiUrl}/cart/items/{itemId}/ */
  removeItem(itemId: number): Observable<Cart | null> {
    return of(null);
  }

  /** TODO: POST {apiUrl}/cart/voucher/ */
  applyVoucher(code: string): Observable<Cart | null> {
    return of(null);
  }

  /** TODO: DELETE {apiUrl}/cart/voucher/ */
  removeVoucher(): Observable<Cart | null> {
    return of(null);
  }
}
