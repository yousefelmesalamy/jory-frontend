import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TranslationService } from './core/i18n/translation.service';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /**
   * Injected here rather than only in the header: constructing the service is
   * what stamps `lang` and `dir` onto the document, and that has to happen for
   * the whole shell, not just the component that reads the copy deck.
   */
  private readonly translation = inject(TranslationService);
}
