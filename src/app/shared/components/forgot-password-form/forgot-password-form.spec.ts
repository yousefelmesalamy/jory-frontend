import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_URL } from '../../../core/tokens/api-url.token';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ForgotPasswordForm } from './forgot-password-form';

function setup(): { fixture: ComponentFixture<ForgotPasswordForm>; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [ForgotPasswordForm],
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
  });

  const fixture = TestBed.createComponent(ForgotPasswordForm);
  // The app's DEFAULT_LOCALE is 'ar', and TranslationService otherwise falls
  // back to the browser's language — pin it so these English-copy assertions
  // are deterministic regardless of the machine running the suite.
  TestBed.inject(TranslationService).setLocale('en');
  fixture.detectChanges();
  return { fixture, httpMock: TestBed.inject(HttpTestingController) };
}

function submitWith(fixture: ComponentFixture<ForgotPasswordForm>, email: string): void {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('#forgot-email');
  input.value = email;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

describe('ForgotPasswordForm', () => {
  it('does not call the API when the email is empty', () => {
    const { fixture, httpMock } = setup();

    submitWith(fixture, '');

    httpMock.expectNone('/api/auth/password-reset/');
  });

  it('does not call the API when the email is malformed', () => {
    const { fixture, httpMock } = setup();

    submitWith(fixture, 'not-an-email');

    httpMock.expectNone('/api/auth/password-reset/');
  });

  it('shows the confirmation state after a successful send', () => {
    const { fixture, httpMock } = setup();

    submitWith(fixture, 'shopper@example.com');
    httpMock.expectOne('/api/auth/password-reset/').flush({ detail: 'ok' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Check your email');
    expect(fixture.nativeElement.querySelector('#forgot-email')).toBeNull();
  });

  it('shows a translated message instead of the raw DRF string when throttled', () => {
    const { fixture, httpMock } = setup();

    submitWith(fixture, 'shopper@example.com');
    httpMock
      .expectOne('/api/auth/password-reset/')
      .flush(
        { error: { code: 'throttled', message: 'Request was throttled. Expected available in 3421 seconds.' } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Too many attempts. Please wait a while before trying again.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('throttled');
    expect(fixture.nativeElement.querySelector('#forgot-email')).not.toBeNull();
  });

  it('emits backToLogin when the back link is clicked', () => {
    const { fixture } = setup();
    const emitted: boolean[] = [];
    fixture.componentInstance.backToLogin.subscribe(() => emitted.push(true));

    fixture.nativeElement.querySelector('.forgot-form__back').click();

    expect(emitted.length).toBe(1);
  });
});
