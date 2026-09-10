import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { API_URL } from '../../../../core/tokens/api-url.token';
import { HomeOrigins } from './origins';

function origin(id: number, name: string, slug: string) {
  return { id, name, slug };
}

describe('HomeOrigins', () => {
  let fixture: ComponentFixture<HomeOrigins>;
  let httpMock: HttpTestingController;

  /**
   * Answers the loader in microtask rounds. Deliberately not `whenStable()`:
   * the `resource()` loader keeps the fixture unstable until its HTTP settles,
   * and that cannot settle until we flush — awaiting stability first deadlocks.
   */
  async function settle(response: object[]): Promise<void> {
    fixture.detectChanges();

    for (let round = 0; round < 8; round += 1) {
      await Promise.resolve();
      for (const request of httpMock.match((req) => req.url.endsWith('/origins/'))) {
        request.flush(response);
      }
      fixture.detectChanges();
    }
  }

  function textsOf(selector: string): string[] {
    return [...fixture.nativeElement.querySelectorAll(selector)].map((node: Element) =>
      node.textContent!.trim(),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeOrigins],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeOrigins);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    for (const request of httpMock.match(() => true)) {
      request.flush([]);
    }
    httpMock.verify();
  });

  it('renders the origins the API returned, in that order', async () => {
    await settle([origin(1, 'Ethiopia', 'ethiopia'), origin(2, 'Colombia', 'colombia')]);

    expect(textsOf('.origin__name')).toEqual(['Ethiopia', 'Colombia']);
  });

  it('deep-links each card into the shop filtered by that origin slug', async () => {
    await settle([origin(1, 'Ethiopia', 'ethiopia')]);

    const link = fixture.nativeElement.querySelector('.origin__link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/shop?origin=ethiopia');
  });

  it('flags a country card and falls back to a cup for one that names no country', async () => {
    await settle([origin(1, 'Ethiopia', 'ethiopia'), origin(2, 'Multi-Origin', 'multi-origin')]);

    const [country, blend] = [...fixture.nativeElement.querySelectorAll('.origin')];

    expect(country.querySelector('.origin__flag').getAttribute('src')).toContain('/et.png');
    expect(country.querySelector('.origin__emoji').textContent.trim()).toBe('🇪🇹');

    expect(blend.querySelector('.origin__flag')).toBeNull();
    expect(blend.querySelector('.origin__emoji').textContent.trim()).toBe('☕');
  });

  it('says so rather than rendering an empty rail when the lookup table is empty', async () => {
    await settle([]);

    expect(fixture.nativeElement.querySelector('.origins__track')).toBeNull();
    // Against the deck rather than a literal: which language the fixture
    // resolves to is the TranslationService's business, not this test's.
    expect(fixture.nativeElement.querySelector('.origins__empty').textContent.trim()).toBe(
      TestBed.inject(TranslationService).t().emptyOrigins,
    );
  });
});
