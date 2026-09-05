import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Category, Product, ProductFilters } from '../../../core/models';
import { CatalogService } from '../../../core/services/catalog.service';
import { GenericCard } from '../../../shared/components/generic-card/generic-card';
import { GenericList } from '../../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../../shared/components/riyal-symbol/riyal-symbol';

const PAGE_SIZE = 20;

/** Rendered as a pill group rather than a `<select>`, so the choices stay visible. */
interface Choice {
  readonly value: string;
  readonly label: string;
}

/** A roast choice also carries the bean colour its chip is painted with. */
interface RoastChoice extends Choice {
  readonly shade: string;
}

/** One applied filter, shown as a removable chip above the grid. */
interface AppliedFilter {
  readonly control: string;
  readonly label: string;
}

/**
 * The shop grid. Every filter is a query param — bound straight onto these inputs by
 * `withComponentInputBinding()`, so the URL is the single source of truth and stays
 * shareable/bookmarkable. The filter form only ever *writes* to the URL; it reads its
 * displayed values back from these same inputs via the sync effect below.
 */
@Component({
  selector: 'app-product-list',
  imports: [RouterLink, ReactiveFormsModule, GenericList, GenericCard, RiyalSymbol],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private readonly catalog = inject(CatalogService);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly t = this.translation.t;

  readonly search = input('');
  readonly category = input('');
  readonly roaster = input('');
  readonly type = input('');
  readonly origin = input('');
  readonly process = input('');
  readonly roast = input('');
  readonly minPrice = input('', { alias: 'min_price' });
  readonly maxPrice = input('', { alias: 'max_price' });
  readonly onSale = input('', { alias: 'on_sale' });
  readonly inStock = input('', { alias: 'in_stock' });
  readonly bestSelling = input('', { alias: 'best_selling' });
  readonly ordering = input('');
  readonly page = input('1');

  protected readonly categories = signal<readonly Category[]>([]);

  /** Drives the mobile filter drawer only; the rail is always open from 900px up. */
  protected readonly filtersOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    search: [''],
    category: [''],
    roaster: [''],
    type: [''],
    origin: [''],
    process: [''],
    roast: [''],
    minPrice: [''],
    maxPrice: [''],
    onSale: [false],
    inStock: [false],
    bestSelling: [''],
    ordering: [''],
  });

  protected readonly typeChoices = computed<readonly Choice[]>(() => [
    { value: 'COFFEE', label: this.t().typeCoffee },
    { value: 'EQUIPMENT', label: this.t().typeEquipment },
    { value: 'ROASTING_MACHINE', label: this.t().typeRoastingMachine },
    { value: 'ACCESSORY', label: this.t().typeAccessory },
  ]);

  protected readonly roastChoices = computed<readonly RoastChoice[]>(() => [
    { value: 'LIGHT', label: this.t().roastLight, shade: '#c89b62' },
    { value: 'MEDIUM', label: this.t().roastMedium, shade: '#a06a3c' },
    { value: 'MEDIUM_DARK', label: this.t().roastMediumDark, shade: '#6f4525' },
    { value: 'DARK', label: this.t().roastDark, shade: '#402614' },
  ]);

  protected readonly processChoices = computed<readonly Choice[]>(() => [
    { value: 'WASHED', label: this.t().processWashed },
    { value: 'NATURAL', label: this.t().processNatural },
    { value: 'HONEY', label: this.t().processHoney },
    { value: 'ANAEROBIC', label: this.t().processAnaerobic },
    { value: 'WET_HULLED', label: this.t().processWetHulled },
  ]);

  protected readonly bestSellingChoices = computed<readonly Choice[]>(() => [
    { value: 'week', label: this.t().bestSellingWeek },
    { value: 'month', label: this.t().bestSellingMonth },
    { value: 'year', label: this.t().bestSellingYear },
  ]);

  private readonly filters = computed<ProductFilters>(() => ({
    search: this.search() || undefined,
    category: this.category() || undefined,
    roaster: this.roaster() || undefined,
    type: (this.type() || undefined) as ProductFilters['type'],
    origin: this.origin() || undefined,
    process: (this.process() || undefined) as ProductFilters['process'],
    roast: (this.roast() || undefined) as ProductFilters['roast'],
    min_price: this.minPrice() ? Number(this.minPrice()) : undefined,
    max_price: this.maxPrice() ? Number(this.maxPrice()) : undefined,
    on_sale: this.onSale() === 'true' || undefined,
    in_stock: this.inStock() === 'true' || undefined,
    best_selling: (this.bestSelling() || undefined) as ProductFilters['best_selling'],
    ordering: (this.ordering() || undefined) as ProductFilters['ordering'],
    page: Number(this.page() || '1'),
    page_size: PAGE_SIZE,
  }));

  protected readonly productsResource = resource({
    params: () => this.filters(),
    loader: ({ params }) => firstValueFrom(this.catalog.listProducts(params)),
  });

  protected readonly products = computed<readonly Product[]>(
    () => this.productsResource.value()?.results ?? [],
  );

  protected readonly loading = computed(() => this.productsResource.isLoading());

  /** Placeholder tiles, sized to a typical first screen rather than the full page. */
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  protected readonly currentPage = computed(() => Number(this.page() || '1'));

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.productsResource.value()?.count ?? 0) / PAGE_SIZE)),
  );

  /**
   * The applied filters, read off the URL inputs so the chips can never disagree with
   * the results. Each chip clears exactly one control.
   */
  protected readonly appliedFilters = computed<readonly AppliedFilter[]>(() => {
    const copy = this.t();
    const chips: AppliedFilter[] = [];
    const label = (choices: readonly Choice[], value: string) =>
      choices.find((choice) => choice.value === value)?.label ?? value;

    if (this.search()) chips.push({ control: 'search', label: this.search() });
    if (this.category()) {
      const match = this.categories().find((cat) => cat.slug === this.category());
      chips.push({ control: 'category', label: match?.name ?? this.category() });
    }
    if (this.type()) {
      chips.push({ control: 'type', label: label(this.typeChoices(), this.type()) });
    }
    if (this.roast()) {
      chips.push({ control: 'roast', label: label(this.roastChoices(), this.roast()) });
    }
    if (this.process()) {
      chips.push({ control: 'process', label: label(this.processChoices(), this.process()) });
    }
    if (this.origin()) chips.push({ control: 'origin', label: this.origin() });
    if (this.bestSelling()) {
      chips.push({
        control: 'bestSelling',
        label: label(this.bestSellingChoices(), this.bestSelling()),
      });
    }
    if (this.minPrice() || this.maxPrice()) {
      chips.push({
        control: 'price',
        label: `${this.minPrice() || copy.priceMin} – ${this.maxPrice() || copy.priceMax}`,
      });
    }
    if (this.onSale() === 'true') chips.push({ control: 'onSale', label: copy.filterOnSale });
    if (this.inStock() === 'true') chips.push({ control: 'inStock', label: copy.filterInStock });

    return chips;
  });

  constructor() {
    this.catalog.listCategories().subscribe((categories) => this.categories.set(categories));

    // Route -> form. `emitEvent: false` keeps this from re-triggering the navigation below,
    // so following a link elsewhere or using browser back/forward doesn't loop.
    effect(() => {
      this.form.patchValue(
        {
          search: this.search(),
          category: this.category(),
          roaster: this.roaster(),
          type: this.type(),
          origin: this.origin(),
          process: this.process(),
          roast: this.roast(),
          minPrice: this.minPrice(),
          maxPrice: this.maxPrice(),
          onSale: this.onSale() === 'true',
          inStock: this.inStock() === 'true',
          bestSelling: this.bestSelling(),
          ordering: this.ordering(),
        },
        { emitEvent: false },
      );
    });

    // Form -> route. Any filter change re-navigates and resets to page 1.
    this.form.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((value) => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParamsHandling: 'merge',
        queryParams: {
          search: value.search || null,
          category: value.category || null,
          roaster: value.roaster || null,
          type: value.type || null,
          origin: value.origin || null,
          process: value.process || null,
          roast: value.roast || null,
          min_price: value.minPrice || null,
          max_price: value.maxPrice || null,
          on_sale: value.onSale ? 'true' : null,
          in_stock: value.inStock ? 'true' : null,
          best_selling: value.bestSelling || null,
          ordering: value.ordering || null,
          page: null,
        },
      });
    });
  }

  /** Pill groups are single-select: clicking the active pill turns the filter off. */
  protected toggleChoice(control: 'type' | 'roast' | 'process' | 'bestSelling', value: string) {
    const field = this.form.controls[control];
    field.setValue(field.value === value ? '' : value);
  }

  protected isChosen(control: 'type' | 'roast' | 'process' | 'bestSelling', value: string) {
    return this.form.controls[control].value === value;
  }

  /** Clears the one control behind a chip. `price` covers both ends of the range. */
  protected removeFilter(control: string): void {
    if (control === 'price') {
      this.form.patchValue({ minPrice: '', maxPrice: '' });
    } else if (control === 'onSale' || control === 'inStock') {
      this.form.patchValue({ [control]: false });
    } else {
      this.form.patchValue({ [control]: '' });
    }
  }

  protected clearFilters(): void {
    this.form.reset();
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page },
    });
  }
}
