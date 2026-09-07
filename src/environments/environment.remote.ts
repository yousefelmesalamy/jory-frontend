/**
 * Local frontend, deployed backend. `npm run start:remote`
 *
 * For working on the storefront against real deployed data without running
 * Django locally. Both values are absolute and point at PythonAnywhere, so the
 * browser calls the deployed API directly rather than through a proxy.
 *
 * That makes these requests cross-origin, which means the deployed backend must
 * list `http://localhost:4200` in CORS_ALLOWED_ORIGINS. It already does — if
 * these calls start failing with a CORS error, that entry is what to check.
 */
export const environment = {
  production: false,
  apiUrl: 'https://jorycoffee.pythonanywhere.com/api',
  serverApiUrl: 'https://jorycoffee.pythonanywhere.com/api',
};
