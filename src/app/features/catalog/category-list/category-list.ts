import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Category } from '../../../core/models';
import { CatalogService } from '../../../core/services/catalog.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

/**
 * Pastel fills for the category avatars, cycled by index. Categories carry no
 * colour of their own, and most have no `image` yet either — this is what a
 * tile falls back to (behind an initial) until staff upload a photo.
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

@Component({
  selector: 'app-category-list',
  imports: [RouterLink, GenericList],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})
export class CategoryList {
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly categories = signal<readonly Category[]>([]);

  constructor() {
    this.catalog.listCategories().subscribe((categories) => this.categories.set(categories));
  }

  protected swatch(index: number): string {
    return SWATCHES[index % SWATCHES.length];
  }
}
