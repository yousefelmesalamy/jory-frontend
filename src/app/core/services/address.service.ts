import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Address, AddressPayload, Paginated } from '../models';
import { API_URL } from '../tokens/api-url.token';

/** The address book is small enough to render whole — one page covers it. */
const PAGE_SIZE = 100;

/** CRUD against `/api/addresses/` — see the Address Book Manifest. */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  list(): Observable<Paginated<Address>> {
    const params = new HttpParams().set('page_size', PAGE_SIZE);
    return this.http.get<Paginated<Address>>(`${this.apiUrl}/addresses/`, { params });
  }

  create(payload: AddressPayload): Observable<Address> {
    return this.http.post<Address>(`${this.apiUrl}/addresses/`, payload);
  }

  update(id: number, payload: AddressPayload): Observable<Address> {
    return this.http.put<Address>(`${this.apiUrl}/addresses/${id}/`, payload);
  }

  /** Also the "set as default" route — `{ is_default: true }` — see the
   * manifest's default-address rules: it clears every other address's flag
   * in the same request, so the caller never has to. */
  patch(id: number, payload: Partial<AddressPayload & { is_default: boolean }>): Observable<Address> {
    return this.http.patch<Address>(`${this.apiUrl}/addresses/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/addresses/${id}/`);
  }
}
