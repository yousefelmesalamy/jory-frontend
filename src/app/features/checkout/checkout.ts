import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Address, Cart } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';

/** Cash on delivery only — the form picks an address and nothing else. */
@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly fb = inject(FormBuilder);

  protected readonly addresses = signal<readonly Address[]>([]);
  protected readonly summary = signal<Cart | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    addressId: [0, Validators.required],
  });

  protected place(): void {
    // TODO: call orders.place() once the endpoint contract is submitted.
  }
}
