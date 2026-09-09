import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { evaluatePassword, passwordScore } from '../../../shared/password-rules';

type Stage = 'checking' | 'invalid' | 'form' | 'done';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('password_confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

/**
 * The page the emailed link opens.
 *
 * The link is checked on load rather than on submit, so a shopper with a dead
 * link is told immediately instead of after typing a password twice.
 *
 * The live checklist runs `evaluatePassword` with **no** context: this page
 * does not know the account's email or username (nobody is signed in, and the
 * API deliberately does not say whose token this is), so the "not similar to
 * your email" rule always passes here. The server still enforces it, and a
 * rejection comes back as a `new_password` field error.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly translation = inject(TranslationService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly t = this.translation.t;

  protected readonly stage = signal<Stage>('checking');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly passwordVisible = signal(false);

  private uid = '';
  private token = '';

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', Validators.required],
      password_confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  private readonly password = signal('');

  protected readonly rules = computed(() => evaluatePassword(this.password()));
  protected readonly score = computed(() => passwordScore(this.rules(), this.password()));

  constructor() {
    this.form.controls.password.valueChanges.subscribe((value) => this.password.set(value));

    this.route.queryParamMap.subscribe((params) => {
      this.uid = params.get('uid') ?? '';
      this.token = params.get('token') ?? '';

      if (!this.uid || !this.token) {
        this.stage.set('invalid');
        return;
      }

      // Verify only in the browser. This is a POST, and Angular's transfer
      // cache does not cache POST responses by default — an SSR-side verify
      // would be thrown away and re-fetched on the client anyway, and the
      // server would have already serialized `stage === 'form'`, which
      // mismatches what the client renders first and tears the form down.
      // Leaving `stage` at 'checking' on the server keeps the two in sync.
      if (!this.isBrowser) {
        return;
      }

      this.auth.verifyResetToken(this.uid, this.token).subscribe({
        next: () => this.stage.set('form'),
        error: () => this.stage.set('invalid'),
      });
    });
  }

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.confirmPasswordReset(this.uid, this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.stage.set('done');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        const api = error.error as ApiError | undefined;

        // A link that verified on load can still be dead by submit time — the
        // shopper may have logged in in another tab, which rolls the token.
        if (api?.error?.code === 'invalid_reset_link') {
          this.stage.set('invalid');
          return;
        }

        const fieldErrors = api?.error?.details?.['new_password'];
        this.errorMessage.set(
          Array.isArray(fieldErrors) ? fieldErrors.join(' ') : (api?.error?.message ?? this.t().authGenericError),
        );
      },
    });
  }
}
