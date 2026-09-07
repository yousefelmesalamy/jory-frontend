import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AR } from '../../core/i18n/ar';
import { EN } from '../../core/i18n/en';
import { LOCALE_COOKIE } from '../../core/i18n/locale';
import { TranslationService } from '../../core/i18n/translation.service';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { Header } from './header';

const USER: User = {
  id: 12,
  email: 'shopper@example.com',
  username: 'shopper1',
  full_name: 'Jane Shopper',
  phone: '+201111111111',
  date_joined: '2026-09-05T10:00:00Z',
};

const EMPTY_CART = {
  id: 1,
  items: [],
  voucher: null,
  totals: { subtotal: '0.00', discount_total: '0.00', shipping_cost: '0.00', grand_total: '0.00' },
};

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let httpMock: HttpTestingController;

  function navLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.header__link')].map((link) =>
      (link as HTMLElement).textContent!.replace('▼', '').trim(),
    );
  }

  beforeEach(async () => {
    // A switch in one test persists a cookie the next one would resolve from.
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
    Object.defineProperty(navigator, 'languages', { value: ['ar-SA'], configurable: true });

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    // CartService loads its own cart on construction; drain that first.
    httpMock.expectOne('/api/cart/').flush(EMPTY_CART);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the nav in Arabic when Arabic is active', () => {
    expect(navLabels()).toEqual([AR.navHome, AR.navCoffee, AR.wishlist, AR.orders, AR.account]);
  });

  it('offers the other language on the switch button', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.header__lang');
    expect(button.textContent!.trim()).toBe(AR.langSwitch);

    button.click();
    await fixture.whenStable();

    expect(button.textContent!.trim()).toBe(EN.langSwitch);
  });

  it('re-renders every label when the language switches', async () => {
    fixture.nativeElement.querySelector('.header__lang').click();
    await fixture.whenStable();

    expect(navLabels()).toEqual([EN.navHome, EN.navCoffee, EN.wishlist, EN.orders, EN.account]);
  });

  it('translates the mega panel and the promo card', async () => {
    const titles = [...fixture.nativeElement.querySelectorAll('.header__mega-title')].map((el) =>
      (el as HTMLElement).textContent!.trim(),
    );
    expect(titles).toEqual([AR.megaOrigins, AR.megaBrew, AR.megaShop]);

    expect(fixture.nativeElement.querySelector('.header__promo-title').textContent.trim()).toBe(
      AR.megaPromoTitle,
    );
  });

  it('shows the cart total with the Riyal glyph', async () => {
    const cartTotal = () => fixture.nativeElement.querySelector('.header__cart-total');
    expect(cartTotal().textContent.trim()).toBe('0.00');
    expect(cartTotal().querySelector('svg.riyal-symbol')).toBeTruthy();

    TestBed.inject(TranslationService).setLocale('en');
    await fixture.whenStable();

    expect(cartTotal().textContent.trim()).toBe('0.00');
    expect(cartTotal().querySelector('svg.riyal-symbol')).toBeTruthy();
  });
});

describe('Header — auth', () => {
  let fixture: ComponentFixture<Header>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    // CartService loads its own cart on construction; drain that first.
    httpMock.expectOne('/api/cart/').flush(EMPTY_CART);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows only a login button when signed out', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__account-login')?.textContent?.trim()).toBe(EN.authLogin);
    expect(el.querySelector('.header__account-register')).toBeNull();
    expect(el.querySelector('.header__account-logout')).toBeNull();
  });

  it('shows a greeting and logout button once signed in', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__account-name')?.textContent).toContain(USER.full_name);
    expect(el.querySelector('.header__account-logout')).toBeTruthy();
    expect(el.querySelector('.header__account-login')).toBeNull();
  });

  it('opens the login modal from the navbar and closes it on request', async () => {
    const el: HTMLElement = fixture.nativeElement;

    (el.querySelector('.header__account-login') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-auth-modal')).toBeTruthy();

    (el.querySelector('.auth-modal__close') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-auth-modal')).toBeNull();
  });

  it('blacklists the refresh token and clears the session on logout', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.header__account-logout') as HTMLButtonElement).click();

    httpMock.expectOne('/api/auth/logout/').flush(null, { status: 205, statusText: 'Reset Content' });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(fixture.nativeElement.querySelector('.header__account-login')).toBeTruthy();

    httpMock.verify();
  });
});
