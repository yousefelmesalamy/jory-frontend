import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterRenderEffect,
  computed,
  inject,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { OriginFlag, originFlag } from '../../../../core/data/origin-flags';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Origin } from '../../../../core/models';
import { CatalogService } from '../../../../core/services/catalog.service';

/** How long a card holds the front before the track advances. */
const AUTOPLAY_MS = 3600;

/** Ghost cards while the request is in flight. Enough to fill a desktop row. */
const SKELETON_COUNT = 5;

/** An origin row paired with the flag its slug resolves to, if any. */
interface OriginTile {
  readonly origin: Origin;
  readonly flag: OriginFlag | null;
}

/**
 * The origins carousel — every country the shop buys green coffee from, read
 * from `/origins/`, each card deep-linking into `/shop` filtered by that slug.
 *
 * The cards used to be three hardcoded copy-deck entries (Uganda, Colombia,
 * Ethiopia) with editorial altitudes and tasting notes. Those are gone: the
 * lookup table is the source of truth, an admin can add a country without a
 * frontend change, and the section can only claim origins the catalog actually
 * carries. What the row cannot claim any more is altitude or notes — the
 * serializer has neither — so the flag does the work the placeholder did.
 *
 * The track is a plain scroll-snap scroller; autoplay only nudges it, so touch
 * dragging, the arrows and the dots all drive the same thing and never fight.
 * It stops at the last card rather than looping infinitely — a wrap-around
 * needs cloned nodes, and a link the keyboard can reach twice is worse than a
 * carousel that comes to rest.
 */
@Component({
  selector: 'app-home-origins',
  imports: [RouterLink],
  templateUrl: './origins.html',
  styleUrl: './origins.scss',
})
export class HomeOrigins {
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly t = this.translation.t;

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  protected readonly skeletons = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  /** A failed request renders as an empty section, not as a broken one. */
  protected readonly originsResource = resource<readonly Origin[], unknown>({
    loader: async () => {
      const origins = await firstValueFrom(
        this.catalog.listOrigins().pipe(catchError(() => of(null))),
      );
      return origins ?? [];
    },
  });

  protected readonly loading = computed(() => this.originsResource.isLoading());

  protected readonly tiles = computed<readonly OriginTile[]>(() =>
    (this.originsResource.value() ?? []).map((origin) => ({
      origin,
      flag: originFlag(origin.slug),
    })),
  );

  /** Mirrors of the scroller, not state it reads back. */
  protected readonly scrollable = signal(false);
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);
  protected readonly active = signal(0);

  /** The visitor's own pause, kept apart from hover so leaving the section
   * doesn't undo a deliberate stop. */
  protected readonly paused = signal(false);
  private readonly hovered = signal(false);

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());

    // Runs only in the browser, and again whenever the cards change: the track
    // has no layout to measure until it has rendered real entries.
    afterRenderEffect(() => {
      this.tiles();
      this.loading();
      // `sync` writes the same mirrors `restart` reads, so the work is untracked:
      // the cards are the dependency, not the measurements taken from them.
      untracked(() => {
        this.sync();
        this.restart();
      });
    });
  }

  protected dotLabel(index: number): string {
    return this.tiles()[index]?.origin.name ?? '';
  }

  /** The scroller is the state; these only read it back out. */
  protected sync(): void {
    const el = this.track()?.nativeElement;
    if (!el) {
      this.scrollable.set(false);
      return;
    }

    // RTL scrollers report `scrollLeft` as a negative offset from the right
    // edge, so distance-from-start is the magnitude in both directions.
    const travelled = Math.abs(el.scrollLeft);
    const total = el.scrollWidth - el.clientWidth;
    const stride = this.stride(el);

    this.scrollable.set(total > 1);
    this.atStart.set(travelled <= 1);
    this.atEnd.set(travelled >= total - 1);
    this.active.set(stride ? Math.round(travelled / stride) : 0);
  }

  /** `step` is logical: -1 is back toward the first card in either direction. */
  protected step(step: 1 | -1): void {
    const el = this.track()?.nativeElement;
    if (!el) return;

    const stride = this.stride(el);
    if (!stride) return;

    const total = el.scrollWidth - el.clientWidth;
    const target = Math.abs(el.scrollLeft) + step * stride;

    this.scrollTo(el, Math.min(Math.max(target, 0), total));
  }

  protected goTo(index: number): void {
    const el = this.track()?.nativeElement;
    if (!el) return;

    this.scrollTo(el, index * this.stride(el));
  }

  protected togglePlay(): void {
    this.paused.update((paused) => !paused);
    this.restart();
  }

  protected setHovered(hovered: boolean): void {
    this.hovered.set(hovered);
    this.restart();
  }

  /**
   * Distance between two adjacent cards — width plus whatever gap the current
   * breakpoint gives them. Measured rather than assumed, because the card width
   * is a CSS decision that changes across three media queries. `offsetLeft`
   * runs the other way under RTL, so the magnitude of the delta is the stride.
   */
  private stride(el: HTMLElement): number {
    const cards = el.children;
    if (cards.length < 2) {
      return cards.length ? (cards[0] as HTMLElement).offsetWidth : 0;
    }
    return Math.abs((cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft);
  }

  /** `scrollTo`'s `left` is a physical axis; RTL counts it down from zero. */
  private scrollTo(el: HTMLElement, travelled: number): void {
    const direction = getComputedStyle(el).direction === 'rtl' ? -1 : 1;

    el.scrollTo({
      left: direction * travelled,
      behavior: this.reducedMotion() ? 'auto' : 'smooth',
    });
  }

  /**
   * Autoplay runs only when it has somewhere to go and nobody is in the way:
   * not on the server, not under reduced motion, not while the pointer is over
   * the section or the visitor has paused it. At the last card it returns to
   * the first, which is the one place the track does wrap.
   */
  private restart(): void {
    this.stop();

    if (!this.isBrowser || this.reducedMotion()) return;
    if (this.paused() || this.hovered() || !this.scrollable()) return;

    this.timer = setInterval(() => {
      if (this.atEnd()) {
        this.goTo(0);
      } else {
        this.step(1);
      }
    }, AUTOPLAY_MS);
  }

  private stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private reducedMotion(): boolean {
    return this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
