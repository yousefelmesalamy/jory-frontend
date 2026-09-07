import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SearchSuggestions } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { SearchService } from './search.service';

const EMPTY: SearchSuggestions = { products: [], categories: [] };

describe('SearchService.suggest', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sends the term as the q param', () => {
    service.suggest('yirga').subscribe();
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(EMPTY);
  });

  it('trims the term before sending it', () => {
    service.suggest('  yirga  ').subscribe();
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(EMPTY);
  });

  it('never calls the API for a blank term', () => {
    let received: SearchSuggestions | undefined;
    service.suggest('   ').subscribe((result) => (received = result));

    httpMock.expectNone(() => true);
    expect(received).toEqual(EMPTY);
  });

  it('resolves to empty rather than erroring when the request fails', () => {
    let received: SearchSuggestions | undefined;
    let errored = false;
    service.suggest('yirga').subscribe({
      next: (result) => (received = result),
      error: () => (errored = true),
    });

    httpMock
      .expectOne('/api/search/suggest/?q=yirga')
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(false);
    expect(received).toEqual(EMPTY);
  });
});

describe('SearchService recent terms', () => {
  let service: SearchService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(SearchService);
  });

  afterEach(() => localStorage.clear());

  it('keeps the most recent term first', () => {
    service.remember('chemex');
    service.remember('yirga');

    expect(service.recent()).toEqual(['yirga', 'chemex']);
  });

  it('promotes a repeated term instead of duplicating it', () => {
    service.remember('chemex');
    service.remember('yirga');
    service.remember('chemex');

    expect(service.recent()).toEqual(['chemex', 'yirga']);
  });

  it('holds at most five terms', () => {
    for (const term of ['a', 'b', 'c', 'd', 'e', 'f']) {
      service.remember(term);
    }

    expect(service.recent()).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  it('ignores a blank term', () => {
    service.remember('   ');
    expect(service.recent()).toEqual([]);
  });

  it('restores what an earlier session stored', () => {
    service.remember('yirga');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });

    expect(TestBed.inject(SearchService).recent()).toEqual(['yirga']);
  });

  it('survives unparseable stored history', () => {
    localStorage.setItem('jory.recentSearches', '{not json');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });

    expect(TestBed.inject(SearchService).recent()).toEqual([]);
  });

  it('clears the history on request', () => {
    service.remember('yirga');
    service.clearRecent();

    expect(service.recent()).toEqual([]);
    expect(localStorage.getItem('jory.recentSearches')).toBe('[]');
  });
});
