import { Component, inject } from '@angular/core';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/** The maroon scrolling strip of short brand phrases between the grid and origins. */
@Component({
  selector: 'app-home-marquee',
  templateUrl: './marquee.html',
  styleUrl: './marquee.scss',
})
export class HomeMarquee {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly phraseKeys: readonly (keyof Copy)[] = [
    'marquee1',
    'marquee2',
    'marquee3',
    'marquee4',
    'marquee5',
  ];
}
