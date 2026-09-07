import {
  Component,
  ElementRef,
  HostListener,
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
import { LoginForm } from '../login-form/login-form';
import { RegisterForm } from '../register-form/register-form';

export type AuthModalMode = 'login' | 'register';

/** Overlay wrapping `LoginForm`/`RegisterForm`, with a tab to flip between them. */
@Component({
  selector: 'app-auth-modal',
  imports: [LoginForm, RegisterForm],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModal {
  private readonly translation = inject(TranslationService);
  readonly t = this.translation.t;

  /** Which form to open with; switching tabs afterwards is local to this instance. */
  readonly mode = input.required<AuthModalMode>();

  readonly closed = output<void>();
  readonly authenticated = output<User>();

  protected readonly activeMode = linkedSignal(() => this.mode());

  /** What an account is actually for — a set, not a sequence, hence no numbering. */
  protected readonly perks = computed(() => {
    const copy = this.t();
    return [copy.authPerkOrders, copy.authPerkAddresses, copy.authPerkLoyalty];
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Opening moves focus into the dialog, so Escape and the tab order start
    // here rather than back on the page behind it.
    afterNextRender(() => this.dialog().nativeElement.focus({ preventScroll: true }));
  }

  protected switchTo(mode: AuthModalMode): void {
    this.activeMode.set(mode);
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
