import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, REQUEST, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { readCookie } from '../i18n/locale';
import { RegisterPayload, User } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { WishlistService } from './wishlist.service';

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

const ACCESS_KEY = 'jory.auth.access';
const REFRESH_KEY = 'jory.auth.refresh';

/**
 * Mirrors "is there a session" (not the tokens themselves — those stay in
 * localStorage only) so `authGuard` has something to check during SSR, where
 * localStorage doesn't exist. Read on the server as well as the client, which
 * is why this is a cookie and not just another localStorage key.
 */
const SESSION_COOKIE = 'jory_session';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Email-or-username-and-password login against the backend's JWT endpoints. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = inject(API_URL);
  private readonly http = inject(HttpClient);
  private readonly wishlist = inject(WishlistService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  /**
   * SSR-only stand-in for `isAuthenticated()`: whether the session cookie
   * says there was a logged-in session, without a network round trip to
   * verify it. Real data-fetching still needs the real token from
   * localStorage, so an SSR'd guarded page renders optimistically and lets
   * client-side hydration fetch (and correct) the real content.
   */
  readonly hasServerSession: boolean =
    !this.isBrowser && readCookie(this.request?.headers?.get('cookie'), SESSION_COOKIE) !== null;

  private readonly access = signal<string | null>(this.readStored(ACCESS_KEY));
  private readonly refreshTok = signal<string | null>(this.readStored(REFRESH_KEY));

  get accessToken(): string | null {
    return this.access();
  }

  get refreshToken(): string | null {
    return this.refreshTok();
  }

  private sessionReadyResolve!: () => void;
  /** Resolves once constructor-time session restore has settled, one way or the other. */
  readonly sessionReady: Promise<void> = new Promise((resolve) => {
    this.sessionReadyResolve = resolve;
  });

  constructor() {
    if (this.access()) {
      // Deferred: calling this.me() synchronously here would dispatch an HTTP
      // request that runs through authInterceptor, which injects AuthService —
      // while this constructor is still on the stack, Angular's circular-
      // dependency guard (NG0200) fires and RxJS silently routes it to the
      // error callback below, wiping the very session we're trying to restore.
      queueMicrotask(() =>
        this.me().subscribe({
          error: () => {
            this.clearSession();
            this.sessionReadyResolve();
          },
          complete: () => {
            // Backfills the cookie for a session that predates this cookie
            // existing at all, so the next hard reload's SSR guard sees it.
            this.writeSessionCookie(true);
            this.sessionReadyResolve();
          },
        }),
      );
    } else {
      this.sessionReadyResolve();
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

  private setAccess(token: string): void {
    this.access.set(token);
    this.writeStored(ACCESS_KEY, token);
  }

  private setRefresh(token: string): void {
    this.refreshTok.set(token);
    this.writeStored(REFRESH_KEY, token);
    this.writeSessionCookie(true);
  }

  private clearSession(): void {
    this.access.set(null);
    this.refreshTok.set(null);
    this.user.set(null);
    this.writeStored(ACCESS_KEY, null);
    this.writeStored(REFRESH_KEY, null);
    this.writeSessionCookie(false);
    this.wishlist.reset();
  }

  private writeSessionCookie(present: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    document.cookie = present
      ? `${SESSION_COOKIE}=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`
      : `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
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
