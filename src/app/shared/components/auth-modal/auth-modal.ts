import { Component, HostListener, inject, input, linkedSignal, output } from '@angular/core';

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
