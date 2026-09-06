import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { User } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const USER: User = {
  id: 12,
  email: 'shopper@example.com',
  username: 'shopper1',
  full_name: 'Jane Shopper',
  phone: '+201111111111',
  date_joined: '2026-09-05T10:00:00Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });

  const auth = TestBed.inject(AuthService);
  const httpMock = TestBed.inject(HttpTestingController);
  const http = TestBed.inject(HttpClient);

  // Sign in so a (soon-to-expire) access + refresh token are on hand.
  auth.login('shopper@example.com', 'StrongPassw0rd!').subscribe();
  httpMock
    .expectOne('/api/auth/login/')
    .flush({ access: 'expiring-access-token', refresh: 'refresh-token', user: USER });

  return { auth, httpMock, http };
}

describe('authInterceptor — 401 refresh-and-retry', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('refreshes the access token and retries the original request once', () => {
    const { httpMock, http } = setup();

    let result: unknown;
    http.get('/api/orders/').subscribe((res) => (result = res));

    const first = httpMock.expectOne('/api/orders/');
    expect(first.request.headers.get('Authorization')).toBe('Bearer expiring-access-token');
    first.flush({ detail: 'Given token not valid for any token type' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/auth/refresh/');
    refreshReq.flush({ access: 'new-access-token' });

    const retry = httpMock.expectOne('/api/orders/');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });

    httpMock.verify();
  });

  it('logs the user out and propagates the error when the refresh itself fails', () => {
    const { auth, httpMock, http } = setup();

    let error: unknown;
    http.get('/api/orders/').subscribe({ error: (err) => (error = err) });

    httpMock
      .expectOne('/api/orders/')
      .flush({ detail: 'Given token not valid for any token type' }, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne('/api/auth/refresh/')
      .flush({ detail: 'Token is invalid or expired' }, { status: 401, statusText: 'Unauthorized' });

    // logout() blacklists best-effort even though the session is already dead.
    httpMock.expectOne('/api/auth/logout/').flush(null, { status: 205, statusText: 'Reset Content' });

    expect(error).toBeTruthy();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken).toBeNull();

    httpMock.verify();
  });

  it('does not attempt a refresh when the login endpoint itself returns 401', () => {
    const { httpMock, http } = setup();

    let error: unknown;
    http.post('/api/auth/login/', { email: 'x', password: 'y' }).subscribe({
      error: (err) => (error = err),
    });

    httpMock
      .expectOne('/api/auth/login/')
      .flush({ detail: 'No active account found with the given credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();

    httpMock.verify();
  });
});
