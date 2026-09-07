import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';

/** Vouchers apply to a cart, so they live here rather than on a route of their
 * own. Flips between the code input and an "applied" chip based on the cart's
 * own `voucher` field, so a page refresh always shows the right one. */
@Component({
  selector: 'app-voucher-form',
  imports: [ReactiveFormsModule],
  templateUrl: './voucher-form.html',
  styleUrl: './voucher-form.scss',
})
export class VoucherForm {
  private readonly cartService = inject(CartService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly cart = this.cartService.cart;

  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly removing = signal(false);

  protected apply(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.cartService.applyVoucher(this.form.getRawValue().code).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageFor(error));
      },
    });
  }

  protected remove(): void {
    if (this.removing()) {
      return;
    }
    this.removing.set(true);
    this.cartService.removeVoucher().subscribe({
      complete: () => this.removing.set(false),
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    const api = error.error as ApiError | undefined;
    return api?.error?.message ?? this.t().voucherApplyError;
  }
}
