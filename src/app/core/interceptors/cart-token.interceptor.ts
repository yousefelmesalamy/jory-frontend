import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';

import { CartService } from '../services/cart.service';

const CART_TOKEN_HEADER = 'X-Cart-Token';

/** Echoes the guest cart identity to and from the API, so `CartService` never
 * has to touch a header directly. Only cart requests carry it — the token is
 * meaningless anywhere else. */
export const cartTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/cart')) {
    return next(req);
  }

  const cart = inject(CartService);
  const token = cart.cartToken;
  const withToken = token ? req.clone({ setHeaders: { [CART_TOKEN_HEADER]: token } }) : req;

  return next(withToken).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const echoed = event.headers.get(CART_TOKEN_HEADER);
        if (echoed) {
          cart.setCartToken(echoed);
        }
      }
    }),
  );
};
