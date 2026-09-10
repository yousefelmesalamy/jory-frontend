import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../core/i18n/translation.service';
import { Category, Facet, Product, ProductFilters } from '../../../core/models';
import { CatalogService } from '../../../core/services/catalog.service';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';
import { GenericCard } from '../../../shared/components/generic-card/generic-card';
import { GenericList } from '../../../shared/components/generic-list/generic-list';
import { RiyalSymbol } from '../../../shared/components/riyal-symbol/riyal-symbol';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { WishlistToggle } from '../../../shared/components/wishlist-toggle/wishlist-toggle';

const PAGE_SIZE = 20;

/** Rendered as a pill group rather than a `<select>`, so the choices stay visible. */
interface Choice {
  readonly value: string;
  readonly label: string;
}

/**
 * Facets whose control is bespoke, so they stay as static markup: price is two
 * number inputs, the switches share a wrapper, sort lives in the results
 * toolbar. The rail loop draws everything else.
 */
const STATIC_FACETS = new Set(['type', 'price', 'on_sale', 'in_stock', 'best_selling', 'ordering']);

/** Facet key -> the form control it drives, where the names differ. */
const CONTROL_BY_FACET: Record<string, string> = {
  machine_type: 'machineType',
};

/** Facet key -> the query param to drop when that facet stops being offered. */
const PARAMS_BY_FACET: Record<string, string> = {
  roast: 'roast',
  process: 'process',
  origin: 'origin',
  flavor: 'flavor',
  roaster: 'roaster',
  brand: 'brand',
  machine_type: 'machine_type',
};

/** A colour is presentation, not data, so the shades stay here rather than
 * riding along in the API response. */
const ROAST_SHADES: Record<string, string> = {
  LIGHT: '#c89b62',
  MEDIUM: '#a06a3c',
  MEDIUM_DARK: '#6f4525',
  DARK: '#402614',
};

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
  imports: [
    RouterLink,
    ReactiveFormsModule,
    GenericList,
    GenericCard,
    RiyalSymbol,
    PricePipe,
    WishlistToggle,
    Dropdown,
  ],
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
  readonly flavor = input('');
  readonly process = input('');
  readonly roast = input('');
  readonly brand = input('');
  readonly machineType = input('', { alias: 'machine_type' });
  readonly minPrice = input('', { alias: 'min_price' });
  readonly maxPrice = input('', { alias: 'max_price' });
  readonly onSale = input('', { alias: 'on_sale' });
  readonly inStock = input('', { alias: 'in_stock' });
  readonly bestSelling = input('', { alias: 'best_selling' });
  readonly ordering = input('');
  readonly page = input('1');

  protected readonly categories = signal<readonly Category[]>([]);

  /** Roots plus their children, flattened one level — for looking a category up by slug
   * regardless of whether it's a parent or a child (the `category` filter accepts both,
   * though the sidebar `<select>` below only lists roots). */
  protected readonly flatCategories = computed<readonly Category[]>(() =>
    this.categories().flatMap((root) => [root, ...root.children]),
  );

  /**
   * The subcategory row shown above the grid once a category is selected: a
   * parent's own children, or — when the selected slug is itself a child —
   * its siblings, so picking any category surfaces the same lateral row.
   */
  protected readonly subcategories = computed<readonly Category[]>(() => {
    const slug = this.category();
    if (!slug) return [];
    for (const root of this.categories()) {
      if (root.slug === slug) return root.children;
      if (root.children.some((child) => child.slug === slug)) return root.children;
    }
    return [];
  });

  /** Drives the mobile filter drawer only; the rail is always open from 900px up. */
  protected readonly filtersOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    search: [''],
    category: [''],
    roaster: [''],
    type: [''],
    origin: [''],
    flavor: [''],
    process: [''],
    roast: [''],
    brand: [''],
    machineType: [''],
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

  /**
   * Which filters this scope actually has. Keyed on the category and the type
   * pills — the two filters that say what kind of product is being browsed —
   * and on nothing else, since no other filter changes which facets apply.
   */
  protected readonly facetsResource = resource({
    params: () => ({ category: this.category(), type: this.type() }),
    loader: ({ params }) => firstValueFrom(this.catalog.getFacets(params.category, params.type)),
  });

  /** The facets the rail loop draws: everything with a bespoke control removed. */
  protected readonly railFacets = computed<readonly Facet[]>(() =>
    (this.facetsResource.value()?.facets ?? []).filter((facet) => !STATIC_FACETS.has(facet.key)),
  );

  protected readonly bestSellingChoices = computed<readonly Choice[]>(() => [
    { value: 'week', label: this.t().bestSellingWeek },
    { value: 'month', label: this.t().bestSellingMonth },
    { value: 'year', label: this.t().bestSellingYear },
  ]);

  /** The sidebar dropdown lists roots only — a child is reached from the
   * subcategory row above the grid, not from here. */
  protected readonly categoryOptions = computed<DropdownOption[]>(() => [
    { value: '', label: this.t().filterAllCategories },
    ...this.categories().map((cat) => ({ value: cat.slug, label: cat.name })),
  ]);

  protected readonly sortOptions = computed<DropdownOption[]>(() => [
    { value: '', label: this.t().filterSort },
    { value: '-created_at', label: this.t().sortNewest },
    { value: 'created_at', label: this.t().sortOldest },
    { value: 'price', label: this.t().sortPriceLow },
    { value: '-price', label: this.t().sortPriceHigh },
    { value: '-rating_avg', label: this.t().sortRatingHigh },
    { value: 'name', label: this.t().sortNameAZ },
    { value: '-name', label: this.t().sortNameZA },
  ]);

  private readonly filters = computed<ProductFilters>(() => ({
    search: this.search() || undefined,
    category: this.category() || undefined,
    roaster: this.roaster() || undefined,
    type: (this.type() || undefined) as ProductFilters['type'],
    origin: this.origin() || undefined,
    flavor: this.flavor() || undefined,
    process: (this.process() || undefined) as ProductFilters['process'],
    roast: (this.roast() || undefined) as ProductFilters['roast'],
    brand: this.brand() || undefined,
    machine_type: (this.machineType() || undefined) as ProductFilters['machine_type'],
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

    /** A chip's label comes from the live facet options, so a brand the frontend
     * has never heard of still reads as its name rather than its slug. */
    const optionLabel = (facetKey: string, value: string) =>
      this.railFacets()
        .find((facet) => facet.key === facetKey)
        ?.options.find((option) => option.value === value)?.label ?? value;

    if (this.search()) chips.push({ control: 'search', label: this.search() });
    if (this.category()) {
      const match = this.flatCategories().find((cat) => cat.slug === this.category());
      chips.push({ control: 'category', label: match?.name ?? this.category() });
    }
    if (this.type()) {
      chips.push({ control: 'type', label: label(this.typeChoices(), this.type()) });
    }
    if (this.roast()) {
      chips.push({ control: 'roast', label: optionLabel('roast', this.roast()) });
    }
    if (this.process()) {
      chips.push({ control: 'process', label: optionLabel('process', this.process()) });
    }
    if (this.brand()) {
      chips.push({ control: 'brand', label: optionLabel('brand', this.brand()) });
    }
    if (this.machineType()) {
      chips.push({
        control: 'machineType',
        label: optionLabel('machine_type', this.machineType()),
      });
    }
    if (this.origin()) {
      chips.push({ control: 'origin', label: optionLabel('origin', this.origin()) });
    }
    if (this.flavor()) {
      chips.push({ control: 'flavor', label: optionLabel('flavor', this.flavor()) });
    }
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
          flavor: this.flavor(),
          process: this.process(),
          roast: this.roast(),
          brand: this.brand(),
          machineType: this.machineType(),
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

    // Leaving Coffee for Roasting Machines with `roast=DARK` still in the URL
    // would silently empty the grid — the param is valid, it just cannot match
    // a machine. `replaceUrl` so the cleanup is not a history entry the back
    // button has to walk through.
    //
    // Only a chosen category or type rules a filter out. With neither chosen
    // the facet list is the universal set — which offers no origin, roast or
    // flavor, but does not contradict them either — so a link like
    // /shop?origin=ethiopia from the home carousel keeps its filter instead of
    // being stripped bare the moment the page loads.
    effect(() => {
      const response = this.facetsResource.value();
      if (!response || (!this.category() && !this.type())) return;

      const offered = new Set(response.facets.map((facet) => facet.key));
      const stale: Record<string, null> = {};
      for (const [key, param] of Object.entries(PARAMS_BY_FACET)) {
        if (!offered.has(key) && this.route.snapshot.queryParamMap.get(param)) {
          stale[param] = null;
        }
      }
      if (!Object.keys(stale).length) return;

      this.router.navigate([], {
        relativeTo: this.route,
        queryParamsHandling: 'merge',
        queryParams: stale,
        replaceUrl: true,
      });
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
          flavor: value.flavor || null,
          process: value.process || null,
          roast: value.roast || null,
          brand: value.brand || null,
          machine_type: value.machineType || null,
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

  /** Pill groups are single-select: clicking the active pill turns the filter off.
   * Keyed by facet key rather than a closed union, since the rail's groups now
   * come from the API and include brand and machine type. */
  protected toggleChoice(facetKey: string, value: string): void {
    const field = this.form.get(CONTROL_BY_FACET[facetKey] ?? facetKey);
    if (!field) return;
    field.setValue(field.value === value ? '' : value);
  }

  protected isChosen(facetKey: string, value: string): boolean {
    return this.form.get(CONTROL_BY_FACET[facetKey] ?? facetKey)?.value === value;
  }

  protected roastShade(value: string): string {
    return ROAST_SHADES[value] ?? ROAST_SHADES['MEDIUM'];
  }

  /** Clicking a subcategory tile always selects it (never toggles off), like a breadcrumb. */
  protected selectCategory(slug: string): void {
    this.form.controls.category.setValue(slug);
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
