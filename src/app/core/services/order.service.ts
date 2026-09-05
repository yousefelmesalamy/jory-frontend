import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Order, Paginated } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** Checkout is COD only, so `place` carries an address but no payment payload. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = inject(API_URL);

  /** TODO: GET {apiUrl}/orders/ */
  list(): Observable<Paginated<Order> | null> {
    return of(null);
  }

  /** TODO: GET {apiUrl}/orders/{id}/ */
  get(id: number): Observable<Order | null> {
    return of(null);
  }

  /** TODO: POST {apiUrl}/orders/ */
  place(addressId: number): Observable<Order | null> {
    return of(null);
  }
}
