/**
 * unit-cyrillize.ts
 *
 * Converts Latin unit abbreviations to Cyrillic in uk-UA / ru-UA output: "20 W" -> "20 Вт".
 *
 * WHY THIS EXISTS. UNIT_LOCALIZATION_RULES already tells the model to cyrillize every unit "in
 * ALL visible text, including … repeated Product Names", but a real artifact shipped with
 * H1/meta/slug reading "Ortur H20 20 Вт" while the body prose and every H2 read "Ortur H20 20 W".
 * Nothing caught it: the only check that would have (latin-unit-in-cyrillic-text) masks the whole
 * product name out of its input first, and is warning-severity besides. That check lives in the
 * FROZEN output-validator, so this fixes the text instead — which makes the masking moot.
 *
 * It also mitigates a structural cause: the body is generated at pipeline step 1 but the localized
 * product name only exists from step 2 (Task Slug), so Task A can never see it. Converting both
 * deterministically is what makes them converge rather than coincide.
 *
 * LANGUAGE-DRIVEN, NOT STORE-DRIVEN, exactly as UNIT_LOCALIZATION_RULES says: this runs for
 * uk-UA/ru-UA output on every storefront, and is a strict no-op for en/pl/de/es.
 *
 * Pure function, no LLM. Idempotent: its output carries Cyrillic units, which the Latin
 * alternation cannot match.
 */

import { mapHtmlText } from './html-text-walk';
import { LATIN_TO_CYRILLIC_UNITS } from './unit-tables';

const CYRILLIZE_LOCALES = new Set(['uk-ua', 'ru-ua']);

/** Same NBSP the spacing pass uses — a unit must never wrap onto its own line. */
const NBSP = ' ';

/** Longest-first so "mm/s" beats "mm", "kW" beats "W", "mAh" beats "mA". */
const UNIT_ALTERNATION = Object.keys(LATIN_TO_CYRILLIC_UNITS)
  .sort((a, b) => b.length - a.length)
  .map(u => u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
  .join('|');

/**
 * CASE-SENSITIVE throughout: "W" is watt but "w" is not, "A" is ampere but "a" is an article,
 * "K" is Kelvin (an exception, absent from the map) while "k" is nothing.
 *
 * THREE BRAND/MODEL GUARDS, mirroring number-format-fixer.ts:84, which has shipped them:
 *   (?<![A-Za-z_-][\d.,]{0,6})     a letter/hyphen/underscore before the digit RUN means an
 *                                  alphanumeric model/SKU/revision code ("K1A", "LU2-10A",
 *                                  "X_1A"), not a measurement.
 *                                  DELIBERATELY STRICTER than number-format-fixer's
 *                                  (?<![A-Za-z_-]), which inspects only the character before the
 *                                  MATCHED digit and so misses multi-digit codes — it rewrites
 *                                  "LU2-10A" to "LU2-10 A". There the worst case is a stray
 *                                  space; here it would be a silent Latin->Cyrillic corruption of
 *                                  a model code, so this pass buys the extra safety. A genuine
 *                                  bare amperage ("max output 10A") is unaffected, because no
 *                                  letter/hyphen/underscore precedes its digit run.
 *   (?<!(?:TPU|TPE|Shore)[\s-]\d{0,3})  Shore-hardness durometer notation ("TPU 95A", "Shore 60A")
 *                                  only looks like a bare Ampere unit.
 *   (?![\p{L}\p{N}²³])             the unit must END its token, so "Max" is not "m"+"ax", "mini"
 *                                  is not "m"+"ini", and "12 GF" is not "12 G".
 * Plus V(?!\s?AC), because VAC / "V AC" is on the fixed exception list and shares its leading
 * token with the genuine voltage unit.
 *
 * Never runs on src/href — mapHtmlText is tag-aware.
 */
const UNIT_RE = new RegExp(
  '(?<![A-Za-z_-][\\d.,]{0,6})(?<!(?:TPU|TPE|Shore)[\\s-]\\d{0,3})' +
  `(\\d)[ \\u00A0\\u202F]?(${UNIT_ALTERNATION})(?!\\s?AC)(?![\\p{L}\\p{N}²³])`,
  'gu',
);

/**
 * @param html   generated HTML for one locale
 * @param locale BCP47; anything other than uk-UA / ru-UA returns the input unchanged
 */
export function cyrillizeUnits(html: string, locale: string): string {
  if (!html) return html;
  if (!CYRILLIZE_LOCALES.has(locale.toLowerCase())) return html;
  const useRu = locale.toLowerCase() === 'ru-ua';

  return mapHtmlText(
    html,
    text =>
      text.replace(UNIT_RE, (whole, digit: string, unit: string) => {
        const mapping = LATIN_TO_CYRILLIC_UNITS[unit];
        if (!mapping) return whole;
        return `${digit}${NBSP}${useRu ? mapping.ru ?? mapping.uk : mapping.uk}`;
      }),
    // figcaption text and <b> lead-ins are text nodes, already covered by the walk.
    ['alt', 'title'],
  );
}
