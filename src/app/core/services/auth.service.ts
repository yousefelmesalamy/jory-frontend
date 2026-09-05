import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Address, User } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** Email-and-password login against the backend's JWT endpoints. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = inject(API_URL);

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** TODO: read the access token from wherever we decide to persist it. */
  get accessToken(): string | null {
    return null;
  }

  /** TODO: POST {apiUrl}/auth/login/ */
  login(email: string, password: string): Observable<User | null> {
    return of(null);
  }

  /** TODO: POST {apiUrl}/auth/register/ */
  register(email: string, password: string): Observable<User | null> {
    return of(null);
  }

  /** TODO: clear the stored token and reset `user`. */
  logout(): void {
    this.user.set(null);
  }

  /** TODO: GET {apiUrl}/addresses/ */
  listAddresses(): Observable<Address[]> {
    return of([]);
  }
}
