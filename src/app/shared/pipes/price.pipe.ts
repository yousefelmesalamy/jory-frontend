import { Pipe, PipeTransform } from '@angular/core';

/**
 * Drops the decimals from a money amount when they carry nothing: the API
 * always sends two places ("340.00"), but a whole-riyal price reads better as
 * "340". Amounts with real cents keep both places ("12.50" stays "12.50") so
 * the fractional part never looks truncated.
 *
 * Anything that isn't a plain number — null, an empty string, a preformatted
 * range — is handed back untouched rather than coerced.
 */
@Pipe({
  name: 'price',
})
export class PricePipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const text = String(value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(text)) {
      return text;
    }

    return Number(text) % 1 === 0 ? String(Number(text)) : text;
  }
}
