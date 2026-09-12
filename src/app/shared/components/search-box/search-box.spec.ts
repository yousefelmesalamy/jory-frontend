import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type MockInstance, vi } from 'vitest';

import { LOCALE_COOKIE } from '../../../core/i18n/locale';
import { SearchSuggestions } from '../../../core/models';
import { SearchBox } from './search-box';

const EMPTY: SearchSuggestions = { products: [], categories: [] };

const MATCHES: SearchSuggestions = {
  products: [
    {
      id: 1,
      name: 'Ethiopia Yirgacheffe',
      slug: 'ethiopia-yirgacheffe',
      product_type: 'COFFEE',
      price_from: '250.00',
      primary_image: {
        id: 9,
        image: '/media/products/yirgacheffe.jpg',
        alt_text: 'A bag of Yirgacheffe',
        is_primary: true,
        display_order: 0,
      },
    },
    {
      id: 2,
      name: 'Yirga Espresso Blend',
      slug: 'yirga-espresso',
      product_type: 'COFFEE',
      price_from: '180.00',
      primary_image: null,
    },
  ],
  categories: [{ id: 5, name: 'Yirgacheffe lots', slug: 'yirgacheffe-lots' }],
};

describe('SearchBox', () => {
  let fixture: ComponentFixture<SearchBox>;
  let component: SearchBox;
  let httpMock: HttpTestingController;
  let navigate: MockInstance;

  /**
   * Real timers, not fake ones: `vi.useFakeTimers()` stalls `whenStable()`,
   * since Angular's own scheduling runs through the timers it replaces. The
   * debounce is 200ms, so the waits here stay short enough not to matter.
   */
  async function settle(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await fixture.whenStable();
  }

  /** Types into the field and lets the debounce window elapse. */
  async function type(value: string): Promise<void> {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.search-box__input');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle(250);
  }

  async function press(key: string): Promise<void> {
    fixture.nativeElement
      .querySelector('.search-box__input')
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  }

  function rowLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.search-box__row')].map((row) =>
      (row as HTMLElement).textContent!.trim().replace(/\s+/g, ' '),
    );
  }

  function activeRowIndex(): number {
    return [...fixture.nativeElement.querySelectorAll('.search-box__row')].findIndex((row) =>
      (row as HTMLElement).classList.contains('is-active'),
    );
  }

  beforeEach(async () => {
    localStorage.clear();
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    await TestBed.configureTestingModule({
      imports: [SearchBox],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBox);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('waits for the debounce window before asking the API', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.search-box__input');
    input.value = 'yirga';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    httpMock.expectNone(() => true);

    await settle(250);
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(EMPTY);
  });

  it('sends one request for a burst of keystrokes', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.search-box__input');
    for (const value of ['y', 'yi', 'yir', 'yirg', 'yirga']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle(40);
    }
    await settle(250);

    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(EMPTY);
    httpMock.verify();
  });

  it('stays quiet for a single character', async () => {
    await type('y');
    httpMock.expectNone(() => true);
  });

  it('renders products, categories and the see-all row in one list', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    expect(rowLabels()).toEqual([
      'Ethiopia Yirgacheffe 250 S.P',
      'Yirga Espresso Blend 180 S.P',
      '# Yirgacheffe lots Category',
      'See all results for "yirga" →',
    ]);
  });

  it('shows a thumbnail when the suggestion has one', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    const thumb: HTMLImageElement = fixture.nativeElement.querySelector('img.search-box__thumb');
    expect(thumb.getAttribute('src')).toBe('/media/products/yirgacheffe.jpg');
    expect(thumb.getAttribute('alt')).toBe('A bag of Yirgacheffe');
  });

  it('bolds the matched part of a name', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    const marks = [...fixture.nativeElement.querySelectorAll('.search-box__label mark')].map(
      (el) => (el as HTMLElement).textContent,
    );
    // Case-insensitive match, but the name's own casing is preserved.
    expect(marks).toEqual(['Yirga', 'Yirga', 'Yirga']);
  });

  it('offers a way out when nothing matched', async () => {
    await type('zzzz');
    httpMock.expectOne('/api/search/suggest/?q=zzzz').flush(EMPTY);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.search-box__empty').textContent).toContain('zzzz');
    expect(rowLabels()).toEqual(['See all results for "zzzz" →']);
  });

  it('walks the rows with the arrow keys and back off the top', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    expect(activeRowIndex()).toBe(-1);

    await press('ArrowDown');
    expect(activeRowIndex()).toBe(0);

    await press('ArrowDown');
    expect(activeRowIndex()).toBe(1);

    await press('ArrowUp');
    expect(activeRowIndex()).toBe(0);

    // Back past the first row returns to the raw term rather than trapping.
    await press('ArrowUp');
    expect(activeRowIndex()).toBe(-1);
  });

  it('wraps from the last row round to the raw term', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    for (let i = 0; i < 4; i += 1) {
      await press('ArrowDown');
    }
    expect(activeRowIndex()).toBe(3);

    await press('ArrowDown');
    expect(activeRowIndex()).toBe(-1);
  });

  it('opens the highlighted product on Enter', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    await press('ArrowDown');
    await press('Enter');

    expect(navigate).toHaveBeenCalledWith(['/shop', 'ethiopia-yirgacheffe'], undefined);
  });

  it('filters by category when a category row is chosen', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    for (let i = 0; i < 3; i += 1) {
      await press('ArrowDown');
    }
    await press('Enter');

    expect(navigate).toHaveBeenCalledWith(['/shop'], {
      queryParams: { category: 'yirgacheffe-lots' },
    });
  });

  it('runs a full search on Enter when no row is highlighted', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    await press('Enter');

    expect(navigate).toHaveBeenCalledWith(['/shop'], { queryParams: { search: 'yirga' } });
  });

  it('records a submitted term as a recent search', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    await press('Enter');

    expect(component.recent()).toEqual(['yirga']);
  });

  it('closes on the first Escape and clears on the second', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();

    expect(component.panelOpen()).toBe(true);

    await press('Escape');
    expect(component.panelOpen()).toBe(false);
    expect(component.term()).toBe('yirga');

    await press('Escape');
    expect(component.term()).toBe('');
  });

  it('offers recent searches once the box is emptied', async () => {
    await type('yirga');
    httpMock.expectOne('/api/search/suggest/?q=yirga').flush(MATCHES);
    await fixture.whenStable();
    await press('Enter');

    await type('');
    fixture.nativeElement.querySelector('.search-box__input').dispatchEvent(new Event('focus'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.search-box__section-title')).toBeTruthy();
    expect(rowLabels()).toEqual(['↺yirga']);
  });

  it('keeps the dropdown shut rather than erroring when the API fails', async () => {
    await type('yirga');
    httpMock
      .expectOne('/api/search/suggest/?q=yirga')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    // The see-all row survives, so the visitor can still run the full search.
    expect(rowLabels()).toEqual(['See all results for "yirga" →']);
  });
});
