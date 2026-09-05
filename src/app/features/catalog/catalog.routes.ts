import { Routes } from '@angular/router';

/** `categories` sits before `:slug` so the literal segment wins the match. */
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
    path: ':slug',
    loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
  },
];
