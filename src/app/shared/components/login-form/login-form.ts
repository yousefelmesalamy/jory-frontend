import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError, SimpleJwtError, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/** The backend authenticates by email or username in the same `email` field. */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  /** Fires once login succeeds, so the host (modal or routed page) can move on. */
  readonly success = output<User>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.success.emit(user);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    const jwt = error.error as SimpleJwtError | undefined;
    if (typeof jwt?.detail === 'string') {
      return jwt.detail;
    }

    const api = error.error as ApiError | undefined;
    return api?.error?.message ?? this.t().authGenericError;
  }
}
