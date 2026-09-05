import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Order } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, GenericList],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly ordersService = inject(OrderService);

  protected readonly orders = signal<readonly Order[]>([]);
}
