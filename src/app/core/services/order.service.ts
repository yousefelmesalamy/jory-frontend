import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Order, Paginated, PlaceOrderPayload } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** Checkout is COD only, so `place` carries an address but no payment payload.
 * Orders are create + read only — no PATCH/DELETE, cancel is its own action. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** The caller's own orders, newest first. Standard page-number pagination
   * (default page size 20, server max 100). */
  list(page = 1): Observable<Paginated<Order>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Paginated<Order>>(`${this.apiUrl}/orders/`, { params });
  }

  /** Looked up by `order_number` (e.g. `JORY-A1B2C3D4`), not the numeric `id` —
   * that's the value used in URLs and on receipts. */
  get(orderNumber: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderNumber}/`);
  }

  /** Every money figure is computed server-side from the cart and live
   * stock/voucher state — anything money-related in `payload` would be ignored
   * anyway, so there's nothing to send here. */
  place(payload: PlaceOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/`, payload);
  }

  /** Only valid while `status === 'PENDING'` — the API 409s otherwise
   * (`order_not_cancellable`). No un-cancel once it succeeds. */
  cancel(orderNumber: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/${orderNumber}/cancel/`, {});
  }
}
