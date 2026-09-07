import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { Copy } from '../../core/i18n/en';
import { TranslationService } from '../../core/i18n/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { AuthModal, AuthModalMode } from '../../shared/components/auth-modal/auth-modal';
import { RiyalSymbol } from '../../shared/components/riyal-symbol/riyal-symbol';

/**
 * A top level nav entry. `mega` marks the single item that opens the panel.
 * Labels are held as copy-deck keys rather than strings, so a bad key is a
 * compile error and the nav re-renders on a language switch for free.
 */
interface NavItem {
  key: keyof Copy;
  link: string;
  exact: boolean;
  mega: boolean;
}

/** One link inside the mega panel. */
interface MegaLink {
  key: keyof Copy;
  link: string;
  queryParams?: Record<string, string>;
}

/** One column of the mega panel. The fourth grid cell is the promo card. */
interface MegaColumn {
  titleKey: keyof Copy;
  links: MegaLink[];
}

/**
 * Site chrome. Owns the route map, the shop mega panel, the cart strip and the
 * language switch. Copy comes from `TranslationService`, counts from
 * `CartService`.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, RiyalSymbol, AuthModal],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly user = this.authService.user;
  readonly isAuthenticated = this.authService.isAuthenticated;

  /** `null` keeps the modal out of the DOM entirely when it's closed. */
  readonly authModalMode = signal<AuthModalMode | null>(null);

  /** Hover opens the panel on desktop, the burger toggles it on mobile. */
  readonly menuOpen = signal(false);

  readonly nav: readonly NavItem[] = [
    { key: 'navHome', link: '/', exact: true, mega: false },
    { key: 'navCoffee', link: '/shop', exact: false, mega: true },
    { key: 'wishlist', link: '/wishlist', exact: false, mega: false },
    { key: 'orders', link: '/orders', exact: false, mega: false },
    { key: 'account', link: '/account/profile', exact: false, mega: false },
  ];

  readonly megaColumns: readonly MegaColumn[] = [
    {
      titleKey: 'megaOrigins',
      links: [
        { key: 'originUganda', slug: 'uganda' },
        { key: 'originColombia', slug: 'colombia' },
        { key: 'originEthiopia', slug: 'ethiopia' },
        { key: 'originBrazil', slug: 'brazil' },
        { key: 'originKenya', slug: 'kenya' },
      ].map(({ key, slug }) => ({
        key: key as keyof Copy,
        link: '/shop',
        queryParams: { origin: slug },
      })),
    },
    {
      titleKey: 'megaBrew',
      links: [
        { key: 'brewEspresso', slug: 'espresso' },
        { key: 'brewV60', slug: 'v60' },
        { key: 'brewChemex', slug: 'chemex' },
        { key: 'brewFrench', slug: 'french-press' },
      ].map(({ key, slug }) => ({
        key: key as keyof Copy,
        link: '/shop',
        queryParams: { brew: slug },
      })),
    },
    {
      titleKey: 'megaShop',
      links: [
        { key: 'megaAllCoffee', link: '/shop' },
        { key: 'megaCategories', link: '/shop/categories' },
        { key: 'megaYourCart', link: '/cart' },
        { key: 'megaYourWishlist', link: '/wishlist' },
      ],
    },
  ];

  readonly cartCount = this.cartService.itemCount;

  readonly cartTotal = computed(() => this.cartService.cart()?.totals.subtotal ?? '0.00');

  toggleLanguage(): void {
    this.translation.toggle();
  }

  /** Pointer move across the bar: the shop item opens the panel, the rest shut it. */
  syncMenu(item: NavItem): void {
    this.menuOpen.set(item.mega);
  }

  /** Keyboard focus only ever opens, so tabbing onward doesn't yank the panel away. */
  openMenu(item: NavItem): void {
    if (item.mega) {
      this.menuOpen.set(true);
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openLogin(): void {
    this.authModalMode.set('login');
  }

  closeAuthModal(): void {
    this.authModalMode.set(null);
  }

  /** Fires only on a real login/register in this session, never on session
   * restore — exactly when a guest cart might exist and need folding in. */
  onAuthenticated(): void {
    this.closeAuthModal();
    this.cartService.mergeGuestCart().subscribe();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
