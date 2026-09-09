import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { API_URL } from '../../../core/tokens/api-url.token';
import { ResetPassword } from './reset-password';

function setup(
  params: Record<string, string> = { uid: 'MTI', token: 'abc-def' },
  platformId: 'browser' | 'server' = 'browser',
) {
  TestBed.configureTestingModule({
    imports: [ResetPassword],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_URL, useValue: '/api' },
      { provide: PLATFORM_ID, useValue: platformId },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of({ get: (key: string) => params[key] ?? null }) },
      },
    ],
  });

  const fixture = TestBed.createComponent(ResetPassword);
  // The app's DEFAULT_LOCALE is 'ar', and TranslationService otherwise falls
  // back to the browser's language — pin it so these English-copy assertions
  // are deterministic regardless of the machine running the suite.
  TestBed.inject(TranslationService).setLocale('en');
  fixture.detectChanges();
  return { fixture, httpMock: TestBed.inject(HttpTestingController) };
}

function verifyOk(fixture: ComponentFixture<ResetPassword>, httpMock: HttpTestingController): void {
  httpMock.expectOne('/api/auth/password-reset/verify/').flush({ valid: true });
  fixture.detectChanges();
}

function typePasswords(fixture: ComponentFixture<ResetPassword>, password: string, confirm: string): void {
  const fields: HTMLInputElement[] = [
    fixture.nativeElement.querySelector('#reset-password'),
    fixture.nativeElement.querySelector('#reset-password-confirm'),
  ];
  fields[0].value = password;
  fields[0].dispatchEvent(new Event('input'));
  fields[1].value = confirm;
  fields[1].dispatchEvent(new Event('input'));
  fixture.detectChanges();
  fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

describe('ResetPassword', () => {
  it('verifies the link from the query string on load', () => {
    const { httpMock } = setup();

    const req = httpMock.expectOne('/api/auth/password-reset/verify/');
    expect(req.request.body).toEqual({ uid: 'MTI', token: 'abc-def' });
    req.flush({ valid: true });
  });

  it('does not verify the link on the server, to avoid an SSR/hydration mismatch', () => {
    const { httpMock } = setup({ uid: 'MTI', token: 'abc-def' }, 'server');

    httpMock.expectNone('/api/auth/password-reset/verify/');
  });

  it('shows the expired state without calling verify when params are missing', () => {
    const { fixture, httpMock } = setup({});

    httpMock.expectNone('/api/auth/password-reset/verify/');
    expect(fixture.nativeElement.textContent).toContain('This link has expired');
  });

  it('shows the expired state when verify rejects the link', () => {
    const { fixture, httpMock } = setup();

    httpMock
      .expectOne('/api/auth/password-reset/verify/')
      .flush({ error: { code: 'invalid_reset_link', message: 'nope' } }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This link has expired');
    expect(fixture.nativeElement.querySelector('#reset-password')).toBeNull();
  });

  it('does not submit when the two passwords differ', () => {
    const { fixture, httpMock } = setup();
    verifyOk(fixture, httpMock);

    typePasswords(fixture, 'An0therStrongPass!', 'Mismatch9!');

    httpMock.expectNone('/api/auth/password-reset/confirm/');
  });

  it('posts the uid, token and new password on submit', () => {
    const { fixture, httpMock } = setup();
    verifyOk(fixture, httpMock);

    typePasswords(fixture, 'An0therStrongPass!', 'An0therStrongPass!');

    const req = httpMock.expectOne('/api/auth/password-reset/confirm/');
    expect(req.request.body).toEqual({
      uid: 'MTI',
      token: 'abc-def',
      new_password: 'An0therStrongPass!',
    });
    req.flush({ detail: 'Password updated.' });
  });

  it('shows the success state after confirming', () => {
    const { fixture, httpMock } = setup();
    verifyOk(fixture, httpMock);

    typePasswords(fixture, 'An0therStrongPass!', 'An0therStrongPass!');
    httpMock.expectOne('/api/auth/password-reset/confirm/').flush({ detail: 'Password updated.' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Password updated');
  });

  it("surfaces the server's password complaint on the field", () => {
    const { fixture, httpMock } = setup();
    verifyOk(fixture, httpMock);

    typePasswords(fixture, 'An0therStrongPass!', 'An0therStrongPass!');
    httpMock.expectOne('/api/auth/password-reset/confirm/').flush(
      {
        error: {
          code: 'validation_error',
          message: 'The submitted data is invalid.',
          details: { new_password: ['This password is too similar to your email address.'] },
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('too similar to your email address');
  });
});
