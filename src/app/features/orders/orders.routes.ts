import { Routes } from '@angular/router';

/** Orders are looked up by `order_number` (e.g. `JORY-A1B2C3D4`), not a numeric id. */
export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./order-list/order-list').then((m) => m.OrderList),
  },
  {
    path: ':orderNumber',
    loadComponent: () => import('./order-detail/order-detail').then((m) => m.OrderDetail),
  },
];
