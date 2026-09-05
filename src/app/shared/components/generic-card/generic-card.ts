import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, contentChild, input } from '@angular/core';

/** Context handed to the caller's `#body` template. */
export interface GenericCardContext<T> {
  $implicit: T;
}

/**
 * A single framed record. Renders nothing until `item` is non-null, which keeps
 * every caller's loading and empty paths identical.
 */
@Component({
  selector: 'app-generic-card',
  imports: [NgTemplateOutlet],
  templateUrl: './generic-card.html',
  styleUrl: './generic-card.scss',
})
export class GenericCard<T> {
  readonly item = input<T | null>(null);
  readonly bodyTemplate = contentChild<TemplateRef<GenericCardContext<T>>>('body');
}
