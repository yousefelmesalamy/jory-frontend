import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { Address, RegisterPayload, User } from '../models';
import { API_URL } from '../tokens/api-url.token';

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

const ACCESS_KEY = 'jory.auth.access';
const REFRESH_KEY = 'jory.auth.refresh';

/** Email-or-username-and-password login against the backend's JWT endpoints. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = inject(API_URL);
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  private readonly access = signal<string | null>(this.readStored(ACCESS_KEY));
  private readonly refreshTok = signal<string | null>(this.readStored(REFRESH_KEY));

  get accessToken(): string | null {
    return this.access();
  }

  constructor() {
    if (this.access()) {
      this.me().subscribe({ error: () => this.clearSession() });
    }
  }

  /** The field is named `email` on the wire but accepts a username too. */
  login(emailOrUsername: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login/`, { email: emailOrUsername, password })
      .pipe(
        tap((res) => {
          this.setAccess(res.access);
          this.setRefresh(res.refresh);
          this.user.set(res.user);
        }),
        map((res) => res.user),
      );
  }

  /** No tokens come back here — call `login` afterwards to sign the new user in. */
  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register/`, payload);
  }

  refresh(): Observable<string> {
    return this.http
      .post<{ access: string }>(`${this.apiUrl}/auth/refresh/`, { refresh: this.refreshTok() })
      .pipe(
        tap((res) => this.setAccess(res.access)),
        map((res) => res.access),
      );
  }

  /** Best-effort: the session clears locally even if the blacklist call fails. */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout/`, { refresh: this.refreshTok() })
      .pipe(
        catchError(() => of(void 0)),
        map(() => void 0),
        tap(() => this.clearSession()),
      );
  }

  me(): Observable<User> {
    return this.http
      .get<User>(`${this.apiUrl}/auth/me/`)
      .pipe(tap((user) => this.user.set(user)));
  }

  updateMe(patch: Partial<Pick<User, 'full_name' | 'phone'>>): Observable<User> {
    return this.http
      .patch<User>(`${this.apiUrl}/auth/me/`, patch)
      .pipe(tap((user) => this.user.set(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.apiUrl}/auth/change-password/`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /** TODO: GET {apiUrl}/addresses/ */
  listAddresses(): Observable<Address[]> {
    return of([]);
  }

  private setAccess(token: string): void {
    this.access.set(token);
    this.writeStored(ACCESS_KEY, token);
  }

  private setRefresh(token: string): void {
    this.refreshTok.set(token);
    this.writeStored(REFRESH_KEY, token);
  }

  private clearSession(): void {
    this.access.set(null);
    this.refreshTok.set(null);
    this.user.set(null);
    this.writeStored(ACCESS_KEY, null);
    this.writeStored(REFRESH_KEY, null);
  }

  private readStored(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  private writeStored(key: string, value: string | null): void {
    if (!this.isBrowser) {
      return;
    }
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }
}
