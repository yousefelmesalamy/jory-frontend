import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Gates the signed-in areas. Returns `true` unconditionally for now — flip the
 * early return once the auth contract is submitted.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // TODO: remove this bypass to enforce the guard.
  return true;

  // return auth.isAuthenticated()
  //   ? true
  //   : router.createUrlTree(['/account/login'], { queryParams: { next: state.url } });
};
