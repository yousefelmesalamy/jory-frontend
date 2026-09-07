import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { SearchSuggestions } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** Shared empty result, so a no-op path never allocates a fresh object. */
const NO_SUGGESTIONS: SearchSuggestions = { products: [], categories: [] };

const RECENT_KEY = 'jory.recentSearches';
const RECENT_LIMIT = 5;

/**
 * The search bar's data source: type-ahead suggestions, plus the short list of
 * terms this visitor searched before.
 *
 * Recent terms live in `localStorage` rather than on the server — they are a
 * convenience for one browser, not account state, and keeping them local means
 * the header needs no authenticated call to render.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Read once at construction; every later write goes through `remember()`. */
  readonly recent = signal<readonly string[]>(this.readRecent());

  /**
   * Type-ahead for a partial term.
   *
   * A failed request resolves to empty rather than erroring: a dropdown that
   * silently declines to appear is a far better outcome mid-keystroke than one
   * that tears down the stream and stops responding to everything after it.
   */
  suggest(term: string): Observable<SearchSuggestions> {
    const query = term.trim();
    if (!query) {
      return of(NO_SUGGESTIONS);
    }

    return this.http
      .get<SearchSuggestions>(`${this.apiUrl}/search/suggest/`, {
        params: new HttpParams().set('q', query),
      })
      .pipe(catchError(() => of(NO_SUGGESTIONS)));
  }

  /** Records a term the visitor actually submitted, most recent first. */
  remember(term: string): void {
    const query = term.trim();
    if (!query) {
      return;
    }

    const next = [query, ...this.recent().filter((entry) => entry !== query)].slice(
      0,
      RECENT_LIMIT,
    );
    this.recent.set(next);
    this.writeRecent(next);
  }

  clearRecent(): void {
    this.recent.set([]);
    this.writeRecent([]);
  }

  /** Storage is absent on the server and can throw in private mode — both mean
   * "no history", which is a perfectly good state for the dropdown to render. */
  private readRecent(): readonly string[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed
            .filter((entry): entry is string => typeof entry === 'string')
            .slice(0, RECENT_LIMIT)
        : [];
    } catch {
      return [];
    }
  }

  private writeRecent(terms: readonly string[]): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(terms));
    } catch {
      // A full or blocked store costs the visitor their history, nothing more.
    }
  }
}
