import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server-rendered rather than prerendered: `/shop/:slug` and `/orders/:id` have
 * no parameter list to enumerate at build time yet.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
