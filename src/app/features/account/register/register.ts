import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { RegisterForm } from '../../../shared/components/register-form/register-form';

/** Direct-link fallback for the navbar's register modal. */
@Component({
  selector: 'app-register',
  imports: [RegisterForm, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected onSuccess(): void {
    const next = this.route.snapshot.queryParamMap.get('next');
    this.router.navigateByUrl(next ?? '/account/profile');
  }
}
