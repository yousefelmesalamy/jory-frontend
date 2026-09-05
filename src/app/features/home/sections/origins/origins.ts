import { Component, inject } from '@angular/core';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/** One origin tile: name/altitude/notes are all copy-deck keys, not catalog data. */
interface OriginCard {
  readonly nameKey: keyof Copy;
  readonly altKey: keyof Copy;
  readonly notesKey: keyof Copy;
}

/** The three-up "from farm to cup" origin gallery. */
@Component({
  selector: 'app-home-origins',
  templateUrl: './origins.html',
  styleUrl: './origins.scss',
})
export class HomeOrigins {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly cards: readonly OriginCard[] = [
    { nameKey: 'originUganda', altKey: 'originUgandaAlt', notesKey: 'originUgandaNotes' },
    { nameKey: 'originColombia', altKey: 'originColombiaAlt', notesKey: 'originColombiaNotes' },
    { nameKey: 'originEthiopia', altKey: 'originEthiopiaAlt', notesKey: 'originEthiopiaNotes' },
  ];
}
