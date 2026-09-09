import { Routes } from '@angular/router';

/** `categories` and `origins` sit before `:slug` so the literal segments win the
 * match. */
export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'categories',
    loadComponent: () => import('./category-list/category-list').then((m) => m.CategoryList),
  },
  {
    path: 'origins',
    loadComponent: () => import('./origin-list/origin-list').then((m) => m.OriginList),
  },
  {
    path: ':slug',
    loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
  },
];
