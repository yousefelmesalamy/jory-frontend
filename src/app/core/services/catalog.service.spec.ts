import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../tokens/api-url.token';
import { CatalogService } from './catalog.service';

describe('CatalogService.getFacets', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('passes the category through as a query param', () => {
    service.getFacets('roasting-machines').subscribe();
    httpMock
      .expectOne('/api/facets/?category=roasting-machines')
      .flush({ product_type: 'ROASTING_MACHINE', facets: [] });
  });

  it('omits the param entirely when no category is given', () => {
    service.getFacets().subscribe();
    httpMock.expectOne('/api/facets/').flush({ product_type: null, facets: [] });
  });

  it('returns the facet list as given', () => {
    let received: readonly string[] = [];
    service.getFacets('coffee').subscribe((response) => {
      received = response.facets.map((facet) => facet.key);
    });
    httpMock
      .expectOne('/api/facets/?category=coffee')
      .flush({
        product_type: 'COFFEE',
        facets: [{ key: 'roast', label: 'Roast', kind: 'choice', options: [] }],
      });
    expect(received).toEqual(['roast']);
  });
});
