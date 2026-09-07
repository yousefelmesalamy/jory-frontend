import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Gates the signed-in areas.
 *
 * Platform-specific because `AuthService.isAuthenticated()` only ever reflects
 * reality in the browser: on the server there's no localStorage to restore a
 * session from, so it's always `false` at construction time. Without this
 * split, every SSR hard reload of a guarded route (`/checkout`, `/account/*`,
 * `/orders`, `/wishlist`) would bounce a genuinely logged-in shopper to
 * `/account/login` before the browser ever got a chance to prove otherwise.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const authenticated = isPlatformBrowser(platformId)
    ? await auth.sessionReady.then(() => auth.isAuthenticated())
    : auth.hasServerSession;

  return authenticated
    ? true
    : router.createUrlTree(['/account/login'], { queryParams: { next: state.url } });
};
