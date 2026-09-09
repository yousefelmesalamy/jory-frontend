import {
  Component,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** One line in the panel. `value` is whatever the form control stores. */
export interface DropdownOption {
  value: unknown;
  label: string;
}

/** How long consecutive keystrokes count as one type-ahead search. */
const TYPEAHEAD_MS = 500;

/** Ids have to be unique per instance so `aria-activedescendant` can point at one. */
let instanceCount = 0;

/**
 * A listbox that stands in for a native `<select>`.
 *
 * Native selects render their popup with the platform's own widget, which no
 * stylesheet can reach — so the storefront's three of them looked like the OS
 * rather than like the shop. This draws its own trigger and panel instead.
 *
 * The trigger's look lives entirely in `dropdown.scss`, not in `triggerClass`:
 * a caller's page-level rule (`.shop__sort` etc.) is compiled scoped to the
 * elements *that caller's own template* renders, so it can never match an
 * element sitting inside this component's template, no matter what class
 * name is passed in. `triggerClass` is still accepted and applied — it's a
 * useful hook for tests and for `:host`-level layout selectors — but nothing
 * here should depend on it for borders, background, or color.
 *
 * It is a ControlValueAccessor, so the call sites keep their `formControlName`
 * untouched. `value` stays `unknown` rather than `string`: checkout binds
 * address ids, which are numbers, and a string-only control would coerce them.
 */
@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  host: { class: 'dropdown', '(focusout)': 'onFocusOut($event)' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Dropdown),
      multi: true,
    },
  ],
})
export class Dropdown implements ControlValueAccessor {
  private readonly uid = `dropdown-${instanceCount++}`;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly options = input<DropdownOption[]>([]);

  /** Lets `<label for="...">` still point at the control the select once was —
   * a `<button>` is labelable, so the association survives the swap. */
  readonly triggerId = input<string>();

  /** The caller's existing select class, so the closed control keeps its look. */
  readonly triggerClass = input('');

  readonly ariaLabel = input<string>();

  readonly value = signal<unknown>(null);
  readonly disabled = signal(false);
  readonly open = signal(false);

  /** Which option the keyboard is on — not the same as the chosen one. */
  readonly activeIndex = signal(0);

  readonly panelId = `${this.uid}-panel`;

  private typeahead = '';
  private lastKeyAt = 0;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  /** Falls back to the first option when nothing strictly matches — the same
   * thing a native `<select>` does with a value it doesn't recognise (`null`,
   * `undefined`, a stale id). Without this the trigger would rather show a
   * blank box than the closest sane thing. */
  readonly selectedIndex = computed(() => {
    const index = this.options().findIndex((option) => option.value === this.value());
    return index >= 0 ? index : 0;
  });

  readonly selectedLabel = computed(() => this.options()[this.selectedIndex()]?.label ?? '');

  readonly activeOptionId = computed(() =>
    this.open() ? this.optionId(this.activeIndex()) : null,
  );

  optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  // --- ControlValueAccessor ---

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.open.set(false);
    }
  }

  // --- interaction ---

  toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  /** Opens with the keyboard already on the chosen option, so the first arrow
   * press moves from where the visitor is rather than from the top. */
  openPanel(): void {
    if (this.disabled()) {
      return;
    }
    this.activeIndex.set(Math.max(0, this.selectedIndex()));
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.typeahead = '';
  }

  choose(index: number): void {
    const option = this.options()[index];
    if (!option) {
      return;
    }
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
  }

  /** Keeps focus on the trigger while the panel is clicked: the panel holds no
   * focusable elements of its own, so `aria-activedescendant` stays the single
   * source of truth for where the keyboard is. */
  onPanelMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  /** Focus leaving the whole component — a click elsewhere, or Tab — both
   * closes the panel and settles the control's touched state. No document
   * listener, which keeps this safe to render on the server. */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }
    this.close();
    this.onTouched();
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.move(event.key === 'ArrowDown' ? 1 : -1);
        }
        return;

      case 'Home':
      case 'End':
        if (!this.open()) {
          return;
        }
        event.preventDefault();
        this.activeIndex.set(event.key === 'Home' ? 0 : this.options().length - 1);
        return;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open() ? this.choose(this.activeIndex()) : this.openPanel();
        return;

      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
          this.triggerEl()?.nativeElement.focus();
        }
        return;

      case 'Tab':
        this.close();
        return;
    }

    if (event.key.length === 1) {
      this.typeAhead(event.key);
    }
  }

  private move(step: number): void {
    const last = this.options().length - 1;
    // Clamped, not wrapped: a native select stops at the ends too, and wrapping
    // makes a long list feel like it lost your place.
    this.activeIndex.set(Math.min(last, Math.max(0, this.activeIndex() + step)));
  }

  /** Letters typed close together search as one prefix, so "na" reaches
   * "Name A–Z" past "Newest". */
  private typeAhead(key: string): void {
    const now = Date.now();
    this.typeahead = now - this.lastKeyAt > TYPEAHEAD_MS ? key : this.typeahead + key;
    this.lastKeyAt = now;

    const prefix = this.typeahead.toLowerCase();
    const match = this.options().findIndex((option) =>
      option.label.toLowerCase().startsWith(prefix),
    );
    if (match < 0) {
      return;
    }

    if (!this.open()) {
      this.openPanel();
    }
    this.activeIndex.set(match);
  }
}
