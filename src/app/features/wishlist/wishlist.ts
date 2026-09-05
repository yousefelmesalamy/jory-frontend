import { Component, inject, signal } from '@angular/core';

import { WishlistItem } from '../../core/models';
import { WishlistService } from '../../core/services/wishlist.service';
import { GenericList } from '../../shared/components/generic-list/generic-list';

@Component({
  selector: 'app-wishlist',
  imports: [GenericList],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlist = inject(WishlistService);

  protected readonly items = signal<readonly WishlistItem[]>([]);
}
