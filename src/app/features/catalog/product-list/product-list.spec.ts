import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { API_URL } from '../../../core/tokens/api-url.token';
import { ProductList } from './product-list';

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

const COFFEE_FACETS = {
  product_type: 'COFFEE',
  facets: [
    { key: 'type', label: 'Product type', kind: 'choice', options: [] },
    {
      key: 'roast',
      label: 'Roast',
      kind: 'choice',
      options: [
        { value: 'LIGHT', label: 'Light' },
        { value: 'DARK', label: 'Dark' },
      ],
    },
    { key: 'process', label: 'Process', kind: 'choice', options: [] },
  ],
};

const MACHINE_FACETS = {
  product_type: 'ROASTING_MACHINE',
  facets: [
    { key: 'type', label: 'Product type', kind: 'choice', options: [] },
    {
      key: 'brand',
      label: 'Brand',
      kind: 'choice',
      options: [{ value: 'probat', label: 'Probat' }],
    },
    {
      key: 'machine_type',
      label: 'Machine type',
      kind: 'choice',
      options: [{ value: 'DRUM_ROASTER', label: 'Drum roaster' }],
    },
  ],
};

describe('ProductList facets', () => {
  let fixture: ComponentFixture<ProductList>;
  let httpMock: HttpTestingController;

  /**
   * Drains the startup requests in microtask rounds. Deliberately not
   * `whenStable()`: the component's `resource()` loaders keep the fixture
   * unstable until their HTTP settles, and their HTTP cannot settle until we
   * flush — awaiting stability first deadlocks.
   */
  async function settle(facets: object): Promise<void> {
    fixture.detectChanges();
    for (let round = 0; round < 6; round += 1) {
      await Promise.resolve();
      for (const request of httpMock.match((req) => req.url.endsWith('/categories/'))) {
        request.flush([]);
      }
      for (const request of httpMock.match((req) => req.url.endsWith('/facets/'))) {
        request.flush(facets);
      }
      for (const request of httpMock.match((req) => req.url.includes('/products/'))) {
        request.flush(EMPTY_PAGE);
      }
      fixture.detectChanges();
    }
  }

  function legends(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.filter-group__label')].map(
      (node: Element) => node.textContent!.trim(),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductList);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    for (const request of httpMock.match(() => true)) {
      request.flush(EMPTY_PAGE);
    }
    httpMock.verify();
  });

  it('renders a group for each variable facet the backend returns', async () => {
    fixture.componentRef.setInput('category', 'roasting-machines');
    fixture.detectChanges();
    await settle(MACHINE_FACETS);

    expect(legends()).toContain('Brand');
    expect(legends()).toContain('Machine type');
  });

  it('draws no roast chips for a machine category', async () => {
    fixture.componentRef.setInput('category', 'roasting-machines');
    fixture.detectChanges();
    await settle(MACHINE_FACETS);

    expect(fixture.nativeElement.querySelectorAll('.roast__chip').length).toBe(0);
    expect(legends()).not.toContain('Roast');
  });

  it('draws roast chips for a coffee category', async () => {
    fixture.componentRef.setInput('category', 'coffee');
    fixture.detectChanges();
    await settle(COFFEE_FACETS);

    expect(fixture.nativeElement.querySelectorAll('.roast__chip').length).toBe(2);
  });

  it('clears a roast param that the new category has no facet for', async () => {
    // Put the param in the real URL first, then spy — the cleanup effect reads
    // it back off the route snapshot.
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { roast: 'DARK' } });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentRef.setInput('category', 'roasting-machines');
    fixture.componentRef.setInput('roast', 'DARK');
    fixture.detectChanges();
    await settle(MACHINE_FACETS);

    const cleared = navigate.mock.calls.some(
      ([, extras]) =>
        (extras as { queryParams?: Record<string, unknown> } | undefined)?.queryParams?.[
          'roast'
        ] === null,
    );
    expect(cleared).toBe(true);
  });

  it('leaves a param alone when its facet is still offered', async () => {
    // Put the param in the real URL first, then spy — the cleanup effect reads
    // it back off the route snapshot.
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { roast: 'DARK' } });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentRef.setInput('category', 'coffee');
    fixture.componentRef.setInput('roast', 'DARK');
    fixture.detectChanges();
    await settle(COFFEE_FACETS);

    const cleared = navigate.mock.calls.some(
      ([, extras]) =>
        (extras as { queryParams?: Record<string, unknown> } | undefined)?.queryParams?.[
          'roast'
        ] === null,
    );
    expect(cleared).toBe(false);
  });
});
