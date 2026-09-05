import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, contentChild, input } from '@angular/core';

/** Context handed to the caller's `#item` template for each entry. */
export interface GenericListContext<T> {
  $implicit: T;
  index: number;
}

/**
 * Layout-only list. It owns the container, the iteration and the empty state;
 * the caller owns every item's markup:
 *
 *   <app-generic-list [items]="products()" emptyMessage="Nothing here yet">
 *     <ng-template #item let-product>...</ng-template>
 *   </app-generic-list>
 */
@Component({
  selector: 'app-generic-list',
  imports: [NgTemplateOutlet],
  templateUrl: './generic-list.html',
  styleUrl: './generic-list.scss',
})
export class GenericList<T> {
  readonly items = input<readonly T[]>([]);
  readonly emptyMessage = input('');
  readonly itemTemplate = contentChild<TemplateRef<GenericListContext<T>>>('item');
}
