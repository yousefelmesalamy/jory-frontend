import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Dropdown, DropdownOption } from './dropdown';

/**
 * Hosts the dropdown the way the real call sites do — through a reactive form
 * control — so the tests exercise the ControlValueAccessor rather than poking
 * at component internals.
 */
@Component({
  imports: [Dropdown, ReactiveFormsModule],
  template: `
    <app-dropdown
      [formControl]="control"
      [options]="options()"
      triggerId="host-trigger"
      triggerClass="host-class"
      ariaLabel="Sort by"
    />
  `,
})
class Host {
  readonly control = new FormControl<unknown>('');
  readonly options = signal<DropdownOption[]>([
    { value: '', label: 'Sort' },
    { value: '-created_at', label: 'Newest' },
    { value: 'price', label: 'Price: low to high' },
    { value: 'name', label: 'Name A–Z' },
  ]);
}

describe('Dropdown', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.dropdown__trigger');
  }

  function panel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.dropdown__panel');
  }

  function optionEls(): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll('.dropdown__option')];
  }

  function optionLabels(): string[] {
    return optionEls().map((el) => el.textContent!.trim());
  }

  function activeIndex(): number {
    return optionEls().findIndex((el) => el.classList.contains('is-active'));
  }

  async function press(key: string): Promise<void> {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    trigger().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();

    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows the label of the option the form control holds', async () => {
    host.control.setValue('price');
    await fixture.whenStable();

    expect(trigger().textContent).toContain('Price: low to high');
  });

  it('keeps the panel closed until the trigger is clicked', async () => {
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await open();

    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(optionLabels()).toEqual(['Sort', 'Newest', 'Price: low to high', 'Name A–Z']);
  });

  it('writes the chosen option back to the form control and closes', async () => {
    await open();
    optionEls()[1].click();
    await fixture.whenStable();

    expect(host.control.value).toBe('-created_at');
    expect(panel()).toBeNull();
    expect(trigger().textContent).toContain('Newest');
  });

  it('marks the control touched when the trigger is blurred', async () => {
    expect(host.control.touched).toBe(false);

    trigger().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await fixture.whenStable();

    expect(host.control.touched).toBe(true);
  });

  it('opens on ArrowDown with the selected option active', async () => {
    host.control.setValue('price');
    await fixture.whenStable();

    await press('ArrowDown');

    expect(panel()).not.toBeNull();
    expect(activeIndex()).toBe(2);
  });

  it('walks the list with the arrow keys and commits on Enter', async () => {
    await open();
    await press('ArrowDown');
    await press('ArrowDown');
    await press('Enter');

    expect(host.control.value).toBe('price');
    expect(panel()).toBeNull();
  });

  it('stops at the ends rather than wrapping around', async () => {
    await open();
    await press('ArrowUp');
    expect(activeIndex()).toBe(0);

    await press('End');
    expect(activeIndex()).toBe(3);

    await press('ArrowDown');
    expect(activeIndex()).toBe(3);

    await press('Home');
    expect(activeIndex()).toBe(0);
  });

  it('closes on Escape without changing the value', async () => {
    await open();
    await press('ArrowDown');
    await press('Escape');

    expect(panel()).toBeNull();
    expect(host.control.value).toBe('');
  });

  it('jumps to the option matching the typed letters', async () => {
    await open();
    await press('n');

    expect(activeIndex()).toBe(1);

    await press('a');

    // "na" only matches "Name A–Z", not "Newest".
    expect(activeIndex()).toBe(3);
  });

  it('keeps non-string values intact, as the checkout address ids need', async () => {
    host.options.set([
      { value: 7, label: 'Home' },
      { value: 12, label: 'Office' },
    ]);
    host.control.setValue(12);
    await fixture.whenStable();

    expect(trigger().textContent).toContain('Office');

    await open();
    optionEls()[0].click();
    await fixture.whenStable();

    expect(host.control.value).toBe(7);
  });

  it('passes the caller its trigger id, class and aria-label', () => {
    expect(trigger().id).toBe('host-trigger');
    expect(trigger().classList.contains('host-class')).toBe(true);
    expect(trigger().getAttribute('aria-label')).toBe('Sort by');
  });

  it('marks only the selected option as aria-selected', async () => {
    host.control.setValue('name');
    await fixture.whenStable();
    await open();

    expect(optionEls().map((el) => el.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
      'true',
    ]);
  });

  it('points aria-activedescendant at the active option', async () => {
    await open();
    await press('ArrowDown');

    const active = optionEls()[activeIndex()];
    expect(trigger().getAttribute('aria-activedescendant')).toBe(active.id);
    expect(active.id).not.toBe('');
  });

  it('falls back to the first option when the control holds a value nothing matches', async () => {
    host.control.setValue(undefined);
    await fixture.whenStable();

    expect(trigger().textContent).toContain('Sort');
  });

  it('will not open while the control is disabled', async () => {
    host.control.disable();
    await fixture.whenStable();

    expect(trigger().disabled).toBe(true);

    await open();
    expect(panel()).toBeNull();
  });
});
