/**
 * Strips locale-specific thousands separators from spec numbers and inserts
 * the required space between numeric values and unit symbols.
 *
 * Tag-aware via mapHtmlText (html-text-walk.ts): processes only text nodes and alt attribute
 * values; src, href, and all other attributes are preserved verbatim. The traversal was
 * extracted from this file so unit-cyrillize.ts could share it rather than hand-roll a second
 * splitter — behaviour here is unchanged.
 * Safe to apply to any HTML string; must be idempotent.
 */
import { mapHtmlText } from './html-text-walk';
import { invariantCore } from '../prompt-core/product-name-core';

/**
 * A model designator is not a number, but it can look exactly like one.
 *
 * `stripThousandsSeparators` matches `\b\d{1,3}(?:[ ]\d{3})+`, and "XGRIDS L2 Pro 32 300" fits
 * it perfectly — 1-3 digits, a space, a 3-digit group — so it collapses to "32300". That is how
 * a "32/300" the slug step had already mangled into "32 300" became "32300" in every locale's
 * meta_description and in all 13 mentions of the en-GB body. Nothing about the failure is
 * specific to a slash: any designator containing a NN NNN sequence is one regex away from it.
 *
 * So the invariant core of the product name is masked out before the numeric transforms and
 * restored after. `invariantCore` rather than the whole name ON PURPOSE — the full name is
 * localized per artifact ("3D сканер XGRIDS L2 Pro 32/300 Стандартний комплект"), so masking it
 * literally would match nothing on four locales out of five and silently do nothing.
 *
 * [ADAPTED from buildProductNamePattern in output-validator.ts:369, which masks the product
 * name out of the unit-spacing check for the same reason. That file is FROZEN and does not
 * export it.]
 */
/**
 * Letters only — no spaces, no digits. It replaces the matched span exactly, so surrounding
 * whitespace is untouched, and none of the numeric regexes below can match inside it. The
 * frozen original uses NUL sentinels, which is fine for its plain string.replace but not here:
 * this text goes through a DOM walk, and NUL does not survive DOM serialization intact.
 */
const MASK = 'PRODUCTCOREMASK';

function coreMaskPattern(productName: string): RegExp | null {
  const core = invariantCore(productName).trim();
  if (!core) return null;
  const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Same digit/letter flexibility as the original: a core typed "20W" appears as "20 W" once
  // unit spacing has run, and must still be recognized on a second pass (this is idempotent).
  return new RegExp(escaped.replace(/(\d)(?=[A-Za-zµμ])/g, '$1\\s?'), 'g');
}

/**
 * @param html        the HTML (or, via normalizeSeoNumbers, a plain meta string)
 * @param productName optional raw product name; its invariant core is protected from every
 *                    numeric transform below. Optional so existing call sites keep working —
 *                    omitting it restores the pre-fix behaviour rather than throwing.
 */
export function fixNumberFormatting(html: string, productName = ''): string {
  const pattern = productName.trim() ? coreMaskPattern(productName) : null;
  if (!pattern) return mapHtmlText(html, processTextNode);

  const originals: string[] = [];
  const masked = html.replace(pattern, match => {
    originals.push(match);
    return MASK;
  });
  let i = 0;
  return mapHtmlText(masked, processTextNode).replace(new RegExp(MASK, 'g'), () => originals[i++]);
}

/** Applied to text nodes and alt values — full formatting. */
function processTextNode(text: string): string {
  return ensureUnitSpaces(stripThousandsSeparators(text));
}

export function stripThousandsSeparators(text: string): string {
  // Comma groups: 1,000 / 1,234,567 -> 1000 / 1234567. Guard: does NOT start with "0," + a
  // 3-digit group — nobody writes a thousands-separated integer as "0,330" (a leading zero
  // group is meaningless there); in a comma-decimal locale (uk/ru/pl/de/es-ES) that shape is
  // unambiguously a decimal fraction (e.g. "0,330 кг/год") and must be left untouched rather
  // than corrupted into "0330". Mirrors the period-group guard below.
  text = text.replace(/\b(?!0,\d{3})\d{1,3}(?:,\d{3})+/g, m => m.replace(/,/g, ''));

  // Space groups (regular, NBSP U+00A0, thin-space U+202F): 1 000 / 1 234 567
  text = text.replace(/\b\d{1,3}(?:[ \u00A0\u202F]\d{3})+/g, m => m.replace(/[ \u00A0\u202F]/g, ''));

  // Period groups: 1.000 / 1.234.567 -> 1000 / 1234567. Guard 1: not followed by more
  // digit(s) that would indicate a decimal tail. Guard 2: does NOT start with "0." + a
  // 3-digit group — nobody writes a thousands-separated integer as "0.004" (a leading zero
  // group is meaningless there), so that shape is unambiguously a decimal fraction (e.g. an
  // inch tolerance) and must be left untouched rather than corrupted into "0004".
  text = text.replace(/\b(?!0\.\d{3})\d{1,3}(?:\.\d{3})+(?!\.\d)/g, m => m.replace(/\./g, ''));

  return text;
}

/**
 * Cyrillic units continue Cyrillic words ("3шт." must stay glued to nothing — "шт." is not
 * in the unit list; "5ммX" inside a token must not split). \b is unreliable across the
 * Latin/Cyrillic script boundary in JS regex, so an explicit negative lookahead over
 * Cyrillic letters + word chars is used instead.
 */
const CYR_BOUNDARY = '(?![\u0430-\u044F\u0456\u0457\u0454\u0491\u0410-\u042F\u0406\u0407\u0404\u0490\\w])';

// Multi-character Cyrillic units, longest match wins (uk + ru variants).
const CYR_MULTI_UNITS_RE = new RegExp(
  '(\\d)(кГц|МГц|ГГц|мВт|кВт|мА·год|мА·ч|мА|мВ|кВ|мм/с|м/с|мкм|мм|см|км|нм|мг|кг|мл|Мбіт|Мбит|Гбіт|Гбит|ГБ|МБ|ТБ|об/хв|об/мин|Гц|Вт|м²|м³|см²|см³)' + CYR_BOUNDARY,
  'g',
);

// Single-letter Cyrillic SI units: г, л, м, т (mass tonne), В, А.
const CYR_SINGLE_UNITS_RE = new RegExp('(\\d)([глмт\u0412\u0410])' + CYR_BOUNDARY, 'g');

/**
 * Non-breaking space (U+00A0) between a digit and its unit — a unit must never wrap onto its
 * own line. Renders identically to &nbsp; in HTML; counts as 1 character in charLength() same
 * as a regular space.
 */
const NBSP = ' ';

function ensureUnitSpaces(text: string): string {
  // Cyrillic units (uk/ru output) — multi-character first, longest match wins.
  text = text.replace(CYR_MULTI_UNITS_RE, `$1${NBSP}$2`);
  // Cyrillic single-letter SI units.
  text = text.replace(CYR_SINGLE_UNITS_RE, `$1${NBSP}$2`);
  // Multi-character Latin units first (longest match wins).
  text = text.replace(/(\d)(kHz|MHz|GHz|mW|kW|mA|mV|mm|cm|km|µm|μm|nm|mg|ml|MPa|GPa|kPa|Pa)\b/g, `$1${NBSP}$2`);
  // Single- or double-char units.
  text = text.replace(/(\d)(Hz|kg|px|pt|dpi|bar|psi)\b/g, `$1${NBSP}$2`);
  // Degree units (no word boundary — degree sign is not a word char).
  text = text.replace(/(\d)(°[CF])/g, `$1${NBSP}$2`);
  // Remaining single-letter SI units: g, l/L (litre), m (metre), W, V, A.
  // Two exclusions, both preventing corruption of real content rather than just a validator warning:
  //  - (?<![A-Za-z_-]) — a letter/hyphen/underscore directly before the digit means this is part of
  //    an alphanumeric model/SKU/revision code (e.g. "K1A", "K-1A", "X_1A"), not a measurement.
  //  - (?<!(?:TPU|TPE|Shore)[\s-]\d{0,3}) — Shore-hardness durometer notation ("TPU 95A", "TPU-100A",
  //    "Shore 60A") never takes a space; it only looks like a bare Ampere unit.
  text = text.replace(/(?<![A-Za-z_-])(?<!(?:TPU|TPE|Shore)[\s-]\d{0,3})(\d)([glL]|[mWVA])\b/g, `$1${NBSP}$2`);
  // K (Kelvin): only when preceded by ≥3 digit-sequence (e.g. 6500K → 6500 K), NOT 4K/8K
  text = text.replace(/(\d{3,})(K)\b/g, `$1${NBSP}$2`);
  // Percentage.
  text = text.replace(/(\d)(%)/g, `$1${NBSP}$2`);
  return text;
}