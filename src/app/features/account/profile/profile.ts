import { HttpErrorResponse } from '@angular/common/http';
import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Reads the signed-in user straight off `AuthService.user` — the session
 * restore in that service's constructor has already called `/auth/me/`, so
 * there's no second fetch here; saving goes back through `updateMe`, which
 * writes the fresh user into the same signal and updates the navbar with it.
 *
 * Only `full_name` and `phone` are writable: the backend's `UserSerializer`
 * marks email, username and date_joined read-only, so they render as plain text.
 */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly user = this.auth.user;

  protected readonly editing = signal(false);
  protected readonly savingDetails = signal(false);
  protected readonly detailsError = signal('');
  protected readonly detailsSaved = signal(false);

  protected readonly changingPassword = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly passwordSaved = signal(false);

  protected readonly detailsForm = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    phone: [''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', Validators.required],
    new_password_confirm: ['', Validators.required],
  });

  protected startEdit(): void {
    const current = this.user();
    if (!current) {
      return;
    }
    this.detailsForm.reset({ full_name: current.full_name, phone: current.phone });
    this.detailsError.set('');
    this.detailsSaved.set(false);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.detailsError.set('');
  }

  protected saveDetails(): void {
    this.detailsForm.markAllAsTouched();

    if (this.detailsForm.invalid || this.savingDetails()) {
      return;
    }

    this.savingDetails.set(true);
    this.detailsError.set('');

    this.auth.updateMe(this.detailsForm.getRawValue()).subscribe({
      next: () => {
        this.savingDetails.set(false);
        this.editing.set(false);
        this.detailsSaved.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.savingDetails.set(false);
        this.applyError(error, this.detailsForm, this.detailsError);
      },
    });
  }

  protected startPasswordChange(): void {
    this.passwordForm.reset();
    this.passwordError.set('');
    this.passwordSaved.set(false);
    this.changingPassword.set(true);
  }

  protected cancelPasswordChange(): void {
    this.changingPassword.set(false);
    this.passwordError.set('');
  }

  protected savePassword(): void {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || this.savingPassword()) {
      return;
    }

    const { current_password, new_password, new_password_confirm } =
      this.passwordForm.getRawValue();

    if (new_password !== new_password_confirm) {
      this.passwordForm.controls.new_password_confirm.setErrors({ mismatch: true });
      return;
    }

    this.savingPassword.set(true);
    this.passwordError.set('');

    this.auth.changePassword(current_password, new_password).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.changingPassword.set(false);
        this.passwordSaved.set(true);
        // The access token outlives a password change, so the session stays
        // signed in; wiping the form just avoids leaving it on screen.
        this.passwordForm.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.savingPassword.set(false);
        this.applyError(error, this.passwordForm, this.passwordError);
      },
    });
  }

  /** Maps whatever error a control is carrying (built-in or server-set) to copy. */
  protected fieldError(form: 'details' | 'password', name: string): string | null {
    const group: FormGroup = form === 'details' ? this.detailsForm : this.passwordForm;
    const control = group.get(name);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['server']) {
      return control.errors['server'] as string;
    }
    if (control.errors['mismatch']) {
      return this.t().authPasswordMismatch;
    }
    if (control.errors['required']) {
      return this.t().authFieldRequired;
    }
    return null;
  }

  protected formatDate(iso: string): string {
    const locale = this.translation.locale() === 'ar' ? 'ar' : 'en';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(new Date(iso));
  }

  private applyError(
    error: HttpErrorResponse,
    form: FormGroup,
    message: WritableSignal<string>,
  ): void {
    const details = (error.error as ApiError | undefined)?.error?.details;
    let matched = false;

    for (const [field, messages] of Object.entries(details ?? {})) {
      const control = form.get(field);
      if (control && messages.length > 0) {
        control.setErrors({ server: messages[0] });
        control.markAsTouched();
        matched = true;
      }
    }

    if (!matched) {
      message.set(
        (error.error as ApiError | undefined)?.error?.message ?? this.t().authGenericError,
      );
    }
  }
}
