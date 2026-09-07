import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../tokens/api-url.token';
import { CartService } from '../services/cart.service';
import { cartTokenInterceptor } from './cart-token.interceptor';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([cartTokenInterceptor])),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });

  const cart = TestBed.inject(CartService);
  const httpMock = TestBed.inject(HttpTestingController);
  const http = TestBed.inject(HttpClient);

  // CartService's own initial load is deferred a microtask past construction
  // (see the comment on its constructor) — wait for it, then drain it.
  await Promise.resolve();
  httpMock.expectOne('/api/cart/').flush({
    id: 1,
    items: [],
    voucher: null,
    totals: {
      subtotal: '0.00',
      discount_total: '0.00',
      shipping_cost: '0.00',
      grand_total: '0.00',
    },
  });

  return { cart, httpMock, http };
}

describe('cartTokenInterceptor', () => {
  afterEach(() => localStorage.clear());

  it('attaches the stored token to cart requests', async () => {
    const { cart, httpMock, http } = await setup();
    cart.setCartToken('guest-token-123');

    http.get('/api/cart/').subscribe();

    const req = httpMock.expectOne('/api/cart/');
    expect(req.request.headers.get('X-Cart-Token')).toBe('guest-token-123');
    req.flush({});

    httpMock.verify();
  });

  it('sends no token header when none is stored yet', async () => {
    const { httpMock, http } = await setup();

    http.get('/api/cart/').subscribe();

    const req = httpMock.expectOne('/api/cart/');
    expect(req.request.headers.has('X-Cart-Token')).toBe(false);
    req.flush({});

    httpMock.verify();
  });

  it('stores the token echoed back on the response', async () => {
    const { cart, httpMock, http } = await setup();

    http.get('/api/cart/').subscribe();

    httpMock.expectOne('/api/cart/').flush({}, { headers: { 'X-Cart-Token': 'fresh-token-456' } });

    expect(cart.cartToken).toBe('fresh-token-456');
    expect(localStorage.getItem('jory.cart.token')).toBe('fresh-token-456');

    httpMock.verify();
  });

  it('leaves an unrelated request untouched', async () => {
    const { cart, httpMock, http } = await setup();
    cart.setCartToken('guest-token-123');

    http.get('/api/products/').subscribe();

    const req = httpMock.expectOne('/api/products/');
    expect(req.request.headers.has('X-Cart-Token')).toBe(false);
    req.flush([]);

    httpMock.verify();
  });
});
