import { Component, inject } from '@angular/core';

import type { Copy } from '../../../../core/i18n/en';
import { TranslationService } from '../../../../core/i18n/translation.service';

/**
 * A customer testimonial. Quote/name/initial are copy-deck keys — placeholder
 * editorial content, not real reviews from `core/services/review.service.ts`
 * (whose `Review` model is still a bare `{ id }` stub).
 */
interface Testimonial {
  readonly quoteKey: keyof Copy;
  readonly whoKey: keyof Copy;
  readonly initialKey: keyof Copy;
}

/** The three-up "what our customers say" quote grid. */
@Component({
  selector: 'app-home-reviews',
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class HomeReviews {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly testimonials: readonly Testimonial[] = [
    { quoteKey: 'review1Quote', whoKey: 'review1Who', initialKey: 'review1Initial' },
    { quoteKey: 'review2Quote', whoKey: 'review2Who', initialKey: 'review2Initial' },
    { quoteKey: 'review3Quote', whoKey: 'review3Who', initialKey: 'review3Initial' },
  ];
}
