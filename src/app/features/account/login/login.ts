import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { LoginForm } from '../../../shared/components/login-form/login-form';

/** Direct-link fallback for the navbar's login modal. */
@Component({
  selector: 'app-login',
  imports: [LoginForm, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected onSuccess(): void {
    const next = this.route.snapshot.queryParamMap.get('next');
    this.router.navigateByUrl(next ?? '/account/profile');
  }
}
