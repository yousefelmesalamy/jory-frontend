import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { cityOptions, countryName } from '../../../core/data/syria-locations';
import { TranslationService } from '../../../core/i18n/translation.service';
import { Address, AddressPayload, ApiError } from '../../../core/models';
import { AddressService } from '../../../core/services/address.service';
import { Dropdown } from '../dropdown/dropdown';

/**
 * Add and edit share this shell: pass `address` to prefill and PUT instead of
 * POST. `is_default` is deliberately not a field here — see the manifest's
 * default-address gotcha — setting a default is a dedicated action on the
 * address list instead.
 *
 * Country is not a field the visitor fills in. The shop delivers inside Syria
 * only, so the control is held at Syria (in whichever language the site is in)
 * and rendered as a locked pill; city is picked from that country's real list
 * rather than typed, which is what keeps `Address.city` — a free `CharField`
 * on the backend — from filling up with spellings a courier can't route.
 */
@Component({
  selector: 'app-address-form',
  imports: [ReactiveFormsModule, Dropdown],
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

  /** Whatever city the address arrived with, so an older free-text value (or
   * one saved in the other language) survives an edit instead of being
   * silently rewritten to the first row of the list. */
  private readonly incomingCity = signal('');

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

  protected readonly country = computed(() => countryName(this.translation.locale()));

  /**
   * The placeholder row is what makes an empty city read as empty: the shared
   * dropdown falls back to showing its first option when the control holds a
   * value no option matches, so without a `''` row a blank new address would
   * claim to be in Damascus.
   */
  protected readonly cityChoices = computed(() => {
    const options = cityOptions(this.translation.locale());
    const placeholder = { value: '', label: this.t().addressCityPlaceholder };
    const incoming = this.incomingCity().trim();

    if (incoming && !options.some((option) => option.value === incoming)) {
      return [placeholder, { value: incoming, label: incoming }, ...options];
    }
    return [placeholder, ...options];
  });

  constructor() {
    // Runs after `ngOnInit`'s patch, which is the point: it overwrites whatever
    // country the stored address carried, and re-runs if the visitor flips the
    // site's language mid-form.
    effect(() => this.form.controls.country.setValue(this.country()));
  }

  ngOnInit(): void {
    const current = this.address();
    if (current) {
      this.form.patchValue(current);
      this.incomingCity.set(current.city);
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
