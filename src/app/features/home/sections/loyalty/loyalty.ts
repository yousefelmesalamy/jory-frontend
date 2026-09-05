import { Component, inject } from '@angular/core';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/** A points threshold and what it redeems for. The number stays Western numerals. */
interface LoyaltyTier {
  readonly points: number;
  readonly labelKey: keyof Copy;
}

/** The "Jouri points" banner: blurb plus the three redemption tiers. */
@Component({
  selector: 'app-home-loyalty',
  templateUrl: './loyalty.html',
  styleUrl: './loyalty.scss',
})
export class HomeLoyalty {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly tiers: readonly LoyaltyTier[] = [
    { points: 500, labelKey: 'tierBag' },
    { points: 900, labelKey: 'tierCupping' },
    { points: 1500, labelKey: 'tierSubscription' },
  ];
}
