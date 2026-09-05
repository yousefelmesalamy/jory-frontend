import { Component, computed, input } from '@angular/core';

/**
 * A 5-star meter filled to `value` (0–5, fractional allowed). Purely visual —
 * aria-hidden, since every caller already shows the numeric rating in text
 * next to it.
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRating {
  readonly value = input(0);

  protected readonly fillPercent = computed(() => {
    const clamped = Math.min(5, Math.max(0, this.value()));
    return `${(clamped / 5) * 100}%`;
  });
}
