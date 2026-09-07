import { isPlatformBrowser } from '@angular/common';
import {
  InjectionToken,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';

/**
 * Carries the API base the server resolved across to the client, so hydration
 * cannot start calling a different backend than the HTML was rendered against.
 * Same reasoning as the locale key in `core/i18n` — the server is the only side
 * that can read configuration, so it has to publish its answer.
 */
const API_URL_KEY = makeStateKey<string>('jory.apiUrl');

/** In dev the browser goes through the `ng serve` proxy (see proxy.conf.json). */
const DEV_BROWSER_API_URL = '/api';

/** SSR has no proxy and cannot resolve a relative URL, so dev needs a real one. */
const DEV_SERVER_API_URL = 'http://localhost:8000/api';

/**
 * The deployed backend, read from the Node process at render time.
 *
 * Set `JORY_API_URL` to the absolute API base (e.g.
 * `https://you.pythonanywhere.com/api`) in the hosting environment. It is
 * deliberately read at runtime rather than baked in at build time, so pointing
 * the storefront at a different backend is an env-var change, not a rebuild.
 */
function readConfiguredApiUrl(): string | undefined {
  // Reached through globalThis rather than the bare `process` identifier: the
  // browser has no such global, and naming it directly would mean pulling
  // @types/node into the browser build's type surface just to describe
  // something that only ever exists on the server.
  const nodeProcess = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;

  const configured = nodeProcess?.env?.['JORY_API_URL']?.trim();
  return configured ? configured.replace(/\/+$/, '') : undefined;
}

function resolveApiUrl(): string {
  const transferState = inject(TransferState);

  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return transferState.get(API_URL_KEY, DEV_BROWSER_API_URL);
  }

  const configured = readConfiguredApiUrl();

  // Unconfigured (i.e. local dev) publishes the *proxy* path to the browser
  // rather than the server's own localhost URL — the browser must keep using
  // the dev proxy, which is what keeps CORS out of the local setup entirely.
  transferState.set(API_URL_KEY, configured ?? DEV_BROWSER_API_URL);

  return configured ?? DEV_SERVER_API_URL;
}

/** Base path every service prefixes its requests with. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: resolveApiUrl,
});
