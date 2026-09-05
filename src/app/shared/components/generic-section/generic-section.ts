import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, contentChild, input } from '@angular/core';

import { GenericList, GenericListContext } from '../generic-list/generic-list';

/**
 * A headed row of records — the shape the home page repeats. Adds the heading
 * and forwards everything else to {@link GenericList}.
 */
@Component({
  selector: 'app-generic-section',
  imports: [NgTemplateOutlet, GenericList],
  templateUrl: './generic-section.html',
  styleUrl: './generic-section.scss',
})
export class GenericSection<T> {
  readonly heading = input('');
  readonly items = input<readonly T[]>([]);
  readonly emptyMessage = input('');
  readonly itemTemplate = contentChild<TemplateRef<GenericListContext<T>>>('item');
}
