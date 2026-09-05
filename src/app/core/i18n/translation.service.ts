import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  Injectable,
  PLATFORM_ID,
  REQUEST,
  TransferState,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';

import { AR } from './ar';
import { EN } from './en';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  Locale,
  isLocale,
  parseAcceptLanguage,
  readCookie,
} from './locale';

/**
 * Carries the locale the server settled on across to the client, so hydration
 * cannot land on a different answer than the HTML was rendered with.
 */
const LOCALE_KEY = makeStateKey<Locale>('jory.locale');

/**
 * The one place the active language lives.
 *
 * Resolution runs once, at construction, and differs by platform:
 *
 *   server — cookie → Accept-Language → default
 *   client — TransferState → cookie → navigator → default
 *
 * The cookie (not localStorage) is what makes this SSR-safe: the server can read
 * it, so a returning visitor's first paint is already in the right language and
 * the right direction.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly request = inject(REQUEST, { optional: true });

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly current = signal<Locale>(DEFAULT_LOCALE);

  /** Read-only on purpose: `setLocale` is the only mutator, so it can also keep
   * the document's `dir` in step without an effect having to flush first. */
  readonly locale = this.current.asReadonly();

  readonly dir = computed<'rtl' | 'ltr'>(() => (this.locale() === 'ar' ? 'rtl' : 'ltr'));

  /** Templates read `t().someKey` — a property access, so a typo fails the build. */
  readonly t = computed(() => (this.locale() === 'ar' ? AR : EN));

  constructor() {
    this.current.set(this.resolve());

    if (!this.isBrowser) {
      this.transferState.set(LOCALE_KEY, this.locale());
    }

    this.applyToDocument(this.locale());
  }

  setLocale(locale: Locale): void {
    if (locale === this.locale()) {
      return;
    }

    this.current.set(locale);
    this.applyToDocument(locale);
    this.persist(locale);
  }

  toggle(): void {
    this.setLocale(this.locale() === 'ar' ? 'en' : 'ar');
  }

  private resolve(): Locale {
    if (this.isBrowser) {
      const transferred = this.transferState.get(LOCALE_KEY, null);
      if (isLocale(transferred)) {
        return transferred;
      }

      const stored = readCookie(this.document.cookie, LOCALE_COOKIE);
      if (isLocale(stored)) {
        return stored;
      }

      return parseAcceptLanguage(navigator.languages?.join(',')) ?? DEFAULT_LOCALE;
    }

    const headers = this.request?.headers;
    const stored = readCookie(headers?.get('cookie'), LOCALE_COOKIE);
    if (isLocale(stored)) {
      return stored;
    }

    return parseAcceptLanguage(headers?.get('accept-language')) ?? DEFAULT_LOCALE;
  }

  /**
   * `dir` on the root element is what mirrors the layout — every logical property
   * in the stylesheets keys off it, so no direction-specific CSS is needed.
   */
  private applyToDocument(locale: Locale): void {
    const root = this.document.documentElement;
    if (!root) {
      return;
    }

    root.setAttribute('lang', locale);
    root.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }

  private persist(locale: Locale): void {
    if (!this.isBrowser) {
      return;
    }

    this.document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}
