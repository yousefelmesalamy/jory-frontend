import { Component, computed, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Address } from '../../../core/models';
import { AddressService } from '../../../core/services/address.service';
import { AddressForm } from '../../../shared/components/address-form/address-form';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

/** `'new'` opens a blank form; an `Address` opens the same form pre-filled for editing. */
type Editing = Address | 'new' | null;

@Component({
  selector: 'app-addresses',
  imports: [GenericList, AddressForm],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class Addresses {
  private readonly addressService = inject(AddressService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  protected readonly editing = signal<Editing>(null);
  /** The address id currently being deleted, so its card can show a busy state. */
  protected readonly deletingId = signal<number | null>(null);
  /** The address id currently being promoted to default. */
  protected readonly settingDefaultId = signal<number | null>(null);

  protected readonly addressesResource = resource({
    loader: () => firstValueFrom(this.addressService.list()),
  });

  protected readonly addresses = computed<readonly Address[]>(
    () => this.addressesResource.value()?.results ?? [],
  );
  protected readonly loading = computed(() => this.addressesResource.isLoading());

  protected editingAddress(): Address | null {
    const value = this.editing();
    return value === 'new' ? null : value;
  }

  protected addressLine(address: Address): string {
    return [
      address.street_address,
      address.area,
      address.city,
      address.country,
      address.postal_code,
    ]
      .filter((part) => part)
      .join(', ');
  }

  /** City / district / postal code, as separate pills — the parts a courier
   * scans for, pulled out of the one-line join above. */
  protected locationChips(address: Address): string[] {
    return [address.city, address.area, address.postal_code].filter((part) => part);
  }

  /** The letter for the card's avatar disc. Falls back to a dot rather than an
   * empty circle when the name starts with something unrenderable. */
  protected initial(address: Address): string {
    return address.full_name.trim().charAt(0) || '•';
  }

  /** Which card just had its address copied, so only that one flips its label. */
  protected readonly copiedId = signal<number | null>(null);

  /** Guarded rather than platform-checked: `navigator.clipboard` is absent
   * under SSR and on insecure origins alike, and both should just no-op. */
  protected copy(address: Address): void {
    navigator.clipboard?.writeText(this.addressLine(address)).then(() => {
      this.copiedId.set(address.id);
      setTimeout(() => {
        if (this.copiedId() === address.id) {
          this.copiedId.set(null);
        }
      }, 1800);
    });
  }

  protected startAdd(): void {
    this.editing.set('new');
  }

  protected startEdit(address: Address): void {
    this.editing.set(address);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
  }

  protected onSaved(): void {
    this.editing.set(null);
    this.addressesResource.reload();
  }

  protected setDefault(address: Address): void {
    if (address.is_default || this.settingDefaultId() !== null) {
      return;
    }
    this.settingDefaultId.set(address.id);

    this.addressService.patch(address.id, { is_default: true }).subscribe({
      next: () => {
        this.settingDefaultId.set(null);
        this.addressesResource.reload();
      },
      error: () => this.settingDefaultId.set(null),
    });
  }

  protected remove(address: Address): void {
    if (this.deletingId() !== null) {
      return;
    }
    this.deletingId.set(address.id);

    this.addressService.remove(address.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.addressesResource.reload();
      },
      error: () => this.deletingId.set(null),
    });
  }
}
