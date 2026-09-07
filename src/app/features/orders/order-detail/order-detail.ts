import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Copy } from '../../../core/i18n/en';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiError, Order, OrderStatus } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../../shared/components/riyal-symbol/riyal-symbol';

const STATUS_KEYS: Record<OrderStatus, keyof Copy> = {
  PENDING: 'orderStatusPending',
  CONFIRMED: 'orderStatusConfirmed',
  SHIPPED: 'orderStatusShipped',
  DELIVERED: 'orderStatusDelivered',
  CANCELLED: 'orderStatusCancelled',
};

@Component({
  selector: 'app-order-detail',
  imports: [GenericList, RiyalSymbol, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly ordersService = inject(OrderService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly orderNumber = input('');

  protected readonly orderResource = resource({
    params: () => ({ orderNumber: this.orderNumber() }),
    loader: ({ params }) =>
      params.orderNumber ? firstValueFrom(this.ordersService.get(params.orderNumber)) : Promise.resolve(null),
  });

  /** Cancel returns the updated order — stored here so the page reflects it
   * immediately without a second round trip through the resource. */
  private readonly cancelledOrder = signal<Order | null>(null);

  // `resource().value()` throws while the resource is in its `error` state (a
  // real case here: the API 404s a wrong order number or someone else's order
  // indistinguishably), so it's only read behind `hasValue()`.
  protected readonly order = computed<Order | null>(() => {
    const cancelled = this.cancelledOrder();
    if (cancelled) {
      return cancelled;
    }
    return this.orderResource.hasValue() ? this.orderResource.value() : null;
  });
  protected readonly loading = computed(() => this.orderResource.isLoading());
  protected readonly notFound = computed(
    () => this.orderResource.status() === 'error' && this.cancelledOrder() === null,
  );

  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal('');

  protected readonly canCancel = computed(() => this.order()?.status === 'PENDING');

  protected statusLabel(status: OrderStatus): string {
    return this.t()[STATUS_KEYS[status]];
  }

  protected shippingLine(order: Order): string {
    return [order.street_address, order.area, order.city, order.country, order.postal_code]
      .filter((part) => part)
      .join(', ');
  }

  protected cancel(): void {
    const current = this.order();
    if (!current || this.cancelling() || !this.canCancel()) {
      return;
    }

    this.cancelling.set(true);
    this.cancelError.set('');

    this.ordersService.cancel(current.order_number).subscribe({
      next: (order) => {
        this.cancelling.set(false);
        this.cancelledOrder.set(order);
      },
      error: (error: HttpErrorResponse) => {
        this.cancelling.set(false);
        const api = error.error as ApiError | undefined;
        this.cancelError.set(api?.error?.message ?? this.t().orderCancelError);
      },
    });
  }

  protected formatDate(iso: string): string {
    const locale = this.translation.locale() === 'ar' ? 'ar' : 'en';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      numberingSystem: 'latn',
    }).format(new Date(iso));
  }
}
