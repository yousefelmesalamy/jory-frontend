import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Address, AddressPayload, ApiError } from '../../../core/models';
import { AddressService } from '../../../core/services/address.service';

/**
 * Add and edit share this shell: pass `address` to prefill and PUT instead of
 * POST. `is_default` is deliberately not a field here — see the manifest's
 * default-address gotcha — setting a default is a dedicated action on the
 * address list instead.
 */
@Component({
  selector: 'app-address-form',
  imports: [ReactiveFormsModule],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
})
export class AddressForm implements OnInit {
  private readonly addresses = inject(AddressService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly address = input<Address | null>(null);
  readonly saved = output<Address>();
  readonly cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    phone: ['', Validators.required],
    country: ['', Validators.required],
    city: ['', Validators.required],
    area: [''],
    street_address: ['', Validators.required],
    postal_code: [''],
    notes: [''],
  });

  ngOnInit(): void {
    const current = this.address();
    if (current) {
      this.form.patchValue(current);
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload: AddressPayload = this.form.getRawValue();
    const current = this.address();
    const request = current
      ? this.addresses.update(current.id, payload)
      : this.addresses.create(payload);

    request.subscribe({
      next: (address) => {
        this.submitting.set(false);
        this.saved.emit(address);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.applyError(error);
      },
    });
  }

  /** Maps whatever error a control is carrying (built-in or server-set) to copy. */
  protected fieldError(name: keyof AddressPayload): string | null {
    const control = this.form.get(name);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['server']) {
      return control.errors['server'] as string;
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
