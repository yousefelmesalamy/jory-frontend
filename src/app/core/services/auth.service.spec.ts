import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { User } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { AuthService } from './auth.service';

const USER: User = {
  id: 12,
  email: 'shopper@example.com',
  username: 'shopper1',
  full_name: 'Jane Shopper',
  phone: '+201111111111',
  date_joined: '2026-09-05T10:00:00Z',
};

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  return {
    service: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService — login', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('posts the credentials and stores the returned user and tokens', () => {
    const { service, httpMock } = setup();

    let result: User | null | undefined;
    service.login('shopper@example.com', 'StrongPassw0rd!').subscribe((user) => (result = user));

    const req = httpMock.expectOne('/api/auth/login/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'shopper@example.com', password: 'StrongPassw0rd!' });

    req.flush({ access: 'access-token', refresh: 'refresh-token', user: USER });

    expect(result).toEqual(USER);
    expect(service.user()).toEqual(USER);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken).toBe('access-token');

    httpMock.verify();
  });

  it('propagates a failed login without touching the session', () => {
    const { service, httpMock } = setup();

    let error: unknown;
    service.login('shopper@example.com', 'wrong').subscribe({ error: (err) => (error = err) });

    httpMock
      .expectOne('/api/auth/login/')
      .flush({ detail: 'No active account found with the given credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken).toBeNull();

    httpMock.verify();
  });
});

describe('AuthService — register', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('posts the payload and returns the created user, without starting a session', () => {
    const { service, httpMock } = setup();

    let result: User | undefined;
    service
      .register({
        email: 'shopper@example.com',
        username: 'shopper1',
        password: 'StrongPassw0rd!',
        password_confirm: 'StrongPassw0rd!',
        full_name: 'Jane Shopper',
      })
      .subscribe((user) => (result = user));

    const req = httpMock.expectOne('/api/auth/register/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'shopper@example.com',
      username: 'shopper1',
      password: 'StrongPassw0rd!',
      password_confirm: 'StrongPassw0rd!',
      full_name: 'Jane Shopper',
    });

    req.flush(USER);

    expect(result).toEqual(USER);
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);

    httpMock.verify();
  });
});

describe('AuthService — refresh', () => {
  afterEach(() => {
    localStorage.clear();
  });

  function loggedIn(httpMock: HttpTestingController, service: AuthService): void {
    service.login('shopper@example.com', 'StrongPassw0rd!').subscribe();
    httpMock
      .expectOne('/api/auth/login/')
      .flush({ access: 'access-token', refresh: 'refresh-token', user: USER });
  }

  it('posts the stored refresh token and updates the access token', () => {
    const { service, httpMock } = setup();
    loggedIn(httpMock, service);

    let newAccess: string | undefined;
    service.refresh().subscribe((token) => (newAccess = token));

    const req = httpMock.expectOne('/api/auth/refresh/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh: 'refresh-token' });

    req.flush({ access: 'new-access-token' });

    expect(newAccess).toBe('new-access-token');
    expect(service.accessToken).toBe('new-access-token');

    httpMock.verify();
  });
});

describe('AuthService — logout', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('blacklists the refresh token and clears the session', () => {
    const { service, httpMock } = setup();
    service.login('shopper@example.com', 'StrongPassw0rd!').subscribe();
    httpMock
      .expectOne('/api/auth/login/')
      .flush({ access: 'access-token', refresh: 'refresh-token', user: USER });

    let completed = false;
    service.logout().subscribe(() => (completed = true));

    const req = httpMock.expectOne('/api/auth/logout/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh: 'refresh-token' });
    req.flush(null, { status: 205, statusText: 'Reset Content' });

    expect(completed).toBe(true);
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken).toBeNull();

    httpMock.verify();
  });

  it('still clears the session locally when the logout request fails', () => {
    const { service, httpMock } = setup();
    service.login('shopper@example.com', 'StrongPassw0rd!').subscribe();
    httpMock
      .expectOne('/api/auth/login/')
      .flush({ access: 'access-token', refresh: 'refresh-token', user: USER });

    let completed = false;
    service.logout().subscribe(() => (completed = true));

    httpMock
      .expectOne('/api/auth/logout/')
      .flush({ error: { code: 'invalid_token', message: 'bad', details: {} } }, { status: 400, statusText: 'Bad Request' });

    expect(completed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);

    httpMock.verify();
  });
});

describe('AuthService — me / updateMe / changePassword', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('fetches the current user and stores it', () => {
    const { service, httpMock } = setup();

    let result: User | undefined;
    service.me().subscribe((user) => (result = user));

    const req = httpMock.expectOne('/api/auth/me/');
    expect(req.request.method).toBe('GET');
    req.flush(USER);

    expect(result).toEqual(USER);
    expect(service.user()).toEqual(USER);

    httpMock.verify();
  });

  it('patches full_name/phone and stores the returned user', () => {
    const { service, httpMock } = setup();

    let result: User | undefined;
    service.updateMe({ full_name: 'New Name' }).subscribe((user) => (result = user));

    const req = httpMock.expectOne('/api/auth/me/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ full_name: 'New Name' });

    const updated = { ...USER, full_name: 'New Name' };
    req.flush(updated);

    expect(result).toEqual(updated);
    expect(service.user()).toEqual(updated);

    httpMock.verify();
  });

  it('posts the current and new password', () => {
    const { service, httpMock } = setup();

    let result: { detail: string } | undefined;
    service.changePassword('old-pw', 'NewStrongPassw0rd!').subscribe((res) => (result = res));

    const req = httpMock.expectOne('/api/auth/change-password/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      current_password: 'old-pw',
      new_password: 'NewStrongPassw0rd!',
    });

    req.flush({ detail: 'Password updated.' });

    expect(result).toEqual({ detail: 'Password updated.' });

    httpMock.verify();
  });
});

describe('AuthService — hydration on construction', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('fetches the current user when an access token was already stored', () => {
    localStorage.setItem('jory.auth.access', 'stored-access-token');
    const { service, httpMock } = setup();

    expect(service.accessToken).toBe('stored-access-token');

    httpMock.expectOne('/api/auth/me/').flush(USER);

    expect(service.user()).toEqual(USER);

    httpMock.verify();
  });

  it('clears the session if the stored token is no longer valid', () => {
    localStorage.setItem('jory.auth.access', 'stale-access-token');
    const { service, httpMock } = setup();

    httpMock
      .expectOne('/api/auth/me/')
      .flush({ detail: 'Given token not valid for any token type' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.user()).toBeNull();
    expect(service.accessToken).toBeNull();
    expect(localStorage.getItem('jory.auth.access')).toBeNull();

    httpMock.verify();
  });

  it('does not call the API when there is no stored access token', () => {
    const { httpMock } = setup();

    httpMock.verify();
  });

  it('does not read localStorage on the server', () => {
    localStorage.setItem('jory.auth.access', 'stored-access-token');
    const { service, httpMock } = setup('server');

    expect(service.accessToken).toBeNull();

    httpMock.verify();
  });
});
