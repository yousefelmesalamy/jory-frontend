import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/**
 * One of the three counters under the hero copy. The number stays Western
 * numerals by decision; only the unit and label switch with the locale.
 */
interface HeroStat {
  value: number;
  unitKey?: keyof Copy;
  labelKey: keyof Copy;
}

/** The homepage banner: tagline, headline, CTAs and the farm/batch/dispatch counters. */
@Component({
  selector: 'app-home-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HomeHero {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly stats: readonly HeroStat[] = [
    { value: 11, labelKey: 'heroStatFarms' },
    { value: 15, unitKey: 'heroUnitKg', labelKey: 'heroStatBatch' },
    { value: 24, unitKey: 'heroUnitHours', labelKey: 'heroStatDispatch' },
  ];
}
