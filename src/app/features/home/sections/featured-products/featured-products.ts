import { Component, computed, inject } from '@angular/core';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { RiyalSymbol } from '../../../../shared/components/riyal-symbol/riyal-symbol';

/** Roast level drives which of the three roast dots light up on a card. */
type RoastLevel = 0 | 1 | 2;

interface FeaturedProductCopy {
  readonly name: string;
  readonly country: string;
  readonly notes: readonly string[];
}

/**
 * Placeholder catalog entry for the homepage grid.
 *
 * TODO: this is stub data, not the real catalog — `Product` in
 * `core/models/product.model.ts` has no name/price/rating fields yet. Swap
 * this whole component for a `CatalogService`-backed one once the backend
 * `ProductSerializer` lands.
 */
interface FeaturedProduct {
  readonly id: string;
  readonly en: FeaturedProductCopy;
  readonly ar: FeaturedProductCopy;
  readonly badgeKey:
    | 'badgeBestSeller'
    | 'badgeRecommended'
    | 'badgeLimited'
    | 'badgeClassic'
    | 'badgeLargeBag'
    | 'badgeNew';
  readonly badgeBg: string;
  readonly badgeFg: string;
  readonly roastLevel: RoastLevel;
  readonly price: number;
  readonly weightEn: string;
  readonly weightAr: string;
  readonly points: number;
  readonly rating: string;
  readonly reviews: number;
}

const FEATURED_PRODUCTS: readonly FeaturedProduct[] = [
  {
    id: 'uganda',
    en: {
      name: 'Uganda — Mananasi',
      country: 'Uganda',
      notes: ['Pineapple', 'Mango', 'Cane sugar'],
    },
    ar: { name: 'أوغندا — ماناناسي', country: 'أوغندا', notes: ['أناناس', 'مانجو', 'قصب السكر'] },
    badgeKey: 'badgeBestSeller',
    badgeBg: '#7a2a2a',
    badgeFg: '#f6e6c8',
    roastLevel: 1,
    price: 78,
    weightEn: '250g',
    weightAr: '٢٥٠ جم',
    points: 120,
    rating: '4.8',
    reviews: 212,
  },
  {
    id: 'monte',
    en: { name: 'Colombia — Monte', country: 'Colombia', notes: ['Caramel', 'Hazelnut', 'Apple'] },
    ar: { name: 'كولومبيا — مونتي', country: 'كولومبيا', notes: ['كراميل', 'بندق', 'تفاح'] },
    badgeKey: 'badgeRecommended',
    badgeBg: '#d3a45f',
    badgeFg: '#3a1414',
    roastLevel: 0,
    price: 92,
    weightEn: '250g',
    weightAr: '٢٥٠ جم',
    points: 140,
    rating: '4.9',
    reviews: 168,
  },
  {
    id: 'melo',
    en: {
      name: 'Yellow Melo — Colombia',
      country: 'Colombia',
      notes: ['White peach', 'Florals', 'Black tea'],
    },
    ar: {
      name: 'ميلو يلو — كولومبيا',
      country: 'كولومبيا',
      notes: ['خوخ أبيض', 'زهور', 'شاي أسود'],
    },
    badgeKey: 'badgeLimited',
    badgeBg: '#3a2418',
    badgeFg: '#e8cd9b',
    roastLevel: 0,
    price: 105,
    weightEn: '250g',
    weightAr: '٢٥٠ جم',
    points: 160,
    rating: '4.7',
    reviews: 94,
  },
  {
    id: 'ethiopia',
    en: {
      name: 'Ethiopia — Yirgacheffe',
      country: 'Ethiopia',
      notes: ['Jasmine', 'Lemon', 'Honey'],
    },
    ar: { name: 'إثيوبيا — يرغاتشيف', country: 'إثيوبيا', notes: ['ياسمين', 'ليمون', 'عسل'] },
    badgeKey: 'badgeClassic',
    badgeBg: '#d3a45f',
    badgeFg: '#3a1414',
    roastLevel: 0,
    price: 96,
    weightEn: '250g',
    weightAr: '٢٥٠ جم',
    points: 145,
    rating: '4.9',
    reviews: 301,
  },
];

/** Rendering shape for the template: the picked-locale copy flattened onto the product. */
interface FeaturedProductView extends FeaturedProduct {
  readonly copy: FeaturedProductCopy;
  readonly weight: string;
}

/** The "most ordered this week" product grid. Backed by stub data — see the TODO above. */
@Component({
  selector: 'app-home-featured-products',
  imports: [RiyalSymbol],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.scss',
})
export class HomeFeaturedProducts {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  /** The three roast dots a card renders. */
  readonly roastDots: readonly number[] = [0, 1, 2];

  readonly products = computed<readonly FeaturedProductView[]>(() => {
    const isArabic = this.translation.locale() === 'ar';
    return FEATURED_PRODUCTS.map((product) => ({
      ...product,
      copy: isArabic ? product.ar : product.en,
      weight: isArabic ? product.weightAr : product.weightEn,
    }));
  });

  roastDotFilled(level: RoastLevel, dotIndex: number): boolean {
    return dotIndex <= level;
  }

  roastLabelKey(level: RoastLevel): 'roastLight' | 'roastMedium' | 'roastDark' {
    return level === 0 ? 'roastLight' : level === 1 ? 'roastMedium' : 'roastDark';
  }
}
