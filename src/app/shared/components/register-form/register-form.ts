import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError, RegisterPayload, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Register, then immediately log the new user in — the register endpoint
 * itself returns no tokens.
 */
@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly success = output<User>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    full_name: [''],
    phone: [''],
    password: ['', Validators.required],
    password_confirm: ['', Validators.required],
  });

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { email, username, full_name, phone, password, password_confirm } =
      this.form.getRawValue();

    if (password !== password_confirm) {
      this.form.controls.password_confirm.setErrors({ mismatch: true });
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload: RegisterPayload = {
      email,
      username,
      password,
      password_confirm,
      ...(full_name ? { full_name } : {}),
      ...(phone ? { phone } : {}),
    };

    this.auth
      .register(payload)
      .pipe(switchMap(() => this.auth.login(email, password)))
      .subscribe({
        next: (user) => {
          this.submitting.set(false);
          this.success.emit(user);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.applyError(error);
        },
      });
  }

  /** Maps whatever error a control is carrying (built-in or server-set) to copy. */
  protected fieldError(name: keyof ReturnType<typeof this.form.getRawValue>): string | null {
    const control = this.form.get(name);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['server']) {
      return control.errors['server'] as string;
    }
    if (control.errors['mismatch']) {
      return this.t().authPasswordMismatch;
    }
    if (control.errors['email']) {
      return this.t().authFieldEmail;
    }
    if (control.errors['required']) {
      return this.t().authFieldRequired;
    }
    return null;
  }

  private applyError(error: HttpErrorResponse): void {
    const details = (error.error as ApiError | undefined)?.error?.details;
    let matched = false;

    for (const [field, messages] of Object.entries(details ?? {})) {
      const control = this.form.get(field);
      if (control && messages.length > 0) {
        control.setErrors({ server: messages[0] });
        matched = true;
      }
    }

    if (!matched) {
      this.errorMessage.set(
        (error.error as ApiError | undefined)?.error?.message ?? this.t().authGenericError,
      );
    }
  }
}
