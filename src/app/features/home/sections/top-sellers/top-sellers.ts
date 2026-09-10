import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { Product } from '../../../../core/models';
import { CatalogService } from '../../../../core/services/catalog.service';
import { RiyalSymbol } from '../../../../shared/components/riyal-symbol/riyal-symbol';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { WishlistToggle } from '../../../../shared/components/wishlist-toggle/wishlist-toggle';

/** How many entries the chart holds. One request, one rail, no pagination. */
const CHART_SIZE = 8;

/** A step moves most of a screenful, leaving a card in view as an anchor. */
const STEP_RATIO = 0.8;

/**
 * What the loader settled on: the week's ranking, or the newest products when
 * nothing has sold yet. `isFallback` drives the heading and the "see all" link,
 * so the page never claims a ranking it isn't showing.
 */
interface Chart {
  readonly products: readonly Product[];
  readonly isFallback: boolean;
}

/**
 * The week's sales chart. `?best_selling=week` comes back already ordered by
 * units shipped in the last seven days, so the array index *is* the rank —
 * nothing here re-sorts.
 *
 * A brand-new shop has no sales, and an empty slot on the landing page is
 * worse than a different one: when the week's ranking is empty the loader
 * falls back to the newest products and says so in the heading.
 */
@Component({
  selector: 'app-home-top-sellers',
  imports: [RouterLink, RiyalSymbol, PricePipe, WishlistToggle],
  templateUrl: './top-sellers.html',
  styleUrl: './top-sellers.scss',
})
export class HomeTopSellers {
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  /** Placeholder entries while the request is in flight, sized to the chart. */
  protected readonly skeletons = Array.from({ length: CHART_SIZE }, (_, index) => index);

  protected readonly chartResource = resource<Chart, unknown>({
    loader: async () => {
      const ranked = await this.load({ best_selling: 'week' });
      if (ranked.length) {
        return { products: ranked, isFallback: false };
      }
      return { products: await this.load({ ordering: '-created_at' }), isFallback: true };
    },
  });

  protected readonly products = computed<readonly Product[]>(
    () => this.chartResource.value()?.products ?? [],
  );

  protected readonly isFallback = computed(() => this.chartResource.value()?.isFallback ?? false);

  protected readonly loading = computed(() => this.chartResource.isLoading());

  protected readonly heading = computed(() =>
    this.isFallback() ? this.t().chartFreshTitle : this.t().chartTitle,
  );

  protected readonly note = computed(() =>
    this.isFallback() ? this.t().chartFreshNote : this.t().chartNote,
  );

  protected readonly allLabel = computed(() =>
    this.isFallback() ? this.t().chartAllNew : this.t().chartAllRanked,
  );

  /** "See all" reproduces the query the rail was built from, so the shop opens
   * on the same list rather than an unfiltered grid. */
  protected readonly allParams = computed<Params>(() =>
    this.isFallback() ? { ordering: '-created_at' } : { best_selling: 'week' },
  );

  /** Arrow state. The rail is a plain scroller, so these only mirror it. */
  protected readonly scrollable = signal(false);
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  constructor() {
    // Re-measures after the entries render and after every later change to them.
    // `afterRenderEffect` never runs on the server, so the rail is only ever
    // measured where it actually has a layout.
    afterRenderEffect(() => {
      this.products();
      this.loading();
      this.syncArrows();
    });
  }

  protected rankLabel(index: number): string {
    return `${this.t().chartRank} ${index + 1}`;
  }

  protected syncArrows(): void {
    const el = this.rail()?.nativeElement;
    if (!el) {
      this.scrollable.set(false);
      return;
    }

    // RTL scrollers report `scrollLeft` as a negative offset from the right
    // edge, so distance-from-start is the magnitude in both directions.
    const travelled = Math.abs(el.scrollLeft);
    const total = el.scrollWidth - el.clientWidth;

    this.scrollable.set(total > 1);
    this.atStart.set(travelled <= 1);
    this.atEnd.set(travelled >= total - 1);
  }

  /** `step` is logical: -1 is back toward rank 1, 1 is on toward rank 8. */
  protected scrollRail(step: 1 | -1): void {
    const el = this.rail()?.nativeElement;
    if (!el) return;

    // `scrollBy`'s `left` is a physical axis, so RTL needs the sign flipped to
    // keep "next" meaning the next rank rather than the previous one.
    const direction = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    // An explicit `behavior` beats CSS `scroll-behavior`, so reduced motion has
    // to be read here rather than left to the stylesheet.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    el.scrollBy({
      left: step * direction * el.clientWidth * STEP_RATIO,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  /** A failed request is treated as an empty one: the fallback covers both. */
  private async load(filters: { best_selling?: 'week'; ordering?: '-created_at' }) {
    const page = await firstValueFrom(
      this.catalog
        .listProducts({ ...filters, page_size: CHART_SIZE })
        .pipe(catchError(() => of(null))),
    );
    return page?.results ?? [];
  }
}
