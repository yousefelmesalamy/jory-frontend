import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../core/i18n/translation.service';
import { WishlistItem } from '../../core/models';
import { WishlistService } from '../../core/services/wishlist.service';
import { GenericCard } from '../../shared/components/generic-card/generic-card';
import { GenericList } from '../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../shared/components/riyal-symbol/riyal-symbol';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, GenericList, GenericCard, RiyalSymbol],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlist = inject(WishlistService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly page = signal(1);
  /** The product id currently being removed, so its button can show a busy state. */
  protected readonly removingId = signal<number | null>(null);

  /** Placeholder tiles while the first page loads. */
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  protected readonly wishlistResource = resource({
    params: () => this.page(),
    loader: ({ params }) => firstValueFrom(this.wishlist.list(params)),
  });

  protected readonly items = computed<readonly WishlistItem[]>(
    () => this.wishlistResource.value()?.results ?? [],
  );

  protected readonly loading = computed(() => this.wishlistResource.isLoading());

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.wishlistResource.value()?.count ?? 0) / PAGE_SIZE)),
  );

  protected goToPage(page: number): void {
    this.page.set(page);
  }

  protected remove(productId: number): void {
    this.removingId.set(productId);
    // Removing the last item on a page beyond the first would otherwise strand
    // the view on a now-empty page.
    const isLastOnPage = this.items().length === 1 && this.page() > 1;

    this.wishlist.remove(productId).subscribe({
      next: () => {
        this.removingId.set(null);
        if (isLastOnPage) {
          this.page.update((value) => value - 1);
        } else {
          this.wishlistResource.reload();
        }
      },
      error: () => this.removingId.set(null),
    });
  }
}
