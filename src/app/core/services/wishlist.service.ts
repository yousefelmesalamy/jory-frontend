import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Paginated, WishlistItem } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** `WishlistItemDeleteView` is keyed on `product_id`, not the wishlist row id — so is `remove`. */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /**
   * Product ids the signed-in user has wishlisted, shared by every
   * `WishlistToggle` button on the site so they all agree on state without
   * each firing its own request. Hydrated on demand via `ensureIdsLoaded`.
   */
  readonly wishlistedIds = signal<ReadonlySet<number>>(new Set());
  /** Product ids with an add/remove in flight, so a button can't be double-tapped. */
  readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  private idsRequested = false;

  list(page = 1): Observable<Paginated<WishlistItem>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Paginated<WishlistItem>>(`${this.apiUrl}/wishlist/`, { params });
  }

  add(productId: number): Observable<WishlistItem> {
    return this.http
      .post<WishlistItem>(`${this.apiUrl}/wishlist/`, { product: productId })
      .pipe(tap(() => this.setMembership(productId, true)));
  }

  remove(productId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/wishlist/${productId}/`)
      .pipe(tap(() => this.setMembership(productId, false)));
  }

  /**
   * Fetches the full id set once per session (a single 100-item page covers
   * every realistic wishlist) so `WishlistToggle` buttons can render their
   * state without each mounting its own request. Safe to call repeatedly —
   * only the first call after login or a failed attempt does anything.
   */
  ensureIdsLoaded(): void {
    if (this.idsRequested) {
      return;
    }
    this.idsRequested = true;

    const params = new HttpParams().set('page_size', 100);
    this.http.get<Paginated<WishlistItem>>(`${this.apiUrl}/wishlist/`, { params }).subscribe({
      next: (page) => this.wishlistedIds.set(new Set(page.results.map((item) => item.product.id))),
      error: () => {
        this.idsRequested = false;
      },
    });
  }

  /** Adds or removes a product depending on its current membership, for a `WishlistToggle` click. */
  toggle(productId: number): void {
    if (this.pendingIds().has(productId)) {
      return;
    }
    this.pendingIds.update((ids) => new Set(ids).add(productId));

    const clearPending = () =>
      this.pendingIds.update((ids) => {
        if (!ids.has(productId)) {
          return ids;
        }
        const next = new Set(ids);
        next.delete(productId);
        return next;
      });

    if (this.wishlistedIds().has(productId)) {
      this.remove(productId)
        .pipe(catchError(() => of(void 0)))
        .subscribe(clearPending);
    } else {
      this.add(productId)
        .pipe(catchError(() => of(null)))
        .subscribe(clearPending);
    }
  }

  /** Clears the cached id set on logout, so a different user signing in on the same browser doesn't inherit it. */
  reset(): void {
    this.idsRequested = false;
    this.wishlistedIds.set(new Set());
    this.pendingIds.set(new Set());
  }

  private setMembership(productId: number, inWishlist: boolean): void {
    this.wishlistedIds.update((ids) => {
      const has = ids.has(productId);
      if (has === inWishlist) {
        return ids;
      }
      const next = new Set(ids);
      if (inWishlist) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  }
}
