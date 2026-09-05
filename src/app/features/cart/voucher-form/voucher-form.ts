import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CartService } from '../../../core/services/cart.service';

/** Vouchers apply to a cart, so they live here rather than on a route of their own. */
@Component({
  selector: 'app-voucher-form',
  imports: [ReactiveFormsModule],
  templateUrl: './voucher-form.html',
  styleUrl: './voucher-form.scss',
})
export class VoucherForm {
  private readonly cart = inject(CartService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });

  protected apply(): void {
    // TODO: call cart.applyVoucher() once the endpoint contract is submitted.
  }
}
