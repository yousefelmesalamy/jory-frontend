import { Component, inject } from '@angular/core';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { RiyalSymbol } from '../../../../shared/components/riyal-symbol/riyal-symbol';

/**
 * One perk tile: an icon glyph plus a title/sub copy-deck pair. `hasCurrency`
 * marks the one whose title ends in an amount, so the template can append the
 * Riyal glyph after it — the copy deck no longer carries "SAR"/"ر.س" as text.
 */
interface Perk {
  icon: string;
  titleKey: keyof Copy;
  subKey: keyof Copy;
  hasCurrency?: boolean;
}

/** The three-up trust strip between the hero and the featured products. */
@Component({
  selector: 'app-home-perks',
  imports: [RiyalSymbol],
  templateUrl: './perks.html',
  styleUrl: './perks.scss',
})
export class HomePerks {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly perks: readonly Perk[] = [
    { icon: '✦', titleKey: 'perkFreshTitle', subKey: 'perkFreshSub' },
    { icon: '✈', titleKey: 'perkShippingTitle', subKey: 'perkShippingSub', hasCurrency: true },
    { icon: '◈', titleKey: 'perkPointsTitle', subKey: 'perkPointsSub' },
  ];
}
