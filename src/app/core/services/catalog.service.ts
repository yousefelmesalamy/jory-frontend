import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Category, Paginated, Product, ProductDetail, ProductFilters } from '../models';
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

  /** Unpaginated — the taxonomy is small enough to render whole. */
  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/`);
  }
}
