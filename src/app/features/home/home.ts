import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Product } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { GenericSection } from '../../shared/components/generic-section/generic-section';
import { RevealOnScroll } from '../../shared/directives/reveal-on-scroll.directive';
import { HomeHero } from './sections/hero/hero';
import { HomeLoyalty } from './sections/loyalty/loyalty';
import { HomeMarquee } from './sections/marquee/marquee';
import { HomeOrigins } from './sections/origins/origins';
import { HomePerks } from './sections/perks/perks';
import { HomeReviews } from './sections/reviews/reviews';
import { HomeTopSellers } from './sections/top-sellers/top-sellers';

/** Storefront landing page: a stack of product rows, all empty until fed. */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    GenericSection,
    RevealOnScroll,
    HomeHero,
    HomePerks,
    HomeTopSellers,
    HomeMarquee,
    HomeOrigins,
    HomeLoyalty,
    HomeReviews,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly catalog = inject(CatalogService);

  protected readonly featured = signal<readonly Product[]>([]);
  protected readonly newArrivals = signal<readonly Product[]>([]);
}
