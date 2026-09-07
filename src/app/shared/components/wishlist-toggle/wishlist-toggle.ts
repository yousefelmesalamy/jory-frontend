import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { WishlistService } from '../../../core/services/wishlist.service';

/**
 * A heart button any product card can drop in. Never nest this inside an
 * `<a>` — every caller places it as a sibling of the card's link, absolutely
 * positioned over it, so the two don't fight over the click.
 */
@Component({
  selector: 'app-wishlist-toggle',
  templateUrl: './wishlist-toggle.html',
  styleUrl: './wishlist-toggle.scss',
})
export class WishlistToggle {
  private readonly auth = inject(AuthService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly productId = input.required<number>();

  protected readonly active = computed(() => this.wishlist.wishlistedIds().has(this.productId()));
  protected readonly pending = computed(() => this.wishlist.pendingIds().has(this.productId()));

  constructor() {
    // Hydrates the shared id set the first time a signed-in viewer sees any toggle button.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.wishlist.ensureIdsLoaded();
      }
    });
  }

  protected onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/account/login'], { queryParams: { next: this.router.url } });
      return;
    }

    this.wishlist.toggle(this.productId());
  }
}
