import { Component, inject, input, numberAttribute, signal } from '@angular/core';

import { Order } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

@Component({
  selector: 'app-order-detail',
  imports: [GenericList],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly orders = inject(OrderService);

  readonly id = input(0, { transform: numberAttribute });

  protected readonly order = signal<Order | null>(null);
}
