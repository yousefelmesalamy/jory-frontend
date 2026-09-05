import { isLocale, parseAcceptLanguage, readCookie } from './locale';

describe('isLocale', () => {
  it('accepts the two shipped languages', () => {
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('AR')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('a=1; jory_locale=en; b=2', 'jory_locale')).toBe('en');
  });

  it('finds a cookie that is first or last', () => {
    expect(readCookie('jory_locale=ar; a=1', 'jory_locale')).toBe('ar');
    expect(readCookie('a=1; jory_locale=ar', 'jory_locale')).toBe('ar');
  });

  it('returns null when the cookie is absent or the source is empty', () => {
    expect(readCookie('a=1; b=2', 'jory_locale')).toBeNull();
    expect(readCookie('', 'jory_locale')).toBeNull();
    expect(readCookie(null, 'jory_locale')).toBeNull();
    expect(readCookie(undefined, 'jory_locale')).toBeNull();
  });

  it('does not match a cookie whose name merely ends with the target', () => {
    expect(readCookie('other_jory_locale=en', 'jory_locale')).toBeNull();
  });

  it('decodes percent-encoded values', () => {
    expect(readCookie('x=a%20b', 'x')).toBe('a b');
  });

  it('skips malformed pairs rather than throwing', () => {
    expect(readCookie('novalue; jory_locale=en', 'jory_locale')).toBe('en');
  });
});

describe('parseAcceptLanguage', () => {
  it('takes the highest-weighted supported language, not the first listed', () => {
    expect(parseAcceptLanguage('fr;q=1.0, en;q=0.9, ar;q=0.8')).toBe('en');
    expect(parseAcceptLanguage('en;q=0.5, ar;q=0.9')).toBe('ar');
  });

  it('treats a tag without a q-value as weight 1', () => {
    expect(parseAcceptLanguage('ar, en;q=0.9')).toBe('ar');
    expect(parseAcceptLanguage('en')).toBe('en');
  });

  it('matches on the primary subtag so regional variants work', () => {
    expect(parseAcceptLanguage('ar-SA,ar;q=0.9')).toBe('ar');
    expect(parseAcceptLanguage('en-GB')).toBe('en');
  });

  it('ignores languages we do not ship', () => {
    expect(parseAcceptLanguage('fr-FR,de;q=0.8')).toBeNull();
  });

  it('ignores a supported language explicitly refused with q=0', () => {
    expect(parseAcceptLanguage('en;q=0, fr')).toBeNull();
  });

  it('returns null for absent or empty headers', () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage(undefined)).toBeNull();
    expect(parseAcceptLanguage('')).toBeNull();
  });

  it('falls back rather than throwing on a malformed q-value', () => {
    expect(parseAcceptLanguage('ar;q=notanumber, en')).toBe('en');
  });
});
