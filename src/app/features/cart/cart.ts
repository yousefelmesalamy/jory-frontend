import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartItem } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { GenericList } from '../../shared/components/generic-list/generic-list';
import { VoucherForm } from './voucher-form/voucher-form';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, GenericList, VoucherForm],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cartService = inject(CartService);

  protected readonly items = signal<readonly CartItem[]>([]);
}
