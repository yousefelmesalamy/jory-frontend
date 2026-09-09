import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/**
 * The email step of the reset flow, shared by the auth modal and the
 * `/account/forgot-password` page.
 *
 * On success it swaps itself for a confirmation rather than emitting and
 * vanishing: the API answers identically for a registered and an unregistered
 * address, so "we sent it if it exists" is the only honest thing to show, and
 * the shopper needs to see it in place.
 */
@Component({
  selector: 'app-forgot-password-form',
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password-form.html',
  styleUrl: './forgot-password-form.scss',
})
export class ForgotPasswordForm {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  /** The host owns navigation — the modal switches state, the page routes. */
  readonly backToLogin = output<void>();

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.requestPasswordReset(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);

        if (error.status === 429) {
          this.errorMessage.set(this.t().authForgotThrottled);
          return;
        }

        const api = error.error as ApiError | undefined;
        this.errorMessage.set(api?.error?.message ?? this.t().authGenericError);
      },
    });
  }
}
