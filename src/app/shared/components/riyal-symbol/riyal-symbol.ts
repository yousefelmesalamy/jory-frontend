import { Component, input } from '@angular/core';

/**
 * The official Saudi Riyal currency glyph, replacing the plain "SAR" / "ر.س"
 * text the copy deck used to carry. Renders with `fill: currentColor` so it
 * always matches the surrounding text color, and is `aria-hidden` unless a
 * caller needs it to stand alone (no adjacent amount) and supplies a label.
 */
@Component({
  selector: 'app-riyal-symbol',
  templateUrl: './riyal-symbol.html',
  styleUrl: './riyal-symbol.scss',
})
export class RiyalSymbol {
  readonly ariaLabel = input<string | null>(null);
}
