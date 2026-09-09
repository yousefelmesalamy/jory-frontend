import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

/**
 * Top level holds nothing but the feature boundaries — each feature owns its own
 * routes file so a page can move without touching this one.
 */
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'shop',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
  },
  {
    path: 'categories',
    redirectTo: 'shop/categories',
    pathMatch: 'full',
  },
  {
    path: 'origins',
    redirectTo: 'shop/origins',
    pathMatch: 'full',
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.CART_ROUTES),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
  },
  {
    path: 'wishlist',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/wishlist/wishlist.routes').then((m) => m.WISHLIST_ROUTES),
  },
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
