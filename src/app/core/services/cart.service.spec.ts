import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Cart, CartItem } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { CartService } from './cart.service';

const VARIANT = {
  id: 14,
  sku: 'JORY-ETH-250',
  label: '250g / Whole bean',
  weight_grams: 250,
  grind: { value: 'WHOLE_BEAN' as const, label: 'Whole bean' },
  price: '250.00',
  compare_at_price: null,
  stock_quantity: 18,
  is_on_sale: false,
  discount_percent: 0,
  in_stock: true,
  product_name: 'Ethiopia Yirgacheffe',
  product_slug: 'ethiopia-yirgacheffe',
};

const ITEM: CartItem = { id: 7, variant: VARIANT, quantity: 2, line_total: '500.00' };

const CART: Cart = {
  id: 3,
  items: [ITEM],
  voucher: null,
  totals: { subtotal: '500.00', discount_total: '0.00', shipping_cost: '30.00', grand_total: '530.00' },
};

const EMPTY_CART: Cart = {
  id: 9,
  items: [],
  voucher: null,
  totals: { subtotal: '0.00', discount_total: '0.00', shipping_cost: '0.00', grand_total: '0.00' },
};

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  const service = TestBed.inject(CartService);
  const httpMock = TestBed.inject(HttpTestingController);

  return { service, httpMock };
}

/** `CartService` loads the cart itself in the browser, a microtask past
 * construction (see the comment on its constructor) — every browser test
 * awaits that, then drains the request. */
async function setupLoaded(cart: Cart = EMPTY_CART) {
  const { service, httpMock } = setup();
  await Promise.resolve();
  httpMock.expectOne('/api/cart/').flush(cart);
  return { service, httpMock };
}

describe('CartService — construction', () => {
  afterEach(() => localStorage.clear());

  it('loads the cart once in the browser', async () => {
    const { service, httpMock } = setup();

    await Promise.resolve();
    httpMock.expectOne('/api/cart/').flush(CART);

    expect(service.cart()).toEqual(CART);
    httpMock.verify();
  });

  it('does not load the cart on the server', async () => {
    const { httpMock } = setup('server');

    await Promise.resolve();
    httpMock.verify();
  });

  it('is loading until the initial fetch resolves', async () => {
    const { service, httpMock } = setup();
    expect(service.loading()).toBe(true);

    await Promise.resolve();
    httpMock.expectOne('/api/cart/').flush(CART);

    expect(service.loading()).toBe(false);
  });

  it('stops loading even when the initial fetch fails', async () => {
    const { service, httpMock } = setup();

    await Promise.resolve();
    httpMock
      .expectOne('/api/cart/')
      .flush({ error: { code: 'error', message: 'boom', details: {} } }, { status: 500, statusText: 'Server Error' });

    expect(service.loading()).toBe(false);
  });
});

describe('CartService — itemCount', () => {
  afterEach(() => localStorage.clear());

  it('sums quantities across lines, not the number of lines', async () => {
    const twoLines: Cart = {
      ...CART,
      items: [ITEM, { ...ITEM, id: 8, quantity: 3 }],
    };
    const { service } = await setupLoaded(twoLines);

    expect(service.itemCount()).toBe(5);
  });

  it('is zero before the cart has loaded', async () => {
    const { service, httpMock } = setup();
    expect(service.itemCount()).toBe(0);

    await Promise.resolve();
    httpMock.expectOne('/api/cart/').flush(CART);
  });
});

describe('CartService — addItem', () => {
  afterEach(() => localStorage.clear());

  it('posts the variant and quantity, then reloads the full cart', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | undefined;
    service.addItem(14, 2).subscribe((cart) => (result = cart));

    const post = httpMock.expectOne('/api/cart/items/');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ variant: 14, quantity: 2 });
    post.flush(ITEM, { status: 201, statusText: 'Created' });

    httpMock.expectOne('/api/cart/').flush(CART);

    expect(result).toEqual(CART);
    expect(service.cart()).toEqual(CART);
    httpMock.verify();
  });

  it('defaults the quantity to 1', async () => {
    const { service, httpMock } = await setupLoaded();

    service.addItem(14).subscribe();

    const post = httpMock.expectOne('/api/cart/items/');
    expect(post.request.body).toEqual({ variant: 14, quantity: 1 });
    post.flush(ITEM, { status: 201, statusText: 'Created' });
    httpMock.expectOne('/api/cart/').flush(CART);
    httpMock.verify();
  });
});

describe('CartService — updateItem / removeItem', () => {
  afterEach(() => localStorage.clear());

  it('patches the quantity, then reloads the full cart', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | undefined;
    service.updateItem(7, 4).subscribe((cart) => (result = cart));

    const patch = httpMock.expectOne('/api/cart/items/7/');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ quantity: 4 });
    patch.flush({ ...ITEM, quantity: 4 });

    httpMock.expectOne('/api/cart/').flush(CART);

    expect(result).toEqual(CART);
    httpMock.verify();
  });

  it('reloads the full cart even when the line was removed (204, no body)', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | undefined;
    service.updateItem(7, 0).subscribe((cart) => (result = cart));

    httpMock.expectOne('/api/cart/items/7/').flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne('/api/cart/').flush(EMPTY_CART);

    expect(result).toEqual(EMPTY_CART);
    httpMock.verify();
  });

  it('deletes the line, then reloads the full cart', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | undefined;
    service.removeItem(7).subscribe((cart) => (result = cart));

    const del = httpMock.expectOne('/api/cart/items/7/');
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    httpMock.expectOne('/api/cart/').flush(EMPTY_CART);

    expect(result).toEqual(EMPTY_CART);
    httpMock.verify();
  });
});

describe('CartService — vouchers', () => {
  afterEach(() => localStorage.clear());

  it('applies a voucher and stores the returned cart directly, without a reload', async () => {
    const { service, httpMock } = await setupLoaded();
    const withVoucher: Cart = {
      ...CART,
      voucher: { code: 'TEN', description: '', discount_type: 'PERCENT', value: '10.00' },
    };

    let result: Cart | undefined;
    service.applyVoucher('ten').subscribe((cart) => (result = cart));

    const req = httpMock.expectOne('/api/cart/apply-voucher/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'ten' });
    req.flush(withVoucher);

    expect(result).toEqual(withVoucher);
    expect(service.cart()).toEqual(withVoucher);
    httpMock.verify();
  });

  it('removes the voucher and stores the returned cart directly, without a reload', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | undefined;
    service.removeVoucher().subscribe((cart) => (result = cart));

    const req = httpMock.expectOne('/api/cart/voucher/');
    expect(req.request.method).toBe('DELETE');
    req.flush(CART);

    expect(result).toEqual(CART);
    httpMock.verify();
  });
});

describe('CartService — guest cart token', () => {
  afterEach(() => localStorage.clear());

  it('starts with whatever token was already in storage', async () => {
    localStorage.setItem('jory.cart.token', 'stored-token');
    const { service } = await setupLoaded();

    expect(service.cartToken).toBe('stored-token');
  });

  it('does not read localStorage on the server', async () => {
    localStorage.setItem('jory.cart.token', 'stored-token');
    const { service, httpMock } = setup('server');

    await Promise.resolve();
    expect(service.cartToken).toBeNull();
    httpMock.verify();
  });

  it('setCartToken persists to storage and clearing removes it', async () => {
    const { service } = await setupLoaded();

    service.setCartToken('new-token');
    expect(service.cartToken).toBe('new-token');
    expect(localStorage.getItem('jory.cart.token')).toBe('new-token');

    service.setCartToken(null);
    expect(service.cartToken).toBeNull();
    expect(localStorage.getItem('jory.cart.token')).toBeNull();
  });
});

describe('CartService — mergeGuestCart', () => {
  afterEach(() => localStorage.clear());

  it('is a no-op when there is no guest token on hand', async () => {
    const { service, httpMock } = await setupLoaded();

    let result: Cart | null | undefined;
    service.mergeGuestCart().subscribe((cart) => (result = cart));

    expect(result).toBeNull();
    httpMock.verify();
  });

  it('posts the stored guest token, stores the merged cart, and discards the token', async () => {
    localStorage.setItem('jory.cart.token', 'guest-token-123');
    const { service, httpMock } = await setupLoaded();

    let result: Cart | null | undefined;
    service.mergeGuestCart().subscribe((cart) => (result = cart));

    const req = httpMock.expectOne('/api/cart/merge/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cart_token: 'guest-token-123' });
    req.flush(CART);

    expect(result).toEqual(CART);
    expect(service.cart()).toEqual(CART);
    expect(service.cartToken).toBeNull();
    expect(localStorage.getItem('jory.cart.token')).toBeNull();
    httpMock.verify();
  });
});
