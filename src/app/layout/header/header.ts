import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, of, shareReplay } from 'rxjs';

import type { Copy } from '../../core/i18n/en';
import { TranslationService } from '../../core/i18n/translation.service';
import { Category, Origin } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthModal } from '../../shared/components/auth-modal/auth-modal';
// `import type`, not a value import: `AuthModal` is the only runtime symbol
// this file needs from that module, and it appears only inside `@defer` in
// header.html — a mixed-value import from the same specifier would stop the
// compiler from splitting it (and its phone-input library) out of the eager
// bundle.
import type { AuthModalMode } from '../../shared/components/auth-modal/auth-modal';
import { RiyalSymbol } from '../../shared/components/riyal-symbol/riyal-symbol';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { SearchBox } from '../../shared/components/search-box/search-box';
import { SOCIAL_LINKS } from '../../shared/social-links';

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
 * A link on the browse bar that is not a catalog category — the evergreen
 * entries that sit either side of the live ones.
 */
interface BrowseLink {
  key: keyof Copy;
  link: string;
  queryParams?: Record<string, string>;
}

/** An entry in the account dropdown. */
interface AccountLink {
  key: keyof Copy;
  link: string;
}

/**
 * A mega-panel link built from live API data rather than a translation key —
 * the label is already in the current locale, so it's rendered as-is.
 */
interface DataMegaLink {
  label: string;
  link: string;
  queryParams: Record<string, string>;
}

/** How many root categories the browse bar shows before the rest fall into the
 * mega panel. Beyond this the bar wraps and stops reading as one line. */
const BROWSE_CATEGORY_LIMIT = 5;

/** How many origins the mega panel's origins column shows. */
const MEGA_ORIGIN_LIMIT = 5;

/** Long enough to read a short line twice over. */
const ANNOUNCE_INTERVAL_MS = 6000;

/**
 * Site chrome, in three bars:
 *
 *   1. utility — socials, the rotating announcement, the language switch
 *   2. main    — logo, search, account, cart
 *   3. browse  — the category mega panel and the live category list
 *
 * The split exists because the old single bar mixed three unrelated jobs.
 * Account destinations (orders, wishlist, profile) in particular were sitting in
 * top level nav, crowding out the shopping links a storefront nav is for; they
 * now live behind the account button in bar 2.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, RiyalSymbol, PricePipe, AuthModal, SearchBox],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly user = this.authService.user;
  readonly isAuthenticated = this.authService.isAuthenticated;

  /** `null` keeps the modal out of the DOM entirely when it's closed. */
  readonly authModalMode = signal<AuthModalMode | null>(null);

  /** Hover opens the mega panel on desktop, the burger toggles it on mobile. */
  readonly menuOpen = signal(false);

  /** The account dropdown, which is click-driven — a hover menu holding a
   * logout button is too easy to trigger by accident. */
  readonly accountOpen = signal(false);

  /** The logged-out login/register dropdown. Hover-driven, unlike the account
   * menu above — there's no destructive action here to trigger by accident. */
  readonly loginMenuOpen = signal(false);

  /** The mobile drawer, standing in for bars 1 and 3 on a narrow screen. */
  readonly drawerOpen = signal(false);

  readonly socials = SOCIAL_LINKS;

  /**
   * The utility strip rotates through these. Three short lines beat one long
   * one: each gets read on its own rather than scanned past as a banner.
   */
  readonly announcements: readonly (keyof Copy)[] = ['announce', 'announceRoast', 'announceTrack'];

  readonly announceIndex = signal(0);

  /** Hover or focus holds the current message, so the strip can't rotate out
   * from under someone in the middle of reading it. */
  readonly announcePaused = signal(false);

  readonly browseLead: readonly BrowseLink[] = [{ key: 'megaAllCoffee', link: '/shop' }];

  readonly browseTail: readonly BrowseLink[] = [
    { key: 'browseOffers', link: '/shop', queryParams: { on_sale: 'true' } },
    { key: 'browseNew', link: '/shop', queryParams: { ordering: '-created_at' } },
  ];

  readonly accountLinks: readonly AccountLink[] = [
    { key: 'profile', link: '/account/profile' },
    { key: 'orders', link: '/orders' },
    { key: 'wishlist', link: '/wishlist' },
    { key: 'addresses', link: '/account/addresses' },
  ];

  /**
   * The live taxonomy, for the browse bar and the mega panel's first column.
   *
   * A failure degrades to an empty list rather than an error: the bar simply
   * renders its hardcoded links, which is a far better outcome than the whole
   * site chrome failing over a nav decoration. `shareReplay` keeps the header's
   * two consumers (bar and drawer) on one request.
   */
  private readonly categories = toSignal(
    this.catalog.listCategories().pipe(
      catchError(() => of<Category[]>([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
    { initialValue: [] as Category[] },
  );

  readonly browseCategories = computed(() => this.categories().slice(0, BROWSE_CATEGORY_LIMIT));

  /**
   * The mega panel's origins column. Same degrade-to-empty approach as
   * `categories` above, and the same `shareReplay` reasoning.
   */
  private readonly origins = toSignal(
    this.catalog.listOrigins().pipe(
      catchError(() => of<Origin[]>([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
    { initialValue: [] as Origin[] },
  );

  readonly megaOriginLinks = computed<readonly DataMegaLink[]>(() =>
    this.origins()
      .slice(0, MEGA_ORIGIN_LIMIT)
      .map((origin) => ({
        label: origin.name,
        link: '/shop',
        queryParams: { origin: origin.slug },
      })),
  );

  /** Whether the column is hiding origins behind its limit — the "all origins"
   * link at the foot of the column only earns its place if it is. */
  readonly hasMoreOrigins = computed(() => this.origins().length > MEGA_ORIGIN_LIMIT);

  /** Which browse-bar category's children dropdown is open, if any. Hover-driven
   * and single-select — opening one implicitly closes any other. */
  readonly openCategoryId = signal<number | null>(null);

  /** Everything, for the panel — the bar shows a slice, the panel the rest. */
  readonly allCategories = this.categories;

  /** Title for the live-data origins column, rendered separately from `megaColumns`
   * below since its links carry a rendered label rather than a translation key. */
  readonly megaOriginsTitleKey: keyof Copy = 'megaOrigins';

  readonly megaColumns: readonly MegaColumn[] = [
    {
      titleKey: 'megaShop',
      links: [
        { key: 'megaAllCoffee', link: '/shop' },
        { key: 'megaCategories', link: '/shop/categories' },
        { key: 'megaAllOrigins', link: '/shop/origins' },
        { key: 'megaYourCart', link: '/cart' },
        { key: 'megaYourWishlist', link: '/wishlist' },
      ],
    },
  ];

  readonly cartCount = this.cartService.itemCount;

  readonly cartTotal = computed(() => this.cartService.cart()?.totals.subtotal ?? '0.00');

  constructor() {
    // Browser only: the server renders the first message and stops there, which
    // is also what a visitor with JS disabled keeps.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => {
        if (!this.announcePaused()) {
          this.stepAnnounce(1);
        }
      }, ANNOUNCE_INTERVAL_MS);

      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  toggleLanguage(): void {
    this.translation.toggle();
    window.location.reload()
  }

  /** Wraps, so the strip cycles rather than dead-ending on the last message. */
  stepAnnounce(delta: number): void {
    const total = this.announcements.length;
    this.announceIndex.update((index) => (index + delta + total) % total);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.accountOpen.set(false);
  }

  openMenu(): void {
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openCategoryDropdown(categoryId: number): void {
    this.openCategoryId.set(categoryId);
  }

  closeCategoryDropdown(): void {
    this.openCategoryId.set(null);
  }

  /**
   * The account menu opens on click, so it closes on a click elsewhere — not on
   * pointer-leave. Hover-to-close left an 8px dead strip between the button and
   * the menu that dismissed the menu on the way to it.
   */
  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Element && !target.closest('.header__account')) {
      this.closeAccount();
    }
  }

  toggleAccount(): void {
    this.accountOpen.update((open) => !open);
    this.menuOpen.set(false);
  }

  closeAccount(): void {
    this.accountOpen.set(false);
  }

  toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  /** Escape and pointer-exit both mean "put everything away". */
  closeAll(): void {
    this.menuOpen.set(false);
    this.accountOpen.set(false);
    this.loginMenuOpen.set(false);
    this.openCategoryId.set(null);
  }

  openLogin(mode: AuthModalMode = 'login'): void {
    this.authModalMode.set(mode);
    this.accountOpen.set(false);
    this.drawerOpen.set(false);
    this.loginMenuOpen.set(false);
  }

  openLoginMenu(): void {
    this.loginMenuOpen.set(true);
  }

  closeLoginMenu(): void {
    this.loginMenuOpen.set(false);
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
    this.closeAll();
    this.closeDrawer();
    this.authService.logout().subscribe();
  }
}
