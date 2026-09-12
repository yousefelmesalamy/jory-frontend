import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AR } from '../../core/i18n/ar';
import { EN } from '../../core/i18n/en';
import { LOCALE_COOKIE } from '../../core/i18n/locale';
import { TranslationService } from '../../core/i18n/translation.service';
import { Category, Origin, User } from '../../core/models';
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

function category(id: number, name: string, slug: string): Category {
  return { id, name, slug, description: '', image: null, display_order: id, children: [] };
}

const CATEGORIES: Category[] = [category(1, 'Beans', 'beans'), category(2, 'Grinders', 'grinders')];

function origin(id: number, name: string, slug: string): Origin {
  return { id, name, slug };
}

const ORIGINS: Origin[] = [origin(1, 'Uganda', 'uganda'), origin(2, 'Colombia', 'colombia')];

/** One more than `MEGA_ORIGIN_LIMIT`, so the column has to hide one. */
const MANY_ORIGINS: Origin[] = [
  ...ORIGINS,
  origin(3, 'Ethiopia', 'ethiopia'),
  origin(4, 'Brazil', 'brazil'),
  origin(5, 'Kenya', 'kenya'),
  origin(6, 'Rwanda', 'rwanda'),
];

/**
 * Drains the three calls the header makes on construction — the cart, the
 * taxonomy the browse bar renders, and the origins the mega panel lists. All
 * must be answered before any assertion, or `httpMock.verify()` fails on the
 * leftover.
 */
async function bootstrap(
  fixture: ComponentFixture<Header>,
  httpMock: HttpTestingController,
  categories: Category[] = CATEGORIES,
  origins: Origin[] = ORIGINS,
): Promise<void> {
  await fixture.whenStable();
  httpMock.expectOne('/api/cart/').flush(EMPTY_CART);
  httpMock.expectOne('/api/categories/').flush(categories);
  httpMock.expectOne('/api/origins/').flush(origins);
  await fixture.whenStable();
}

/**
 * The rendered links of the mega panel's origins column, found by its title
 * rather than its position — the columns are undifferentiated `div`s, and an
 * index would silently follow the wrong one if a column were ever inserted.
 */
function originColumnLabels(fixture: ComponentFixture<Header>): string[] {
  const title = [...fixture.nativeElement.querySelectorAll('.header__mega-title')].find(
    (el) => (el as HTMLElement).textContent!.trim() === AR.megaOrigins,
  ) as HTMLElement | undefined;

  return [...(title?.parentElement?.querySelectorAll('.header__mega-link') ?? [])].map((link) =>
    (link as HTMLElement).textContent!.trim(),
  );
}

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let httpMock: HttpTestingController;

  function browseLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.header__browse-link')].map((link) =>
      (link as HTMLElement).textContent!.trim(),
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
    await bootstrap(fixture, httpMock);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders all three bars', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__utility')).toBeTruthy();
    expect(el.querySelector('.header__main')).toBeTruthy();
    expect(el.querySelector('.header__browse')).toBeTruthy();
  });

  it('puts the search box in the main bar', () => {
    expect(fixture.nativeElement.querySelector('app-search-box')).toBeTruthy();
  });

  it('lists the live categories on the browse bar, framed by the fixed links', () => {
    expect(browseLabels()).toEqual([
      AR.megaAllCoffee,
      'Beans',
      'Grinders',
      AR.browseOffers,
      AR.browseNew,
    ]);
  });

  it('keeps account destinations out of the browse bar', () => {
    const labels = browseLabels();
    for (const accountLabel of [AR.orders, AR.wishlist, AR.profile, AR.addresses]) {
      expect(labels).not.toContain(accountLabel);
    }
  });

  it('offers the other language on the switch button', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.header__lang');
    expect(button.textContent!.trim()).toBe(AR.langSwitch);

    button.click();
    await fixture.whenStable();

    expect(button.textContent!.trim()).toBe(EN.langSwitch);
  });

  // Bar 1 is hidden below 820px, so the drawer is the only route to the switch
  // on a phone. It carries the other two bar-1 affordances already; without the
  // language switch too, a mobile visitor cannot change language at all.
  it('offers the language switch inside the mobile drawer', async () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__drawer')).toBeNull();

    (el.querySelector('.header__burger') as HTMLButtonElement).click();
    await fixture.whenStable();

    const button = el.querySelector('.header__drawer-lang') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent!.trim()).toBe(AR.langSwitch);

    button.click();
    await fixture.whenStable();

    expect(TestBed.inject(TranslationService).locale()).toBe('en');
  });

  it('re-renders every label when the language switches', async () => {
    fixture.nativeElement.querySelector('.header__lang').click();
    await fixture.whenStable();

    expect(browseLabels()).toEqual([
      EN.megaAllCoffee,
      'Beans',
      'Grinders',
      EN.browseOffers,
      EN.browseNew,
    ]);
  });

  it('translates the mega panel and the promo card', () => {
    const titles = [...fixture.nativeElement.querySelectorAll('.header__mega-title')].map((el) =>
      (el as HTMLElement).textContent!.trim(),
    );
    // The two live-data columns lead — categories, then origins — and the
    // hardcoded shop column closes.
    expect(titles).toEqual([AR.megaCategories, AR.megaOrigins, AR.megaShop]);

    expect(fixture.nativeElement.querySelector('.header__promo-title').textContent.trim()).toBe(
      AR.megaPromoTitle,
    );
  });

  it('links the shop column to the origins index', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.header__mega-link[href="/shop/origins"]',
    );
    expect(link).toBeTruthy();
    expect(link.textContent!.trim()).toBe(AR.megaAllOrigins);
  });

  it('lists the live origins without an overflow link while they all fit', () => {
    const labels = originColumnLabels(fixture);
    expect(labels).toEqual(['Uganda', 'Colombia']);
    expect(fixture.nativeElement.querySelector('.header__mega-link--more')).toBeNull();
  });

  it('opens the mega panel from the browse trigger and closes it again', async () => {
    const trigger: HTMLButtonElement =
      fixture.nativeElement.querySelector('.header__browse-trigger');
    const panel = () => fixture.nativeElement.querySelector('.header__mega');

    expect(panel().classList).not.toContain('is-open');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await fixture.whenStable();

    expect(panel().classList).toContain('is-open');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    trigger.click();
    await fixture.whenStable();

    expect(panel().classList).not.toContain('is-open');
  });

  it('keeps the mega panel open while the pointer travels from bar 3 into it', async () => {
    const panel = () => fixture.nativeElement.querySelector('.header__mega');
    fixture.nativeElement.querySelector('.header__browse-trigger').click();
    await fixture.whenStable();
    expect(panel().classList).toContain('is-open');

    // The panel is a sibling of bar 3, so reaching it means leaving bar 3.
    // That crossing must not close what the pointer is heading for.
    fixture.nativeElement
      .querySelector('.header__browse')
      .dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();

    expect(panel().classList).toContain('is-open');
  });

  it('closes the mega panel once the pointer leaves the browse shell entirely', async () => {
    const panel = () => fixture.nativeElement.querySelector('.header__mega');
    fixture.nativeElement.querySelector('.header__browse-trigger').click();
    await fixture.whenStable();

    fixture.nativeElement
      .querySelector('.header__browse-shell')
      .dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();

    expect(panel().classList).not.toContain('is-open');
  });

  it('shows the cart total with the currency mark', async () => {
    const cartTotal = () => fixture.nativeElement.querySelector('.header__cart-total');
    expect(cartTotal().textContent.trim()).toBe('0 ل.س');
    expect(cartTotal().querySelector('span.riyal-symbol')).toBeTruthy();

    TestBed.inject(TranslationService).setLocale('en');
    await fixture.whenStable();

    expect(cartTotal().textContent.trim()).toBe('0 S.P');
    expect(cartTotal().querySelector('span.riyal-symbol')).toBeTruthy();
  });
});

describe('Header — announcement strip', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    await bootstrap(fixture, TestBed.inject(HttpTestingController));
  });

  afterEach(() => localStorage.clear());

  function message(): string {
    return fixture.nativeElement.querySelector('.header__announce-text').textContent.trim();
  }

  async function step(direction: 'prev' | 'next'): Promise<void> {
    const buttons = fixture.nativeElement.querySelectorAll('.header__announce-step');
    (buttons[direction === 'prev' ? 0 : 1] as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  it('opens on the first message', () => {
    expect(message()).toBe(EN.announce);
  });

  it('advances to the next message', async () => {
    await step('next');
    expect(message()).toBe(EN.announceRoast);
  });

  it('wraps backwards from the first message to the last', async () => {
    await step('prev');
    expect(message()).toBe(EN.announceTrack);
  });

  it('wraps forwards off the end', async () => {
    await step('next');
    await step('next');
    await step('next');
    expect(message()).toBe(EN.announce);
  });
});

describe('Header — more origins than the column shows', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
    Object.defineProperty(navigator, 'languages', { value: ['ar-SA'], configurable: true });

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    await bootstrap(fixture, TestBed.inject(HttpTestingController), CATEGORIES, MANY_ORIGINS);
  });

  afterEach(() => localStorage.clear());

  it('caps the column and sends the rest to the origins index', () => {
    expect(originColumnLabels(fixture)).toEqual([
      'Uganda',
      'Colombia',
      'Ethiopia',
      'Brazil',
      'Kenya',
      AR.megaAllOrigins,
    ]);

    const more: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.header__mega-link--more',
    );
    expect(more.getAttribute('href')).toBe('/shop/origins');
  });
});

describe('Header — degraded catalog', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    const httpMock = TestBed.inject(HttpTestingController);

    await fixture.whenStable();
    httpMock.expectOne('/api/cart/').flush(EMPTY_CART);
    httpMock.expectOne('/api/categories/').flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('/api/origins/').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
  });

  afterEach(() => localStorage.clear());

  it('still renders the browse bar when the taxonomy call fails', () => {
    const labels = [...fixture.nativeElement.querySelectorAll('.header__browse-link')].map((link) =>
      (link as HTMLElement).textContent!.trim(),
    );
    expect(labels).toEqual([EN.megaAllCoffee, EN.browseOffers, EN.browseNew]);
  });
});

describe('Header — auth', () => {
  let fixture: ComponentFixture<Header>;
  let httpMock: HttpTestingController;

  async function openAccountMenu(): Promise<void> {
    (fixture.nativeElement.querySelector('.header__account-button') as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    httpMock = TestBed.inject(HttpTestingController);
    await bootstrap(fixture, httpMock);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows only a login button when signed out', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__account-login')?.textContent?.trim()).toBe(EN.authLogin);
    expect(el.querySelector('.header__account-button')).toBeNull();
    expect(el.querySelector('.header__account-menu')).toBeNull();
  });

  it('swaps the login button for the account menu once signed in', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.header__account-login')).toBeNull();
    expect(el.querySelector('.header__account-name')?.textContent).toContain(USER.full_name);
  });

  it('keeps the account menu closed until it is asked for', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.header__account-menu')).toBeNull();

    await openAccountMenu();

    const items = [...fixture.nativeElement.querySelectorAll('.header__account-item')].map((el) =>
      (el as HTMLElement).textContent!.trim(),
    );
    expect(items).toEqual([EN.profile, EN.orders, EN.wishlist, EN.addresses]);
  });

  it('keeps the account menu open when the pointer crosses the gap below the button', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();
    await openAccountMenu();

    fixture.nativeElement
      .querySelector('.header__account')
      .dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.header__account-menu')).toBeTruthy();
  });

  it('closes the account menu on a click elsewhere on the page', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();
    await openAccountMenu();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.header__account-menu')).toBeNull();
  });

  it('does not close the account menu on a click inside it', async () => {
    TestBed.inject(AuthService).user.set(USER);
    await fixture.whenStable();
    await openAccountMenu();

    fixture.nativeElement
      .querySelector('.header__account-menu')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.header__account-menu')).toBeTruthy();
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
    await openAccountMenu();

    (fixture.nativeElement.querySelector('.header__account-logout') as HTMLButtonElement).click();

    httpMock
      .expectOne('/api/auth/logout/')
      .flush(null, { status: 205, statusText: 'Reset Content' });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(fixture.nativeElement.querySelector('.header__account-login')).toBeTruthy();

    httpMock.verify();
  });
});
