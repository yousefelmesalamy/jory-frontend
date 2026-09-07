import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import {
  ChangeData,
  CountryISO,
  NgxIntlTelInputModule,
  SearchCountryField,
} from 'ngx-intl-tel-input-gg';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError, RegisterPayload, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import {
  PasswordContext,
  PasswordRuleId,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  evaluatePassword,
  passwordScore,
} from '../../password-rules';

type FieldName = 'email' | 'username' | 'full_name' | 'phone' | 'password' | 'password_confirm';

/**
 * Register, then immediately log the new user in — the register endpoint
 * itself returns no tokens.
 *
 * Validation is live: the password checklist and strength meter re-evaluate on
 * every keystroke, and because the "different from your email and username"
 * rule reads the other fields, editing those re-checks the password too. The
 * rules mirror the server's (see `password-rules.ts`), so the common case never
 * needs a round trip to find out something was wrong.
 *
 * Errors, though, only appear once a field has been left — reward early,
 * punish late — after which they update as you type.
 */
@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, NgxIntlTelInputModule],
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
  protected readonly passwordVisible = signal(false);

  // Exposed for the template, which can only see what the component class
  // itself holds — not arbitrary module-level imports.
  protected readonly CountryISO = CountryISO;
  protected readonly SearchCountryField = SearchCountryField;

  /** Where Jouri actually ships first, then the rest of the Gulf. */
  protected readonly preferredCountries = [
    CountryISO.SaudiArabia,
    CountryISO.UnitedArabEmirates,
    CountryISO.Kuwait,
    CountryISO.Bahrain,
    CountryISO.Qatar,
    CountryISO.Oman,
    CountryISO.Jordan,
    CountryISO.Egypt,
  ];

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(USERNAME_MIN_LENGTH),
        Validators.pattern(USERNAME_PATTERN),
      ],
    ],
    full_name: [''],
    // Not `nonNullable`: an empty phone field's value is `null`, not ''.
    phone: this.fb.control<ChangeData | null>(null),
    password: ['', [Validators.required, (c: AbstractControl) => this.checkPasswordRules(c)]],
    password_confirm: ['', [Validators.required, (c: AbstractControl) => this.checkMatch(c)]],
  });

  /** The live form value, so the meter and checklist are plain computed state. */
  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly rules = computed(() =>
    evaluatePassword(this.value().password ?? '', {
      email: this.value().email,
      username: this.value().username,
      fullName: this.value().full_name,
    }),
  );

  protected readonly score = computed(() =>
    passwordScore(this.rules(), this.value().password ?? ''),
  );

  protected readonly strengthLabel = computed(() => {
    const copy = this.t();
    return [
      copy.authStrengthWeak,
      copy.authStrengthWeak,
      copy.authStrengthFair,
      copy.authStrengthGood,
      copy.authStrengthStrong,
    ][this.score()];
  });

  protected readonly passwordsMatch = computed(() => {
    const { password, password_confirm } = this.value();
    return !!password_confirm && password === password_confirm;
  });

  /** Only meaningful once something has been typed. */
  protected readonly passwordStarted = computed(() => (this.value().password ?? '').length > 0);

  constructor() {
    // The password's own verdict depends on the email and username, and the
    // confirmation's depends on the password — so re-run those when they move.
    this.form.controls.email.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.password.updateValueAndValidity());

    this.form.controls.username.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.password.updateValueAndValidity());

    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.password_confirm.updateValueAndValidity());
  }

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected ruleLabel(id: PasswordRuleId): string {
    const copy = this.t();
    switch (id) {
      case 'length':
        return copy.authRuleLength;
      case 'numeric':
        return copy.authRuleNotNumeric;
      case 'common':
        return copy.authRuleNotCommon;
      case 'similar':
        return copy.authRuleNotSimilar;
    }
  }

  /** True once a field holds something the server will accept — drives the tick. */
  protected isGood(name: FieldName): boolean {
    const control = this.form.get(name);
    return !!control && control.valid && !!(control.value as string);
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { email, username, full_name, phone, password, password_confirm } =
      this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload: RegisterPayload = {
      email,
      username,
      password,
      password_confirm,
      ...(full_name ? { full_name } : {}),
      ...(phone?.e164Number ? { phone: phone.e164Number } : {}),
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
  protected fieldError(name: FieldName): string | null {
    const control = this.form.get(name);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    const copy = this.t();
    if (control.errors['server']) {
      return control.errors['server'] as string;
    }
    if (control.errors['required']) {
      return copy.authFieldRequired;
    }
    if (control.errors['email']) {
      return copy.authFieldEmail;
    }
    if (control.errors['minlength']) {
      return copy.authFieldUsernameShort;
    }
    if (control.errors['pattern']) {
      return copy.authFieldUsernameChars;
    }
    if (control.errors['validatePhoneNumber']) {
      return copy.authFieldPhoneInvalid;
    }
    if (control.errors['mismatch']) {
      return copy.authPasswordMismatch;
    }
    // `rules` is deliberately absent: the checklist under the field already
    // says which rule is unmet, in more detail than one line could.
    return null;
  }

  private checkPasswordRules(control: AbstractControl): ValidationErrors | null {
    const password = (control.value as string) ?? '';
    if (!password) {
      return null;
    }

    return evaluatePassword(password, this.passwordContext()).every((rule) => rule.met)
      ? null
      : { rules: true };
  }

  private checkMatch(control: AbstractControl): ValidationErrors | null {
    const confirmation = (control.value as string) ?? '';
    const password = this.form?.controls.password.value ?? '';

    if (!confirmation || confirmation === password) {
      return null;
    }

    return { mismatch: true };
  }

  /** `this.form` is still undefined the first time the validators run. */
  private passwordContext(): PasswordContext {
    const raw = this.form?.getRawValue();
    return { email: raw?.email, username: raw?.username, fullName: raw?.full_name };
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
