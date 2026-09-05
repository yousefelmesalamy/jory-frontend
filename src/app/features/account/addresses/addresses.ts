import { Component, inject, signal } from '@angular/core';

import { Address } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { GenericList } from '../../../shared/components/generic-list/generic-list';

@Component({
  selector: 'app-addresses',
  imports: [GenericList],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class Addresses {
  private readonly auth = inject(AuthService);

  protected readonly addresses = signal<readonly Address[]>([]);
}
