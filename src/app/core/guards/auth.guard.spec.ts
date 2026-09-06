import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

function setup(authenticated: boolean) {
  const auth = { isAuthenticated: () => authenticated } as Partial<AuthService> as AuthService;

  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });

  return { router: TestBed.inject(Router) };
}

describe('authGuard', () => {
  it('allows navigation when signed in', () => {
    setup(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    );

    expect(result).toBe(true);
  });

  it('redirects to login with the attempted URL when signed out', () => {
    const { router } = setup(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/account/login?next=%2Faccount%2Fprofile');
  });
});
