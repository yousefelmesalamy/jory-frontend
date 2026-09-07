import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslationService } from '../../core/i18n/translation.service';
import { ApiError, CartItem } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { GenericList } from '../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../shared/components/riyal-symbol/riyal-symbol';
import { VoucherForm } from './voucher-form/voucher-form';

/** Pastel fills for a line's monogram tile, cycled by index — the cart API
 * carries no product image, same gap `category-list` fills the same way. */
const SWATCHES = ['#cfe3ea', '#e8ddc8', '#d8c3ad', '#f3dfa5', '#d7e5d0', '#ddd0e6', '#f1d9c0', '#cfe6da'];

@Component({
  selector: 'app-cart',
  imports: [RouterLink, GenericList, VoucherForm, RiyalSymbol],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cartService = inject(CartService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly cart = this.cartService.cart;
  readonly loading = this.cartService.loading;
  readonly items = computed<readonly CartItem[]>(() => this.cart()?.items ?? []);

  protected readonly skeletons = [0, 1, 2];

  /** Only one line mutates at a time — the stepper and remove button on every
   * other line stay live, but a line's own controls disable while it's in flight. */
  protected readonly pendingItemId = signal<number | null>(null);
  protected readonly lineError = signal<{ itemId: number; message: string } | null>(null);

  protected decrement(item: CartItem): void {
    this.setQuantity(item, item.quantity - 1);
  }

  protected increment(item: CartItem): void {
    this.setQuantity(item, item.quantity + 1);
  }

  protected remove(item: CartItem): void {
    if (this.pendingItemId() !== null) {
      return;
    }
    this.pendingItemId.set(item.id);
    this.lineError.set(null);

    this.cartService.removeItem(item.id).subscribe({
      next: () => this.pendingItemId.set(null),
      error: (error: HttpErrorResponse) => this.failLine(item.id, error),
    });
  }

  protected swatch(index: number): string {
    return SWATCHES[index % SWATCHES.length];
  }

  protected initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  protected errorFor(item: CartItem): string | null {
    const error = this.lineError();
    return error?.itemId === item.id ? error.message : null;
  }

  private setQuantity(item: CartItem, quantity: number): void {
    if (quantity < 1 || this.pendingItemId() !== null) {
      return;
    }
    this.pendingItemId.set(item.id);
    this.lineError.set(null);

    this.cartService.updateItem(item.id, quantity).subscribe({
      next: () => this.pendingItemId.set(null),
      error: (error: HttpErrorResponse) => this.failLine(item.id, error),
    });
  }

  private failLine(itemId: number, error: HttpErrorResponse): void {
    this.pendingItemId.set(null);
    const api = error.error as ApiError | undefined;
    this.lineError.set({ itemId, message: api?.error?.message ?? this.t().cartLineError });
  }
}
