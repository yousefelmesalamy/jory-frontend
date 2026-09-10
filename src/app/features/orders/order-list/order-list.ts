import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Copy } from '../../../core/i18n/en';
import { TranslationService } from '../../../core/i18n/translation.service';
import { Order, OrderStatus, Paginated } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../../shared/components/riyal-symbol/riyal-symbol';
import { PricePipe } from '../../../shared/pipes/price.pipe';

/** The server's own default page size — used only to derive a page count from
 * `count`, since the list endpoint carries no `page_size` param here. */
const PAGE_SIZE = 20;
const EMPTY_PAGE: Paginated<Order> = { count: 0, next: null, previous: null, results: [] };

const STATUS_KEYS: Record<OrderStatus, keyof Copy> = {
  PENDING: 'orderStatusPending',
  CONFIRMED: 'orderStatusConfirmed',
  SHIPPED: 'orderStatusShipped',
  DELIVERED: 'orderStatusDelivered',
  CANCELLED: 'orderStatusCancelled',
};

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, GenericList, RiyalSymbol, PricePipe],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly ordersService = inject(OrderService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly page = signal(1);

  protected readonly ordersResource = resource({
    params: () => ({ page: this.page() }),
    loader: ({ params }) => firstValueFrom(this.ordersService.list(params.page)),
  });

  protected readonly orders = computed<readonly Order[]>(
    () => this.ordersResource.value()?.results ?? EMPTY_PAGE.results,
  );
  protected readonly loading = computed(() => this.ordersResource.isLoading());
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.ordersResource.value()?.count ?? 0) / PAGE_SIZE)),
  );

  protected goToPage(page: number): void {
    this.page.set(page);
  }

  protected statusLabel(status: OrderStatus): string {
    return this.t()[STATUS_KEYS[status]];
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
}
