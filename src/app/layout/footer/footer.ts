import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Copy } from '../../core/i18n/en';
import { TranslationService } from '../../core/i18n/translation.service';
import { SOCIAL_LINKS } from '../../shared/social-links';

/**
 * One footer link. `link` is optional on purpose: the design deck lists pages
 * that don't exist yet (subscriptions, wholesale, FAQ…), and routing those to
 * the wildcard would hand visitors a 404. Until a page lands, its entry renders
 * as plain text — add the route here and it becomes a link.
 */
interface FooterLink {
  key: keyof Copy;
  link?: string;
}

/** One column of the link grid. The brand blurb occupies the first grid cell. */
interface FooterColumn {
  titleKey: keyof Copy;
  links: FooterLink[];
}

/**
 * Site footer: brand blurb, three link columns, the social row and the legal
 * strip. Copy comes from `TranslationService`, so a language switch re-renders
 * it and the RTL flip is handled by the logical properties in the stylesheet.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;

  readonly columns: readonly FooterColumn[] = [
    {
      titleKey: 'footerShop',
      links: [
        { key: 'footerAllCoffee', link: '/shop' },
        { key: 'footerSubscriptions' },
        { key: 'footerBrewingGear' },
        { key: 'footerGiftCards' },
      ],
    },
    {
      titleKey: 'footerRoastery',
      links: [
        { key: 'footerOurStory' },
        { key: 'footerOrigins' },
        { key: 'footerCupping' },
        { key: 'footerWholesale' },
      ],
    },
    {
      titleKey: 'footerHelp',
      links: [
        { key: 'footerShippingReturns' },
        { key: 'footerFaq' },
        { key: 'footerContact' },
        { key: 'footerLoyalty' },
      ],
    },
  ];

  readonly socials = SOCIAL_LINKS;
}
