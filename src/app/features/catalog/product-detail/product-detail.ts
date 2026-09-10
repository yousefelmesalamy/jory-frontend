import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  Product,
  ProductDetail as ProductDetailModel,
  ProductImage,
  ProductVariant,
} from '../../../core/models';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { RiyalSymbol } from '../../../shared/components/riyal-symbol/riyal-symbol';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { WishlistToggle } from '../../../shared/components/wishlist-toggle/wishlist-toggle';
import { ReviewForm } from './review-form/review-form';
import { ReviewList } from './review-list/review-list';

/** One `{ k, v }` row in the specs grid — only the facts that actually apply are built. */
interface Spec {
  readonly k: string;
  readonly v: string;
}

/** `slug` arrives from the `:slug` segment via `withComponentInputBinding()`. */
@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, ReviewList, ReviewForm, RiyalSymbol, PricePipe, StarRating, WishlistToggle],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly slug = input('');

  protected readonly product = signal<ProductDetailModel | null>(null);
  protected readonly selectedVariant = signal<ProductVariant | null>(null);
  protected readonly activeImageIndex = signal(0);
  protected readonly quantity = signal(1);
  protected readonly justAdded = signal(false);
  protected readonly reviewsVersion = signal(0);

  protected readonly variants = computed<readonly ProductVariant[]>(
    () => this.product()?.variants ?? [],
  );

  /** Falls back to the primary image so the gallery never renders empty for a real product. */
  protected readonly images = computed<readonly ProductImage[]>(() => {
    const value = this.product();
    if (!value) {
      return [];
    }
    if (value.images.length) {
      return [...value.images].sort((a, b) => a.display_order - b.display_order);
    }
    return value.primary_image ? [value.primary_image] : [];
  });

  protected readonly activeImage = computed<ProductImage | null>(
    () => this.images()[this.activeImageIndex()] ?? this.images()[0] ?? null,
  );

  protected readonly price = computed(() => {
    const variant = this.selectedVariant();
    const value = this.product();
    if (variant) {
      return {
        current: variant.price,
        before: variant.compare_at_price,
        onSale: variant.is_on_sale,
        discountPercent: variant.discount_percent,
        inStock: variant.in_stock,
        stock: variant.stock_quantity,
      };
    }
    return {
      current: value?.price_from ?? '0.00',
      before: value?.compare_at_price_from ?? null,
      onSale: value?.is_on_sale ?? false,
      discountPercent: 0,
      inStock: value?.in_stock ?? false,
      stock: 1,
    };
  });

  protected readonly badge = computed(() => {
    const value = this.product();
    if (!value) {
      return null;
    }
    const copy = this.t();
    if (this.price().onSale) {
      return { text: copy.badgeOnSale, tone: 'sale' as const };
    }
    if (value.is_featured) {
      return { text: copy.badgeRecommended, tone: 'featured' as const };
    }
    return null;
  });

  /** "Grind" only when that's actually what the variants differ by — a set that
   * varies by weight but happens to share one grind would otherwise be mislabeled. */
  protected readonly variantPickerLabel = computed(() => {
    const list = this.variants();
    const copy = this.t();
    const grindsDiffer = new Set(list.map((variant) => variant.grind.value)).size > 1;
    const weightsDiffer = new Set(list.map((variant) => variant.weight_grams)).size > 1;
    return grindsDiffer && !weightsDiffer ? copy.grind : copy.options;
  });

  protected readonly specs = computed<readonly Spec[]>(() => {
    const value = this.product();
    if (!value) {
      return [];
    }
    const copy = this.t();
    const variant = this.selectedVariant();
    const list: Spec[] = [{ k: copy.specType, v: value.product_type.label }];

    if (value.roaster) {
      list.push({ k: copy.specRoaster, v: value.roaster.name });
    }
    if (variant) {
      list.push({ k: copy.specSku, v: variant.sku });
      if (variant.grind.label) {
        list.push({ k: copy.grind, v: variant.grind.label });
      }
      if (variant.weight_grams) {
        list.push({ k: copy.specWeight, v: `${variant.weight_grams} ${copy.unitGrams}` });
      }
    }
    return list;
  });

  /** "Colombia — Huila", or just "Colombia" when no region is on file. */
  protected readonly originLabel = computed(() => {
    const profile = this.product()?.coffee_profile;
    if (!profile) {
      return '';
    }
    return profile.region ? `${profile.origin.name} — ${profile.region}` : profile.origin.name;
  });

  protected readonly coffeeStats = computed<readonly Spec[]>(() => {
    const profile = this.product()?.coffee_profile;
    if (!profile) {
      return [];
    }
    const copy = this.t();
    const list: Spec[] = [];
    if (profile.process.label) {
      list.push({ k: copy.filterProcess, v: profile.process.label });
    }
    if (profile.roast_level.label) {
      list.push({ k: copy.filterRoast, v: profile.roast_level.label });
    }
    if (profile.variety) {
      list.push({ k: copy.profileVariety, v: profile.variety });
    }
    if (profile.altitude_masl) {
      list.push({ k: copy.profileAltitude, v: `${profile.altitude_masl} ${copy.unitMasl}` });
    }
    if (profile.harvest_year) {
      list.push({ k: copy.profileHarvest, v: String(profile.harvest_year) });
    }
    if (profile.cupping_score) {
      list.push({ k: copy.profileCupping, v: profile.cupping_score });
    }
    return list;
  });

  protected readonly recommendedResource = resource({
    params: () => ({
      category: this.product()?.category.slug ?? '',
      excludeId: this.product()?.id ?? 0,
    }),
    loader: async ({ params }): Promise<Product[]> => {
      if (!params.category) {
        return [];
      }
      const page = await firstValueFrom(
        this.catalog.listProducts({ category: params.category, page_size: 5 }),
      );
      return page.results.filter((item) => item.id !== params.excludeId).slice(0, 4);
    },
  });

  protected readonly recommended = computed(() => this.recommendedResource.value() ?? []);

  constructor() {
    // An `effect` (not a one-off call) because the router reuses this instance
    // when navigating between two `/shop/:slug` products — only a reactive
    // dependency on `slug()` picks that up.
    effect(() => this.loadProduct());
  }

  protected selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
  }

  protected selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  protected decrementQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected incrementQuantity(): void {
    this.quantity.update((value) => Math.min(this.price().stock, value + 1));
  }

  protected addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant || !this.price().inStock) {
      return;
    }

    this.cart.addItem(variant.id, this.quantity()).subscribe(() => {
      this.justAdded.set(true);
      setTimeout(() => this.justAdded.set(false), 2200);
    });
  }

  protected onReviewPosted(): void {
    this.reviewsVersion.update((value) => value + 1);
    this.loadProduct();
  }

  private loadProduct(): void {
    const slug = this.slug();
    if (!slug) {
      return;
    }

    this.catalog.getProduct(slug).subscribe((product) => {
      this.product.set(product);
      this.selectedVariant.set(
        product.variants.find((v) => v.in_stock) ?? product.variants[0] ?? null,
      );
      this.activeImageIndex.set(0);
      this.quantity.set(1);
    });
  }
}
