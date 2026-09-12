import { Component, inject, input } from '@angular/core';

import { TranslationService } from '../../../core/i18n/translation.service';

/**
 * The Syrian Pound currency mark. There is no official glyph the way Saudi
 * Riyal has one, so this renders the everyday abbreviation instead — "ل.س"
 * in Arabic, "S.P" in English — picked from the active locale. Aria-hidden
 * unless a caller needs it to stand alone (no adjacent amount) and supplies
 * a label.
 */
@Component({
  selector: 'app-riyal-symbol',
  templateUrl: './riyal-symbol.html',
  styleUrl: './riyal-symbol.scss',
})
export class RiyalSymbol {
  private readonly translation = inject(TranslationService);

  readonly ariaLabel = input<string | null>(null);

  readonly symbol = () => (this.translation.locale() === 'ar' ? 'ل.س' : 'S.P');
}
