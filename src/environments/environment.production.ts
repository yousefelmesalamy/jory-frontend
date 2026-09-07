/**
 * Deployed: Vercel storefront, PythonAnywhere API. `ng build`
 *
 * These are the baked-in defaults. The SSR side can still be repointed without
 * a rebuild by setting the `JORY_API_URL` environment variable on the host —
 * see `core/tokens/api-url.token.ts`. The browser value is build-time only, so
 * changing which backend the *browser* calls does require a redeploy.
 */
export const environment = {
  production: true,
  apiUrl: 'https://jorycoffee.pythonanywhere.com/api',
  serverApiUrl: 'https://jorycoffee.pythonanywhere.com/api',
};
