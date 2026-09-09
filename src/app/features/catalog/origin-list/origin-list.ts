import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Origin } from '../../../core/models';
import { CatalogService } from '../../../core/services/catalog.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

/**
 * Pastel fills for the origin tiles, cycled by index. Unlike `Category`, an
 * `Origin` row carries no image at all — name and slug are the whole model — so
 * the swatch behind the initial is the only visual a tile can have.
 */
const SWATCHES = [
  '#cfe3ea',
  '#e8ddc8',
  '#d8c3ad',
  '#f3dfa5',
  '#d7e5d0',
  '#ddd0e6',
  '#f1d9c0',
  '#cfe6da',
];

/**
 * The origins index — the "all origins" destination the header's mega panel
 * links to, and the overflow for its origins column, which only shows the first
 * few. Every tile deep-links into `/shop` filtered by that origin's slug.
 */
@Component({
  selector: 'app-origin-list',
  imports: [RouterLink, GenericList],
  templateUrl: './origin-list.html',
  styleUrl: './origin-list.scss',
})
export class OriginList {
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly origins = signal<readonly Origin[]>([]);

  constructor() {
    this.catalog.listOrigins().subscribe((origins) => this.origins.set(origins));
  }

  protected swatch(index: number): string {
    return SWATCHES[index % SWATCHES.length];
  }
}
