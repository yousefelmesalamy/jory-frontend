import { Routes } from '@angular/router';

export const WISHLIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wishlist').then((m) => m.Wishlist),
  },
];
