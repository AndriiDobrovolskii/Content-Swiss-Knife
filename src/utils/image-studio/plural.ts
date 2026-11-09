/**
 * Plural categories and count messages of the Image Studio (US-10.5 FR-2, FR-4; plan DD-12).
 *
 * Pure, integer arithmetic, no `Intl` (the result must not depend on the host's ICU data).
 * - `en`: "one" for exactly 1, "many" for every other number (0 included).
 * - `uk`: the CLDR cardinal rule: "one" when n mod 10 = 1 and n mod 100 != 11; "few" when n mod 10 is 2..4 and
 *   n mod 100 is not 12..14; "many" otherwise.
 */
import { studioText, type StudioLanguage, type StudioTextParams } from './studio-texts';

export type PluralCategory = 'one' | 'few' | 'many';

export function pluralCategory(lang: StudioLanguage, n: number): PluralCategory {
  if (lang === 'en') return n === 1 ? 'one' : 'many';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
  return 'many';
}

/**
 * Resolves `${id}.${category}` through `studioText` with `{N}` = n. Extra params are merged. An unknown family id
 * throws, exactly like `studioText`.
 */
export function studioCount(id: string, lang: StudioLanguage, n: number, params: StudioTextParams = {}): string {
  return studioText(`${id}.${pluralCategory(lang, n)}`, lang, { ...params, N: n });
}
