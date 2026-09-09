import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ForgotPasswordForm } from '../../../shared/components/forgot-password-form/forgot-password-form';

/** Direct-link fallback for the auth modal's forgot state. */
@Component({
  selector: 'app-forgot-password',
  imports: [ForgotPasswordForm],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected onBackToLogin(): void {
    this.router.navigate(['/account/login']);
  }
}
