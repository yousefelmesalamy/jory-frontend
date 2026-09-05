import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Paginated, Review } from '../models';
import { API_URL } from '../tokens/api-url.token';

/**
 * Review rights are granted per delivered order item, so `submit` can 401/403 —
 * the caller decides what to show for that, this just forwards the response.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  listForProduct(slug: string, page = 1): Observable<Paginated<Review>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Paginated<Review>>(`${this.apiUrl}/products/${slug}/reviews/`, {
      params,
    });
  }

  submit(slug: string, rating: number, title: string, body: string): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/products/${slug}/reviews/`, {
      rating,
      title,
      body,
    });
  }
}
