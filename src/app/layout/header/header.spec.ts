import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AR } from '../../core/i18n/ar';
import { EN } from '../../core/i18n/en';
import { LOCALE_COOKIE } from '../../core/i18n/locale';
import { TranslationService } from '../../core/i18n/translation.service';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;

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
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
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
    expect(cartTotal().textContent.trim()).toBe('0');
    expect(cartTotal().querySelector('svg.riyal-symbol')).toBeTruthy();

    TestBed.inject(TranslationService).setLocale('en');
    await fixture.whenStable();

    expect(cartTotal().textContent.trim()).toBe('0');
    expect(cartTotal().querySelector('svg.riyal-symbol')).toBeTruthy();
  });
});
