import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Category,
  FacetResponse,
  Origin,
  Paginated,
  Product,
  ProductDetail,
  ProductFilters,
} from '../models';
import { API_URL } from '../tokens/api-url.token';

/** Read side of the catalog. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  listProducts(filters: ProductFilters = {}): Observable<Paginated<Product>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<Paginated<Product>>(`${this.apiUrl}/products/`, { params });
  }

  getProduct(slug: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.apiUrl}/products/${slug}/`);
  }

  /**
   * Which filters apply to what is being browsed — a roasting machine is asked
   * about its brand, not its roast level. With no category, a product type
   * narrows the rail the same way; neither one means the universal set.
   */
  getFacets(category = '', type = ''): Observable<FacetResponse> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<FacetResponse>(`${this.apiUrl}/facets/`, { params });
  }

  /** Unpaginated — the taxonomy is small enough to render whole. */
  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/`);
  }

  /** Unpaginated — the lookup table is small enough to render whole. */
  listOrigins(): Observable<Origin[]> {
    return this.http.get<Origin[]>(`${this.apiUrl}/origins/`);
  }
}
