import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TranslationService } from '../i18n/translation.service';

/** Tells the API which language to render catalog/copy content in. */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const locale = inject(TranslationService).locale();
  return next(req.clone({ setHeaders: { 'Accept-Language': locale } }));
};
