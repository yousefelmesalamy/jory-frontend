import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_URL } from '../../../core/tokens/api-url.token';
import { TranslationService } from '../../../core/i18n/translation.service';
import { AuthModal } from './auth-modal';

function setup(): ComponentFixture<AuthModal> {
  TestBed.configureTestingModule({
    imports: [AuthModal],
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
  });

  const fixture = TestBed.createComponent(AuthModal);
  fixture.componentRef.setInput('mode', 'login');
  // The app's DEFAULT_LOCALE is 'ar', and TranslationService otherwise falls
  // back to the browser's language — pin it so these English-copy assertions
  // are deterministic regardless of the machine running the suite.
  TestBed.inject(TranslationService).setLocale('en');
  fixture.detectChanges();
  return fixture;
}

describe('AuthModal — forgot state', () => {
  it('opens on the login form', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('app-login-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-forgot-password-form')).toBeNull();
  });

  it('switches to the forgot form when the login form asks', () => {
    const fixture = setup();

    fixture.nativeElement.querySelector('.login-form__forgot').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-forgot-password-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-login-form')).toBeNull();
  });

  it('hides the login/register tabs while in the forgot state', () => {
    const fixture = setup();

    fixture.nativeElement.querySelector('.login-form__forgot').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.auth-modal__tabs')).toBeNull();
  });

  it('shows the forgot-password heading, not the register heading, in the forgot state', () => {
    const fixture = setup();

    fixture.nativeElement.querySelector('.login-form__forgot').click();
    fixture.detectChanges();

    const heading: HTMLElement = fixture.nativeElement.querySelector('.auth-modal__title');
    expect(heading.textContent?.trim()).toBe('Reset your password');
    expect(heading.textContent?.trim()).not.toBe('Create your account');

    // The modal must not render its own copy of the subtitle: `ForgotPasswordForm`
    // already renders this same sentence as its lead paragraph, and doubling it
    // up (as `.auth-modal__subtitle` briefly did) is exactly the bug this guards.
    const subtitle = TestBed.inject(TranslationService).t().authForgotSubtitle;
    const occurrences = fixture.nativeElement.textContent.split(subtitle).length - 1;
    expect(occurrences).toBe(1);
  });

  it('goes back to login from the forgot form', () => {
    const fixture = setup();
    fixture.nativeElement.querySelector('.login-form__forgot').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.forgot-form__back').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-login-form')).not.toBeNull();
  });
});
