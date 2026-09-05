import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { Paginated, Review } from '../../../../core/models';
import { ReviewService } from '../../../../core/services/review.service';
import { GenericList } from '../../../../shared/components/generic-list/generic-list';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';

const PAGE_SIZE = 10;
const EMPTY_PAGE: Paginated<Review> = { count: 0, next: null, previous: null, results: [] };

@Component({
  selector: 'app-review-list',
  imports: [GenericList, StarRating],
  templateUrl: './review-list.html',
  styleUrl: './review-list.scss',
})
export class ReviewList {
  private readonly reviews_ = inject(ReviewService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly slug = input('');
  /** Bumped by the parent after a successful submission, to pull the new review in. */
  readonly refresh = input(0);

  protected readonly page = signal(1);

  protected readonly reviewsResource = resource({
    params: () => ({ slug: this.slug(), page: this.page(), refresh: this.refresh() }),
    loader: ({ params }) =>
      params.slug
        ? firstValueFrom(this.reviews_.listForProduct(params.slug, params.page))
        : Promise.resolve(EMPTY_PAGE),
  });

  protected readonly reviews = computed<readonly Review[]>(
    () => this.reviewsResource.value()?.results ?? [],
  );

  protected readonly loading = computed(() => this.reviewsResource.isLoading());

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.reviewsResource.value()?.count ?? 0) / PAGE_SIZE)),
  );

  constructor() {
    // A new product resets pagination — otherwise page 3 of the last product
    // could leave this one showing an empty page.
    effect(() => {
      this.slug();
      this.page.set(1);
    });
  }

  protected goToPage(page: number): void {
    this.page.set(page);
  }

  protected formatDate(iso: string): string {
    const locale = this.translation.locale() === 'ar' ? 'ar' : 'en';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(new Date(iso));
  }
}
