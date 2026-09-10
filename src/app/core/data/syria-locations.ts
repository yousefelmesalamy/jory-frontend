import { Locale } from '../i18n/locale';

/**
 * Syria's delivery geography, in both copy decks' languages.
 *
 * This lives in `core/data` rather than in the i18n decks on purpose: the decks
 * are UI chrome typed as one flat `Copy` shape, and ~100 place names would drown
 * them. These are *content* — the same list the address form and (later) any
 * shipping-zone rule reads from.
 *
 * Shape note: a city carries no id. The backend's `Address.city` is a plain
 * `CharField`, so what gets stored is the human string the visitor picked, in
 * the language they picked it in — which is also what a courier has to read off
 * the label. `cityOptions()` therefore returns the localized name as *both* the
 * option value and its label. The consequence, accepted deliberately: switching
 * the site's language does not retranslate an address that was already saved.
 */
export interface LocalizedName {
  readonly ar: string;
  readonly en: string;
}

export interface Governorate extends LocalizedName {
  /** Capital first, then the rest of the governorate's towns. */
  readonly cities: readonly LocalizedName[];
}

/** The only country the storefront ships to today — the address form locks to it. */
export const SYRIA: LocalizedName = { ar: 'سوريا', en: 'Syria' };

/** All fourteen governorates, ordered the way Syrians usually list them. */
export const SYRIA_GOVERNORATES: readonly Governorate[] = [
  {
    ar: 'دمشق',
    en: 'Damascus',
    cities: [{ ar: 'دمشق', en: 'Damascus' }],
  },
  {
    ar: 'ريف دمشق',
    en: 'Rif Dimashq',
    cities: [
      { ar: 'دوما', en: 'Douma' },
      { ar: 'حرستا', en: 'Harasta' },
      { ar: 'داريا', en: 'Darayya' },
      { ar: 'جرمانا', en: 'Jaramana' },
      { ar: 'صحنايا', en: 'Sahnaya' },
      { ar: 'قدسيا', en: 'Qudsaya' },
      { ar: 'معضمية الشام', en: 'Muadamiyat al-Sham' },
      { ar: 'التل', en: 'Al-Tall' },
      { ar: 'قطنا', en: 'Qatana' },
      { ar: 'الزبداني', en: 'Zabadani' },
      { ar: 'يبرود', en: 'Yabroud' },
      { ar: 'النبك', en: 'An-Nabk' },
      { ar: 'القطيفة', en: 'Al-Qutayfah' },
      { ar: 'عربين', en: 'Arbin' },
      { ar: 'زملكا', en: 'Zamalka' },
      { ar: 'سقبا', en: 'Saqba' },
      { ar: 'الكسوة', en: 'Al-Kiswah' },
      { ar: 'الضمير', en: 'Dumayr' },
    ],
  },
  {
    ar: 'حلب',
    en: 'Aleppo',
    cities: [
      { ar: 'حلب', en: 'Aleppo' },
      { ar: 'منبج', en: 'Manbij' },
      { ar: 'الباب', en: 'Al-Bab' },
      { ar: 'أعزاز', en: 'Azaz' },
      { ar: 'عفرين', en: 'Afrin' },
      { ar: 'جرابلس', en: 'Jarablus' },
      { ar: 'السفيرة', en: 'As-Safira' },
      { ar: 'عين العرب', en: 'Ayn al-Arab' },
      { ar: 'دير حافر', en: 'Deir Hafer' },
      { ar: 'مسكنة', en: 'Maskanah' },
      { ar: 'تل رفعت', en: 'Tell Rifaat' },
    ],
  },
  {
    ar: 'حمص',
    en: 'Homs',
    cities: [
      { ar: 'حمص', en: 'Homs' },
      { ar: 'تدمر', en: 'Palmyra' },
      { ar: 'الرستن', en: 'Al-Rastan' },
      { ar: 'تلبيسة', en: 'Talbiseh' },
      { ar: 'القصير', en: 'Al-Qusayr' },
      { ar: 'تلكلخ', en: 'Tell Kalakh' },
      { ar: 'المخرم', en: 'Al-Makhrim' },
      { ar: 'الفرقلس', en: 'Al-Furqlus' },
      { ar: 'صدد', en: 'Sadad' },
    ],
  },
  {
    ar: 'حماة',
    en: 'Hama',
    cities: [
      { ar: 'حماة', en: 'Hama' },
      { ar: 'سلمية', en: 'Salamiyah' },
      { ar: 'مصياف', en: 'Masyaf' },
      { ar: 'محردة', en: 'Mhardeh' },
      { ar: 'السقيلبية', en: 'Suqaylabiyah' },
      { ar: 'كفر زيتا', en: 'Kafr Zita' },
      { ar: 'حلفايا', en: 'Halfaya' },
      { ar: 'مورك', en: 'Morek' },
    ],
  },
  {
    ar: 'اللاذقية',
    en: 'Latakia',
    cities: [
      { ar: 'اللاذقية', en: 'Latakia' },
      { ar: 'جبلة', en: 'Jableh' },
      { ar: 'القرداحة', en: 'Qardaha' },
      { ar: 'الحفة', en: 'Al-Haffah' },
      { ar: 'كسب', en: 'Kessab' },
    ],
  },
  {
    ar: 'طرطوس',
    en: 'Tartus',
    cities: [
      { ar: 'طرطوس', en: 'Tartus' },
      { ar: 'بانياس', en: 'Baniyas' },
      { ar: 'صافيتا', en: 'Safita' },
      { ar: 'الدريكيش', en: 'Duraykish' },
      { ar: 'الشيخ بدر', en: 'Sheikh Badr' },
    ],
  },
  {
    ar: 'إدلب',
    en: 'Idlib',
    cities: [
      { ar: 'إدلب', en: 'Idlib' },
      { ar: 'معرة النعمان', en: 'Maarat al-Numan' },
      { ar: 'جسر الشغور', en: 'Jisr al-Shughur' },
      { ar: 'أريحا', en: 'Ariha' },
      { ar: 'حارم', en: 'Harem' },
      { ar: 'سراقب', en: 'Saraqib' },
      { ar: 'بنش', en: 'Binnish' },
      { ar: 'خان شيخون', en: 'Khan Shaykhun' },
      { ar: 'سلقين', en: 'Salqin' },
    ],
  },
  {
    ar: 'دير الزور',
    en: 'Deir ez-Zor',
    cities: [
      { ar: 'دير الزور', en: 'Deir ez-Zor' },
      { ar: 'الميادين', en: 'Al-Mayadin' },
      { ar: 'البوكمال', en: 'Abu Kamal' },
      { ar: 'الحسينية', en: 'Al-Husayniyah' },
    ],
  },
  {
    ar: 'الحسكة',
    en: 'Al-Hasakah',
    cities: [
      { ar: 'الحسكة', en: 'Al-Hasakah' },
      { ar: 'القامشلي', en: 'Qamishli' },
      { ar: 'رأس العين', en: 'Ras al-Ayn' },
      { ar: 'المالكية', en: 'Al-Malikiyah' },
      { ar: 'عامودا', en: 'Amuda' },
      { ar: 'تل تمر', en: 'Tell Tamer' },
      { ar: 'الشدادي', en: 'Al-Shaddadi' },
    ],
  },
  {
    ar: 'الرقة',
    en: 'Raqqa',
    cities: [
      { ar: 'الرقة', en: 'Raqqa' },
      { ar: 'تل أبيض', en: 'Tell Abyad' },
      { ar: 'الثورة', en: 'Al-Thawrah' },
      { ar: 'السلوك', en: 'Suluk' },
    ],
  },
  {
    ar: 'درعا',
    en: 'Daraa',
    cities: [
      { ar: 'درعا', en: 'Daraa' },
      { ar: 'نوى', en: 'Nawa' },
      { ar: 'إزرع', en: 'Izra' },
      { ar: 'الصنمين', en: 'Al-Sanamayn' },
      { ar: 'جاسم', en: 'Jasim' },
      { ar: 'طفس', en: 'Tafas' },
      { ar: 'بصرى الشام', en: 'Bosra' },
      { ar: 'الحراك', en: 'Al-Harak' },
    ],
  },
  {
    ar: 'السويداء',
    en: 'As-Suwayda',
    cities: [
      { ar: 'السويداء', en: 'As-Suwayda' },
      { ar: 'شهبا', en: 'Shahba' },
      { ar: 'صلخد', en: 'Salkhad' },
      { ar: 'القريا', en: 'Al-Qurayya' },
    ],
  },
  {
    ar: 'القنيطرة',
    en: 'Quneitra',
    cities: [
      { ar: 'القنيطرة', en: 'Quneitra' },
      { ar: 'خان أرنبة', en: 'Khan Arnabah' },
      { ar: 'البعث', en: 'Al-Baath' },
    ],
  },
];

/** The country name as the form should store it for this language. */
export function countryName(locale: Locale): string {
  return SYRIA[locale];
}

/**
 * Every city, flattened governorate by governorate (capital first), as
 * `{ value, label }` pairs the shared `Dropdown` can take directly.
 */
export function cityOptions(locale: Locale): { value: string; label: string }[] {
  return SYRIA_GOVERNORATES.flatMap((governorate) =>
    governorate.cities.map((city) => ({ value: city[locale], label: city[locale] })),
  );
}
