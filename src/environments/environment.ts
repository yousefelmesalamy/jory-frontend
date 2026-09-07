/**
 * Default: everything local. `ng serve`
 *
 * The browser talks to `/api`, which the dev-server proxy (proxy.conf.json)
 * forwards to the local Django server — same-origin, so CORS never enters local
 * development at all.
 *
 * SSR gets a separate value because `ng serve` really does server-render, and
 * the server has no proxy and cannot resolve a relative URL.
 */
export const environment = {
  production: false,
  /** Used by the browser. */
  apiUrl: '/api',
  /** Used during server-side rendering. Must be absolute. */
  serverApiUrl: 'http://localhost:8000/api',
};
