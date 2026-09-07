import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

function setup(authenticated: boolean, platformId: 'browser' | 'server' = 'browser') {
  const auth = {
    isAuthenticated: () => authenticated,
    sessionReady: Promise.resolve(),
    hasServerSession: authenticated,
  } as Partial<AuthService> as AuthService;

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });

  return { router: TestBed.inject(Router) };
}

describe('authGuard', () => {
  it('allows navigation when signed in, in the browser', async () => {
    setup(true, 'browser');

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    );

    expect(result).toBe(true);
  });

  it('redirects to login with the attempted URL when signed out, in the browser', async () => {
    const { router } = setup(false, 'browser');

    const result = (await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    )) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/account/login?next=%2Faccount%2Fprofile');
  });

  it('allows navigation on the server when the session cookie is present', async () => {
    setup(true, 'server');

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    );

    expect(result).toBe(true);
  });

  it('redirects on the server when there is no session cookie', async () => {
    const { router } = setup(false, 'server');

    const result = (await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/account/profile' } as never),
    )) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/account/login?next=%2Faccount%2Fprofile');
  });
});
