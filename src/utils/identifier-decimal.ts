/**
 * identifier-decimal.ts
 *
 * The inverse of decimal-separator.ts: puts a DOT back where the model wrote a comma inside an
 * identifier that is not a number at all.
 *
 * WHY THIS EXISTS. decimal-separator.ts only ever converts measurements, so it cannot produce
 * these — but the MODEL can, and did. description_uk-UA.html from the EXPERT3D XGRIDS L2 Pro run
 * (2026-07-29) shipped:
 *
 *     <tr><td>Діафрагма</td><td>F/2,0</td></tr>          — a lens aperture ratio
 *     <li>2,4G WiFi 2412–2472 МГц</li>                   — a Wi-Fi band designator
 *
 * Both are wrong, and both shipped silently: the pipeline has no check for "a comma where a dot
 * belongs". `checkNumberFormatting` in the frozen output-validator only looks for the opposite.
 * On an earlier run the same field came out as "F/2.0", so this is run-to-run model variance,
 * not a stable behaviour that could be fixed in the prompt alone.
 *
 * DELIBERATELY NOT a general "comma that should be a dot" detector. Deciding that in the general
 * case needs exactly the semantic judgement that made the forward direction dangerous, and
 * guessing wrong here would re-create the bug this branch just fixed. So: four enumerated shapes,
 * each anchored to something structural, and nothing else.
 *
 * Runs AFTER fixDecimalSeparator in every chain. The two cannot fight: the forward pass only
 * touches a decimal followed by a unit, and none of the shapes below has one.
 *
 * Pure function, no LLM.
 */

import { mapHtmlText } from './html-text-walk';

/** Same set decimal-separator.ts localizes for — a dot-decimal locale never had this problem. */
const COMMA_DECIMAL_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']);

/**
 * Each shape is anchored to a structural marker, never to a word list:
 *
 *  APERTURE  "F/2,0"    — the f-number slash. Nothing else writes [Ff]/ before a number.
 *  BAND      "2,4G"     — digits glued to a lone capital G with no letter after it, so "2,4 ГГц"
 *                         (a real frequency, spaced, Cyrillic) and "2,4 GHz" cannot match.
 *  STANDARD  "802,11"   — the 802.x family, matched literally; the only bare number in this
 *                         codebase's domain that is a standard rather than a quantity.
 *  VERSION   "V1,0"     — a letter immediately before the leading digit, which is what makes it a
 *                         version token rather than a measurement. Requires the letter to be
 *                         preceded by a non-letter so "мм1,5" style noise cannot match.
 */
const IDENTIFIER_SHAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/(?<=[Ff]\/)(\d+),(\d+)/g, '$1.$2'],
  [/(?<![\p{L}\d])(\d+),(\d+)(?=G(?![\p{L}\d]))/gu, '$1.$2'],
  [/(?<![\d.,])802,(?=11(?![\d]))/g, '802.'],
  [/(?<![\p{L}\d])(\p{L})(\d+),(\d+)(?![\p{L}\d])/gu, '$1$2.$3'],
];

/** The one text transform. Exported for the spec; callers use restoreIdentifierDots. */
export function restoreDotsInText(text: string): string {
  return IDENTIFIER_SHAPES.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

/**
 * Put dots back into identifier-shaped "decimals" in the visible text of `html`.
 *
 * Routed through mapHtmlText, so `src`, `href`, `class` and `style` are structurally out of
 * reach. Idempotent: a dotted identifier no longer matches any shape.
 *
 * @param html   any HTML string
 * @param locale BCP47; only comma-decimal locales can have the problem, so others pass through
 */
export function restoreIdentifierDots(html: string, locale: string): string {
  if (!html || !locale || !COMMA_DECIMAL_LOCALES.has(locale)) return html;
  return mapHtmlText(html, restoreDotsInText);
}
