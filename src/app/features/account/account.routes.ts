import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'profile',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
  },
  {
    path: 'addresses',
    canActivate: [authGuard],
    loadComponent: () => import('./addresses/addresses').then((m) => m.Addresses),
  },
];
