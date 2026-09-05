import { DOCUMENT, PLATFORM_ID, REQUEST, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AR } from './ar';
import { EN } from './en';
import { LOCALE_COOKIE, Locale } from './locale';
import { TranslationService } from './translation.service';

/**
 * jsdom drops `document.cookie` on an `about:blank` document and hardcodes
 * `navigator.languages` to English, so both inputs are faked here. Without that
 * these tests pass or fail on jsdom's defaults rather than on the service.
 */
function fakeDocument(initialCookie = ''): Document {
  let jar = initialCookie;
  const root = document.createElement('html');

  // A proxy rather than a literal: TransferState calls getElementById on whatever
  // DOCUMENT provides, so everything except the two faked members has to stay real.
  return new Proxy(document, {
    get(target, property) {
      if (property === 'cookie') {
        return jar;
      }
      if (property === 'documentElement') {
        return root;
      }

      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) {
      if (property !== 'cookie') {
        return Reflect.set(target, property, value, target);
      }

      const pair = String(value).split(';')[0];
      const name = pair.split('=')[0];
      const others = jar.split('; ').filter((entry) => entry && !entry.startsWith(`${name}=`));
      jar = [...others, pair].join('; ');
      return true;
    },
  });
}

function requestWith(headers: Record<string, string>): Request {
  return { headers: new Headers(headers) } as Request;
}

interface SetupOptions {
  platform?: 'browser' | 'server';
  doc?: Document;
  headers?: Record<string, string>;
  browserLanguages?: string[];
  transferred?: Locale;
}

function setup(options: SetupOptions = {}) {
  const doc = options.doc ?? fakeDocument();

  Object.defineProperty(navigator, 'languages', {
    value: options.browserLanguages ?? ['en-US', 'en'],
    configurable: true,
  });

  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
      { provide: DOCUMENT, useValue: doc },
      ...(options.headers ? [{ provide: REQUEST, useValue: requestWith(options.headers) }] : []),
    ],
  });

  if (options.transferred) {
    TestBed.inject(TransferState).set(makeStateKey<Locale>('jory.locale'), options.transferred);
  }

  return { service: TestBed.inject(TranslationService), doc };
}

describe('TranslationService — resolution on the server', () => {
  it('prefers the cookie over the Accept-Language header', () => {
    const { service } = setup({
      platform: 'server',
      headers: { cookie: `${LOCALE_COOKIE}=en`, 'accept-language': 'ar' },
    });

    expect(service.locale()).toBe('en');
  });

  it('falls back to Accept-Language when there is no cookie', () => {
    const { service } = setup({
      platform: 'server',
      headers: { 'accept-language': 'ar-SA,ar;q=0.9,en;q=0.5' },
    });

    expect(service.locale()).toBe('ar');
  });

  it('falls back to Arabic when the request says nothing useful', () => {
    const { service } = setup({ platform: 'server', headers: { 'accept-language': 'fr-FR' } });

    expect(service.locale()).toBe('ar');
  });

  it('publishes its answer for the client to hydrate with', () => {
    setup({ platform: 'server', headers: { 'accept-language': 'en' } });

    expect(TestBed.inject(TransferState).get(makeStateKey<Locale>('jory.locale'), null)).toBe('en');
  });

  it('does not try to write a cookie', () => {
    const { service, doc } = setup({ platform: 'server', headers: {} });

    service.setLocale('en');

    expect(doc.cookie).toBe('');
  });
});

describe('TranslationService — resolution in the browser', () => {
  it('trusts the locale transferred from the server above all else', () => {
    const { service } = setup({
      transferred: 'ar',
      doc: fakeDocument(`${LOCALE_COOKIE}=en`),
      browserLanguages: ['en-US'],
    });

    expect(service.locale()).toBe('ar');
  });

  it('prefers the cookie over the browser languages', () => {
    const { service } = setup({
      doc: fakeDocument(`${LOCALE_COOKIE}=ar`),
      browserLanguages: ['en-US', 'en'],
    });

    expect(service.locale()).toBe('ar');
  });

  it('falls through to the browser languages when the cookie holds junk', () => {
    const { service } = setup({
      doc: fakeDocument(`${LOCALE_COOKIE}=fr`),
      browserLanguages: ['en-US', 'en'],
    });

    expect(service.locale()).toBe('en');
  });

  it('reads an Arabic browser preference on a first visit', () => {
    expect(setup({ browserLanguages: ['ar-SA', 'ar'] }).service.locale()).toBe('ar');
  });

  it('reads an English browser preference on a first visit', () => {
    expect(setup({ browserLanguages: ['en-GB'] }).service.locale()).toBe('en');
  });

  it('falls back to Arabic when the browser names no language we ship', () => {
    expect(setup({ browserLanguages: ['fr-FR', 'de'] }).service.locale()).toBe('ar');
  });
});

describe('TranslationService — switching', () => {
  it('swaps the copy deck and the direction together', () => {
    const { service } = setup({ browserLanguages: ['ar'] });

    expect(service.dir()).toBe('rtl');
    expect(service.t()).toBe(AR);

    service.setLocale('en');

    expect(service.dir()).toBe('ltr');
    expect(service.t()).toBe(EN);
  });

  it('toggles back and forth', () => {
    const { service } = setup({ browserLanguages: ['ar'] });

    service.toggle();
    expect(service.locale()).toBe('en');

    service.toggle();
    expect(service.locale()).toBe('ar');
  });

  it('writes lang and dir onto the root element', () => {
    const { service, doc } = setup({ browserLanguages: ['ar'] });

    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(doc.documentElement.getAttribute('lang')).toBe('ar');

    service.setLocale('en');

    expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
  });

  it('persists the choice so the next SSR render matches', () => {
    const { service, doc } = setup({ browserLanguages: ['ar'] });

    service.setLocale('en');

    expect(doc.cookie).toContain(`${LOCALE_COOKIE}=en`);
  });

  it('ignores a switch to the language already active', () => {
    const { service, doc } = setup({ browserLanguages: ['ar'] });

    service.setLocale('ar');

    expect(doc.cookie).toBe('');
  });
});

describe('copy decks', () => {
  it('cover exactly the same keys', () => {
    expect(Object.keys(AR).sort()).toEqual(Object.keys(EN).sort());
  });

  it('have no blank strings', () => {
    for (const [deck, name] of [
      [EN, 'EN'],
      [AR, 'AR'],
    ] as const) {
      for (const [key, value] of Object.entries(deck)) {
        expect(value.trim(), `${name}.${key} is blank`).not.toBe('');
      }
    }
  });

  it('render Arabic with Western numerals, per the numerals decision', () => {
    for (const [key, value] of Object.entries(AR)) {
      expect(/[٠-٩]/.test(value), `AR.${key} uses Arabic-Indic digits`).toBe(false);
    }
  });

  it('point directional arrows the way the layout runs', () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(value.includes('←'), `EN.${key} points the wrong way`).toBe(false);
    }

    for (const [key, value] of Object.entries(AR)) {
      expect(value.includes('→'), `AR.${key} points the wrong way`).toBe(false);
    }
  });
});
