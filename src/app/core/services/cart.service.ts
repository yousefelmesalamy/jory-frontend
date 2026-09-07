import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { Cart, CartItem } from '../models';
import { API_URL } from '../tokens/api-url.token';

const CART_TOKEN_KEY = 'jory.cart.token';

/**
 * The one place cart state lives. `cart` stays null until the first load
 * resolves, so every consumer renders its empty/loading state by default.
 *
 * Adding, updating or removing a line only gets a partial shape back from the
 * API (the touched line, or nothing at all on a 204) — each of those reloads
 * the full cart afterwards so `totals` never goes stale. Applying or removing
 * a voucher returns the full cart already, so those just store the response.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly cart = signal<Cart | null>(null);

  /** True until the first load settles (either way) — lets the cart page tell
   * "still loading" apart from "genuinely empty". Stays true through SSR,
   * where the cart is never fetched at all (see the constructor). */
  readonly loading = signal(true);

  /** Line count would just be `items.length` — this sums quantities instead. */
  readonly itemCount = computed(
    () => this.cart()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
  );

  /** The guest identity `cartTokenInterceptor` echoes onto every `/cart` request.
   * Unset once the shopper is signed in and their guest cart has been merged in. */
  private readonly guestToken = signal<string | null>(this.readStored());

  get cartToken(): string | null {
    return this.guestToken();
  }

  constructor() {
    // Not run during SSR: the guest token lives in the browser's localStorage,
    // so a server render has no way to identify the visitor's actual cart —
    // it would only mint a fresh, throwaway guest cart on every request.
    //
    // Deferred a microtask: calling this.load() synchronously here would
    // dispatch a request through cartTokenInterceptor, which injects
    // CartService — while this constructor is still on the stack, Angular's
    // circular-dependency guard (NG0200) fires and RxJS silently routes it to
    // the error callback below, so the cart would never actually load. Same
    // hazard, same fix as AuthService's own hydration call.
    if (this.isBrowser) {
      queueMicrotask(() =>
        this.load().subscribe({
          error: () => this.loading.set(false),
          complete: () => this.loading.set(false),
        }),
      );
    }
  }

  load(): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/cart/`).pipe(tap((cart) => this.cart.set(cart)));
  }

  addItem(variantId: number, quantity = 1): Observable<Cart> {
    return this.http
      .post<CartItem>(`${this.apiUrl}/cart/items/`, { variant: variantId, quantity })
      .pipe(switchMap(() => this.load()));
  }

  /** `quantity` is absolute, not a delta. Zero removes the line (204, no body). */
  updateItem(itemId: number, quantity: number): Observable<Cart> {
    return this.http
      .patch<CartItem | null>(`${this.apiUrl}/cart/items/${itemId}/`, { quantity })
      .pipe(switchMap(() => this.load()));
  }

  removeItem(itemId: number): Observable<Cart> {
    return this.http
      .delete<void>(`${this.apiUrl}/cart/items/${itemId}/`)
      .pipe(switchMap(() => this.load()));
  }

  applyVoucher(code: string): Observable<Cart> {
    return this.http
      .post<Cart>(`${this.apiUrl}/cart/apply-voucher/`, { code })
      .pipe(tap((cart) => this.cart.set(cart)));
  }

  removeVoucher(): Observable<Cart> {
    return this.http
      .delete<Cart>(`${this.apiUrl}/cart/voucher/`)
      .pipe(tap((cart) => this.cart.set(cart)));
  }

  /** Called once right after login. A no-op if the shopper never had a guest
   * cart this session — safe to call unconditionally. */
  mergeGuestCart(): Observable<Cart | null> {
    const token = this.guestToken();
    if (!token) {
      return of(null);
    }
    return this.http.post<Cart>(`${this.apiUrl}/cart/merge/`, { cart_token: token }).pipe(
      tap((cart) => {
        this.cart.set(cart);
        this.setCartToken(null);
      }),
    );
  }

  /** Public so `cartTokenInterceptor` can persist the token a response echoes back. */
  setCartToken(token: string | null): void {
    this.guestToken.set(token);
    this.writeStored(token);
  }

  private readStored(): string | null {
    return this.isBrowser ? localStorage.getItem(CART_TOKEN_KEY) : null;
  }

  private writeStored(value: string | null): void {
    if (!this.isBrowser) {
      return;
    }
    if (value === null) {
      localStorage.removeItem(CART_TOKEN_KEY);
    } else {
      localStorage.setItem(CART_TOKEN_KEY, value);
    }
  }
}
