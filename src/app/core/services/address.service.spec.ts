import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Address, AddressPayload, Paginated } from '../models';
import { API_URL } from '../tokens/api-url.token';
import { AddressService } from './address.service';

const ADDRESS: Address = {
  id: 1,
  full_name: 'Shopper One',
  phone: '+201000000000',
  country: 'Egypt',
  city: 'Cairo',
  area: 'Maadi',
  street_address: '12 Road 9',
  postal_code: '11431',
  notes: '',
  is_default: true,
  created_at: '2026-09-06T09:12:03Z',
};

const PAYLOAD: AddressPayload = {
  full_name: 'Shopper One',
  phone: '+201000000000',
  country: 'Egypt',
  city: 'Cairo',
  area: 'Maadi',
  street_address: '12 Road 9',
  postal_code: '11431',
  notes: '',
};

const PAGE: Paginated<Address> = { count: 1, next: null, previous: null, results: [ADDRESS] };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api' },
    ],
  });

  return {
    service: TestBed.inject(AddressService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AddressService', () => {
  it('lists the address book at a page size covering the whole book', () => {
    const { service, httpMock } = setup();

    let result: Paginated<Address> | undefined;
    service.list().subscribe((page) => (result = page));

    const req = httpMock.expectOne('/api/addresses/?page_size=100');
    expect(req.request.method).toBe('GET');
    req.flush(PAGE);

    expect(result).toEqual(PAGE);
    httpMock.verify();
  });

  it('creates an address without sending a user or is_default field', () => {
    const { service, httpMock } = setup();

    let result: Address | undefined;
    service.create(PAYLOAD).subscribe((address) => (result = address));

    const req = httpMock.expectOne('/api/addresses/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(PAYLOAD);
    req.flush(ADDRESS, { status: 201, statusText: 'Created' });

    expect(result).toEqual(ADDRESS);
    httpMock.verify();
  });

  it('replaces an address with PUT', () => {
    const { service, httpMock } = setup();

    service.update(1, PAYLOAD).subscribe();

    const req = httpMock.expectOne('/api/addresses/1/');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(PAYLOAD);
    req.flush(ADDRESS);

    httpMock.verify();
  });

  it('patches only the given fields, e.g. setting a new default', () => {
    const { service, httpMock } = setup();

    service.patch(1, { is_default: true }).subscribe();

    const req = httpMock.expectOne('/api/addresses/1/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ is_default: true });
    req.flush({ ...ADDRESS, is_default: true });

    httpMock.verify();
  });

  it('deletes an address', () => {
    const { service, httpMock } = setup();

    service.remove(1).subscribe();

    const req = httpMock.expectOne('/api/addresses/1/');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    httpMock.verify();
  });
});
