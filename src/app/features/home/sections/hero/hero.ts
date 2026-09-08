import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/**
 * One of the three counters under the hero panel. The number stays Western
 * numerals by decision; only the unit and label switch with the locale.
 */
interface HeroStat {
  value: number;
  unitKey?: keyof Copy;
  labelKey: keyof Copy;
}

/** How far the pack leans, in degrees, when the pointer reaches a panel edge. */
const TILT_RANGE = 7;

/** The homepage banner: the 1kg pack on a lit stage, plus copy and counters. */
@Component({
  selector: 'app-home-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HomeHero {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  /** Members of the tasting club, shown as-is next to the hero copy. */
  readonly community = '+2.4K';

  readonly stats: readonly HeroStat[] = [
    { value: 11, labelKey: 'heroStatFarms' },
    { value: 15, unitKey: 'heroUnitKg', labelKey: 'heroStatBatch' },
    { value: 24, unitKey: 'heroUnitHours', labelKey: 'heroStatDispatch' },
  ];

  /**
   * False once the pack PNG fails to load, which swaps in a CSS-drawn stand-in
   * so the stage keeps its composition instead of collapsing to a broken icon.
   */
  readonly packLoaded = signal(true);

  /** Pointer-driven lean, written straight into the stage's custom properties. */
  readonly tiltX = signal('0deg');
  readonly tiltY = signal('0deg');

  onPackError(): void {
    this.packLoaded.set(false);
  }

  onPointerMove(event: PointerEvent): void {
    // Coarse pointers land as a single tap in the middle of a drag; leaving the
    // pack still there reads as intentional rather than twitchy.
    if (event.pointerType !== 'mouse') {
      return;
    }

    const stage = event.currentTarget as HTMLElement;
    const bounds = stage.getBoundingClientRect();
    const fromCentreX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const fromCentreY = (event.clientY - bounds.top) / bounds.height - 0.5;

    this.tiltY.set(`${(fromCentreX * TILT_RANGE * 2).toFixed(2)}deg`);
    this.tiltX.set(`${(-fromCentreY * TILT_RANGE).toFixed(2)}deg`);
  }

  resetTilt(): void {
    this.tiltX.set('0deg');
    this.tiltY.set('0deg');
  }
}
