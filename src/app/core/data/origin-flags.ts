/**
 * Slug → ISO 3166-1 alpha-2, for the origin rows the catalog ships with.
 *
 * `Origin` carries no country code and no image — `id`, `name`, `slug` is the
 * whole serializer — so the flag has to be derived here rather than read off
 * the row. Keyed by slug, not by name: the name is localized by the API and
 * changes with the request's language, the slug never does.
 *
 * A slug that isn't a country (`multi-origin`) is absent on purpose, and so is
 * any origin an admin adds later — `originFlag` answers `null` for both, and
 * callers fall back rather than render a wrong flag.
 */
const ISO_BY_SLUG: Readonly<Record<string, string>> = {
  brazil: 'br',
  burundi: 'bi',
  colombia: 'co',
  'costa-rica': 'cr',
  ethiopia: 'et',
  guatemala: 'gt',
  honduras: 'hn',
  india: 'in',
  indonesia: 'id',
  kenya: 'ke',
  panama: 'pa',
  peru: 'pe',
  rwanda: 'rw',
  tanzania: 'tz',
  uganda: 'ug',
  yemen: 'ye',
};

/** Offset from ASCII 'A' to the regional-indicator letter of the same name. */
const REGIONAL_INDICATOR_A = 0x1f1e6;

export interface OriginFlag {
  /** Lowercase ISO 3166-1 alpha-2, e.g. `et`. */
  readonly code: string;
  /** The same flag as regional-indicator pairs, e.g. 🇪🇹. */
  readonly emoji: string;
  /** Retina-capable raster of the flag, 4:3. */
  readonly src: string;
  readonly srcset: string;
}

/**
 * The flag for an origin slug, or `null` when the slug names no single country.
 *
 * Both renderings are returned because neither is reliable alone: the emoji is
 * offline and instant but draws as bare letters on Windows, the image draws
 * everywhere but needs the network. The template stacks them — emoji beneath,
 * image over — so the image is the flag whenever it loads and the emoji covers
 * the moment before, and the case where it never does.
 */
export function originFlag(slug: string): OriginFlag | null {
  const code = ISO_BY_SLUG[slug];
  if (!code) {
    return null;
  }

  const emoji = String.fromCodePoint(
    ...[...code.toUpperCase()].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65),
  );

  return {
    code,
    emoji,
    src: `https://flagcdn.com/w160/${code}.png`,
    srcset: `https://flagcdn.com/w160/${code}.png 1x, https://flagcdn.com/w320/${code}.png 2x`,
  };
}
