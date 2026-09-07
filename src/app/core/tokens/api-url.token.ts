import { isPlatformBrowser } from '@angular/common';
import {
  InjectionToken,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Carries the API base the server resolved across to the client, so hydration
 * cannot start calling a different backend than the HTML was rendered against.
 * Same reasoning as the locale key in `core/i18n` — the server is the only side
 * that can read host configuration, so it has to publish its answer.
 */
const API_URL_KEY = makeStateKey<string>('jory.apiUrl');

/**
 * Host-level override for the *server* base, read at render time.
 *
 * Setting `JORY_API_URL` lets a deployment repoint SSR at a different backend
 * without rebuilding. It deliberately does not change the browser's base —
 * that one is baked in from the environment file, so overriding only this would
 * leave the two halves disagreeing. Kept for the SSR side because that is where
 * a wrong value fails hardest: a relative or unreachable URL there breaks
 * rendering outright rather than just a few XHRs.
 */
function readServerOverride(): string | undefined {
  // Reached through globalThis rather than the bare `process` identifier: the
  // browser has no such global, and naming it directly would mean pulling
  // @types/node into the browser build's type surface to describe something
  // that only ever exists on the server.
  const nodeProcess = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;

  const configured = nodeProcess?.env?.['JORY_API_URL']?.trim();
  return configured ? configured.replace(/\/+$/, '') : undefined;
}

function resolveApiUrl(): string {
  const transferState = inject(TransferState);

  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return transferState.get(API_URL_KEY, environment.apiUrl);
  }

  // The browser always gets the environment file's value — in development that
  // is the proxy path, which is what keeps CORS out of the local setup.
  transferState.set(API_URL_KEY, environment.apiUrl);

  return readServerOverride() ?? environment.serverApiUrl;
}

/** Base path every service prefixes its requests with. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: resolveApiUrl,
});
