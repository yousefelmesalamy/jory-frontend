import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { CategorySuggestion, ProductSuggestion, SearchSuggestions } from '../../../core/models';
import { SearchService } from '../../../core/services/search.service';
import { RiyalSymbol } from '../riyal-symbol/riyal-symbol';
import { PricePipe } from '../../pipes/price.pipe';

/** Below this, a query matches so much that the dropdown is noise. */
const MIN_CHARS = 2;

/** Long enough to skip the middle of a word, short enough to feel immediate. */
const DEBOUNCE_MS = 200;

const NO_SUGGESTIONS: SearchSuggestions = { products: [], categories: [] };

/**
 * One focusable line in the dropdown.
 *
 * Products, categories, recent terms and the see-all row are rendered in
 * different shapes but navigated as one flat list — arrowing down should walk
 * the panel top to bottom, not hop between sections. Keeping that list flat
 * here is what makes `activeIndex` a single number instead of a coordinate.
 */
export type SearchRow =
  | { kind: 'product'; key: string; term: string; product: ProductSuggestion }
  | { kind: 'category'; key: string; term: string; category: CategorySuggestion }
  | { kind: 'recent'; key: string; term: string }
  | { kind: 'all'; key: string; term: string };

/**
 * The storefront's search field: a type-ahead over `/api/search/suggest/`.
 *
 * Lives in `shared` rather than inside the header because the header renders it
 * twice — once in the desktop bar, once in the mobile drawer — and both need
 * the same keyboard and ARIA behaviour.
 */
@Component({
  selector: 'app-search-box',
  imports: [RiyalSymbol, PricePipe],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /** What is in the box right now — updated on every keystroke, undebounced. */
  readonly term = signal('');

  /** Whether the panel is showing. Focus opens it, Escape and blur close it. */
  readonly panelOpen = signal(false);

  /** -1 means "nothing selected": Enter then submits the raw term. */
  readonly activeIndex = signal(-1);

  readonly loading = signal(false);

  private readonly typed = new Subject<string>();

  private readonly suggestions = toSignal(
    this.typed.pipe(
      map((term) => term.trim()),
      debounceTime(DEBOUNCE_MS),
      distinctUntilChanged(),
      tap((term) => this.loading.set(term.length >= MIN_CHARS)),
      // switchMap, not mergeMap: a reply for "yir" that lands after the reply
      // for "yirga" would otherwise overwrite the newer, more specific list.
      switchMap((term) =>
        term.length < MIN_CHARS ? of(NO_SUGGESTIONS) : this.search.suggest(term),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: NO_SUGGESTIONS },
  );

  readonly products = computed(() => this.suggestions().products);
  readonly categories = computed(() => this.suggestions().categories);

  /** True once the term is long enough that the panel has something to say. */
  readonly querying = computed(() => this.term().trim().length >= MIN_CHARS);

  readonly recent = this.search.recent;

  /** Recent terms stand in for suggestions while the box is still too short. */
  readonly showingRecent = computed(() => !this.querying() && this.recent().length > 0);

  readonly rows = computed<SearchRow[]>(() => {
    const term = this.term().trim();

    if (!this.querying()) {
      return this.recent().map((entry, index) => ({
        kind: 'recent' as const,
        key: `recent-${index}`,
        term: entry,
      }));
    }

    return [
      ...this.products().map((product) => ({
        kind: 'product' as const,
        key: `product-${product.id}`,
        term,
        product,
      })),
      ...this.categories().map((category) => ({
        kind: 'category' as const,
        key: `category-${category.id}`,
        term,
        category,
      })),
      { kind: 'all' as const, key: 'all', term },
    ];
  });

  /** The see-all row is always present while querying, so "nothing found" is
   * about the two real lists, not about `rows` being empty. */
  readonly empty = computed(() => this.querying() && !this.loading() && this.rows().length === 1);

  readonly resultCount = computed(() => this.products().length + this.categories().length);

  readonly activeRowId = computed(() => {
    const row = this.rows()[this.activeIndex()];
    return row ? `search-row-${row.key}` : null;
  });

  /** Splits a suggestion name around the match so the template can bold it,
   * without an innerHTML round-trip that would need sanitising. */
  highlight(name: string): { before: string; match: string; after: string } {
    const term = this.term().trim();
    const at = term ? name.toLowerCase().indexOf(term.toLowerCase()) : -1;
    if (at < 0) {
      return { before: name, match: '', after: '' };
    }

    return {
      before: name.slice(0, at),
      match: name.slice(at, at + term.length),
      after: name.slice(at + term.length),
    };
  }

  onInput(value: string): void {
    this.term.set(value);
    this.activeIndex.set(-1);
    this.panelOpen.set(true);
    this.typed.next(value);
  }

  onFocus(): void {
    this.panelOpen.set(true);
  }

  /** A click inside the panel blurs the input before the row's click fires, so
   * the close is deferred rather than immediate. */
  onBlur(): void {
    setTimeout(() => this.close(), 150);
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        event.preventDefault();
        const row = this.rows()[this.activeIndex()];
        if (row) {
          this.choose(row);
        } else {
          this.submit();
        }
        break;
      }
      case 'Escape':
        // First Escape dismisses the panel, a second clears the box — so an
        // accidental open never costs the visitor what they had typed.
        if (this.panelOpen()) {
          this.close();
        } else {
          this.term.set('');
          this.typed.next('');
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  choose(row: SearchRow): void {
    switch (row.kind) {
      case 'product':
        this.go(['/shop', row.product.slug]);
        break;
      case 'category':
        this.go(['/shop'], { category: row.category.slug });
        break;
      case 'recent':
        this.term.set(row.term);
        this.typed.next(row.term);
        this.submit();
        break;
      case 'all':
        this.submit();
        break;
    }
  }

  submit(): void {
    const term = this.term().trim();
    if (!term) {
      return;
    }

    this.search.remember(term);
    this.go(['/shop'], { search: term });
  }

  clear(): void {
    this.term.set('');
    this.activeIndex.set(-1);
    this.typed.next('');
    this.field()?.nativeElement.focus();
  }

  clearRecent(): void {
    this.search.clearRecent();
  }

  close(): void {
    this.panelOpen.set(false);
    this.activeIndex.set(-1);
  }

  /**
   * Walks the row list, treating "nothing selected" (-1) as a stop of its own.
   * The cycle is therefore `total + 1` long: arrowing off either end lands back
   * on the raw term rather than trapping focus at the top or bottom row.
   */
  private move(delta: number): void {
    const total = this.rows().length;
    if (!total) {
      return;
    }

    this.panelOpen.set(true);
    this.activeIndex.update((index) => ((index + 1 + delta + total + 1) % (total + 1)) - 1);
  }

  private go(commands: unknown[], queryParams?: Record<string, string>): void {
    this.close();
    this.field()?.nativeElement.blur();
    void this.router.navigate(commands, queryParams ? { queryParams } : undefined);
  }
}
