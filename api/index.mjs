/**
 * Vercel serverless entry point for the Angular SSR server.
 *
 * Vercel does not wire `dist/jory/server/server.mjs` up on its own — it sees a
 * built Angular app and would happily serve it as static files, skipping SSR
 * entirely. This function is what `vercel.json` rewrites every request to; it
 * hands off to the Express handler that `src/server.ts` already exports.
 *
 * The import is lazy so a cold start does not pay for the server bundle until a
 * request actually arrives. `.mjs` because this file is ESM while the project's
 * package.json is not marked `"type": "module"`.
 */
export default async function handler(req, res) {
  const { reqHandler } = await import('../dist/jory/server/server.mjs');
  return reqHandler(req, res);
}
