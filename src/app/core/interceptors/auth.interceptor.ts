import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const AUTH_ENDPOINT = /\/auth\/(login|register|refresh)\/$/;

function withBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Attaches the bearer token to outgoing requests, and on a 401 from anything
 * other than the auth endpoints themselves, refreshes it and retries once.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(withBearer(req, auth.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || AUTH_ENDPOINT.test(req.url)) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((newToken) => next(withBearer(req, newToken))),
        catchError((refreshError: unknown) => {
          auth.logout().subscribe();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
