import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../core/i18n/translation.service';
import { Address, ApiError, CartItem } from '../../core/models';
import { AddressService } from '../../core/services/address.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { RiyalSymbol } from '../../shared/components/riyal-symbol/riyal-symbol';

/** Cash on delivery only — the form picks a saved address and nothing else;
 * the order's own totals come straight from the live cart. */
@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, RiyalSymbol],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly orders = inject(OrderService);
  private readonly cart = inject(CartService);
  private readonly addressService = inject(AddressService);
  private readonly translation = inject(TranslationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly t = this.translation.t;

  protected readonly cartValue = this.cart.cart;
  protected readonly cartLoading = this.cart.loading;
  protected readonly items = computed<readonly CartItem[]>(() => this.cartValue()?.items ?? []);
  /** Only meaningful once the cart has actually loaded — an unresolved `null`
   * cart isn't "empty", it's "not known yet". */
  protected readonly cartEmpty = computed(() => !this.cartLoading() && this.items().length === 0);

  protected readonly addressesResource = resource({
    loader: () => firstValueFrom(this.addressService.list()),
  });

  protected readonly addresses = computed<readonly Address[]>(
    () => this.addressesResource.value()?.results ?? [],
  );
  protected readonly loadingAddresses = computed(() => this.addressesResource.isLoading());

  protected readonly form = this.fb.nonNullable.group({
    addressId: [0, [Validators.required, Validators.min(1)]],
  });

  protected readonly placing = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    // Preselects the default address once the book loads — a no-op once the
    // shopper has picked one themselves, since the control is no longer 0.
    effect(() => {
      const list = this.addresses();
      if (list.length === 0 || this.form.controls.addressId.value !== 0) {
        return;
      }
      const preferred = list.find((address) => address.is_default) ?? list[0];
      this.form.controls.addressId.setValue(preferred.id);
    });
  }

  protected addressLabel(address: Address): string {
    const base = `${address.full_name} — ${address.street_address}, ${address.city}`;
    return address.is_default ? `${base} (${this.t().addressDefaultBadge})` : base;
  }

  protected place(): void {
    if (this.form.invalid || this.placing() || this.cartEmpty()) {
      return;
    }

    this.placing.set(true);
    this.errorMessage.set('');

    this.orders.place({ address_id: this.form.controls.addressId.value }).subscribe({
      next: (order) => {
        // Checkout empties the cart server-side — reload so the header count
        // and cart page reflect that instead of showing stale stock lines.
        this.cart.load().subscribe();
        this.router.navigate(['/orders', order.order_number]);
      },
      error: (error: HttpErrorResponse) => {
        this.placing.set(false);
        this.applyError(error);
      },
    });
  }

  private applyError(error: HttpErrorResponse): void {
    const api = error.error as ApiError | undefined;
    const addressErrors = api?.error?.details?.['address_id'];
    if (addressErrors?.length) {
      this.form.controls.addressId.setErrors({ server: addressErrors[0] });
    }
    // The API's own message is deliberately safe to show as-is (empty_cart,
    // out_of_stock, item_unavailable, voucher_* all arrive as plain English
    // here — there's no localized copy for server-side stock/voucher state).
    this.errorMessage.set(api?.error?.message ?? this.t().authGenericError);
  }
}
