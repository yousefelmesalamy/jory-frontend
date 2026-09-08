import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../../core/tokens/api-url.token';
import { HomeTopSellers } from './top-sellers';

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

function product(id: number, name: string) {
  return {
    id,
    name,
    slug: `p-${id}`,
    short_description: 'A bag of coffee.',
    product_type: { value: 'COFFEE', label: 'Coffee' },
    category: { id: 1, name: 'Coffee', slug: 'coffee' },
    roaster: null,
    is_featured: false,
    rating_avg: '4.8',
    rating_count: 12,
    price_from: '78.00',
    compare_at_price_from: null,
    is_on_sale: false,
    in_stock: true,
    primary_image: null,
  };
}

function page(...names: string[]) {
  const results = names.map((name, index) => product(index + 1, name));
  return { count: results.length, next: null, previous: null, results };
}

describe('HomeTopSellers', () => {
  let fixture: ComponentFixture<HomeTopSellers>;
  let httpMock: HttpTestingController;

  /** Every product URL the component asked for, in the order it asked. */
  let asked: string[];

  /**
   * Answers the loader's requests in microtask rounds, one queued page per
   * request. Deliberately not `whenStable()`: the `resource()` loader keeps the
   * fixture unstable until its HTTP settles, and that cannot settle until we
   * flush — awaiting stability first deadlocks.
   */
  async function settle(...responses: object[]): Promise<void> {
    const queue = [...responses];
    fixture.detectChanges();

    for (let round = 0; round < 8; round += 1) {
      await Promise.resolve();
      for (const request of httpMock.match((req) => req.url.endsWith('/products/'))) {
        asked.push(request.request.urlWithParams);
        request.flush(queue.shift() ?? EMPTY_PAGE);
      }
      fixture.detectChanges();
    }
  }

  function textOf(selector: string): string {
    return fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';
  }

  function textsOf(selector: string): string[] {
    return [...fixture.nativeElement.querySelectorAll(selector)].map((node: Element) =>
      node.textContent!.trim(),
    );
  }

  beforeEach(async () => {
    asked = [];

    await TestBed.configureTestingModule({
      imports: [HomeTopSellers],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeTopSellers);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    for (const request of httpMock.match(() => true)) {
      request.flush(EMPTY_PAGE);
    }
    httpMock.verify();
  });

  it('asks for the week ranking and renders it in the order the API returned', async () => {
    await settle(page('Uganda', 'Colombia', 'Ethiopia'));

    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain('best_selling=week');
    expect(asked[0]).toContain('page_size=8');

    expect(textsOf('.entry__name')).toEqual(['Uganda', 'Colombia', 'Ethiopia']);
    expect(textsOf('.entry__rank')).toEqual(['1', '2', '3']);
    expect(textOf('.chart__title')).toBe('Top sellers');
  });

  it('falls back to the newest products when nothing sold this week', async () => {
    await settle(EMPTY_PAGE, page('Just roasted'));

    expect(asked[1]).toContain('ordering=-created_at');
    expect(textOf('.chart__title')).toBe('Just landed');
    expect(textsOf('.entry__name')).toEqual(['Just roasted']);
  });

  it('renders nothing when both the ranking and the fallback are empty', async () => {
    await settle(EMPTY_PAGE, EMPTY_PAGE);

    expect(asked).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.chart')).toBeNull();
  });
});
