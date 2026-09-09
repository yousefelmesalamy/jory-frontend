import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';

import { TranslationService } from '../../../core/i18n/translation.service';
import { User } from '../../../core/models';
import { ForgotPasswordForm } from '../forgot-password-form/forgot-password-form';
import { LoginForm } from '../login-form/login-form';
import { RegisterForm } from '../register-form/register-form';

export type AuthModalMode = 'login' | 'register';

/**
 * `AuthModalMode` stays the *entry* mode — nothing opens the modal straight
 * into the forgot state, it is only ever reached from the login form.
 */
type ActiveMode = AuthModalMode | 'forgot';

/** Overlay wrapping `LoginForm`/`RegisterForm`, with a tab to flip between them. */
@Component({
  selector: 'app-auth-modal',
  imports: [LoginForm, RegisterForm, ForgotPasswordForm],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModal implements OnDestroy {
  private readonly translation = inject(TranslationService);
  private readonly document = inject(DOCUMENT);
  readonly t = this.translation.t;

  /** Which form to open with; switching tabs afterwards is local to this instance. */
  readonly mode = input.required<AuthModalMode>();

  readonly closed = output<void>();
  readonly authenticated = output<User>();

  protected readonly activeMode = linkedSignal<ActiveMode>(() => this.mode());

  /** What an account is actually for — a set, not a sequence, hence no numbering. */
  protected readonly perks = computed(() => {
    const copy = this.t();
    return [copy.authPerkOrders, copy.authPerkAddresses, copy.authPerkLoyalty];
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  private readonly previousBodyOverflow = this.document.body.style.overflow;

  constructor() {
    // Opening moves focus into the dialog, so Escape and the tab order start
    // here rather than back on the page behind it.
    afterNextRender(() => this.dialog().nativeElement.focus({ preventScroll: true }));
    // Without this, a scroll gesture that reaches the panel's edge chains
    // into the page behind the backdrop instead of stopping there.
    this.document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }

  protected switchTo(mode: AuthModalMode): void {
    this.activeMode.set(mode);
  }

  protected showForgot(): void {
    this.activeMode.set('forgot');
  }

  protected onSuccess(user: User): void {
    this.authenticated.emit(user);
    this.closed.emit();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
