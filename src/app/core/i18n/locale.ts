/** The two languages the storefront ships in. Arabic is the fallback. */
export type Locale = 'ar' | 'en';

export const LOCALES: readonly Locale[] = ['ar', 'en'];

/** Chosen because a Riyadh roastery's visitors default to Arabic, not English. */
export const DEFAULT_LOCALE: Locale = 'ar';

/** Read on the server as well as the client, which is why this is not localStorage. */
export const LOCALE_COOKIE = 'jory_locale';

/** A year. Long enough that a returning customer never sees the wrong language first. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}

/**
 * Pull one cookie out of a `document.cookie` or request `Cookie` header string.
 * Both use the same `a=1; b=2` shape, so one parser serves the server and the
 * browser.
 */
export function readCookie(source: string | null | undefined, name: string): string | null {
  if (!source) {
    return null;
  }

  for (const pair of source.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }

    if (pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }

  return null;
}

/**
 * Pick a supported locale out of an `Accept-Language` header, honouring the
 * q-values so `en;q=0.9, ar;q=0.8` resolves to English rather than to whichever
 * tag happens to come first.
 *
 * Returns null when the header names no language we ship, leaving the choice to
 * the caller's fallback.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) {
    return null;
  }

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='))
        ?.slice(2);

      const weight = quality === undefined ? 1 : Number.parseFloat(quality);
      return { tag: tag.trim().toLowerCase(), weight: Number.isNaN(weight) ? 0 : weight };
    })
    .filter((entry) => entry.tag !== '' && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const { tag } of ranked) {
    // `ar-SA` and `en-GB` should match too, so compare the primary subtag.
    const primary = tag.split('-')[0];
    if (isLocale(primary)) {
      return primary;
    }
  }

  return null;
}
