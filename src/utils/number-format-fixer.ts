/**
 * Strips locale-specific thousands separators from spec numbers and inserts
 * the required space between numeric values and unit symbols.
 *
 * Tag-aware: processes only text nodes and alt attribute values.
 * src, href, and all other attributes are preserved verbatim.
 * Safe to apply to any HTML string; must be idempotent.
 * Note: does not handle `>` inside quoted attribute values (e.g. title="a > b").
 * Safe for LLM-generated product HTML, which does not emit such attributes.
 */
export function fixNumberFormatting(html: string): string {
  return html
    .split(/(<[^>]*>)/g)
    .map((segment, i) => (i % 2 === 0 ? processTextNode(segment) : processTag(segment)))
    .join('');
}

/** Applied to text nodes — full formatting. */
function processTextNode(text: string): string {
  return ensureUnitSpaces(stripThousandsSeparators(text));
}

/** Applied to raw tag strings — only processes alt="…" values; src/href/etc. untouched. */
function processTag(tag: string): string {
  return tag.replace(/\balt="([^"]*)"/g, (_, val) => `alt="${processTextNode(val)}"`);
}

function stripThousandsSeparators(text: string): string {
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
  text = text.replace(/(\d)([glL]|[mWVA])\b/g, `$1${NBSP}$2`);
  // K (Kelvin): only when preceded by ≥3 digit-sequence (e.g. 6500K → 6500 K), NOT 4K/8K
  text = text.replace(/(\d{3,})(K)\b/g, `$1${NBSP}$2`);
  // Percentage.
  text = text.replace(/(\d)(%)/g, `$1${NBSP}$2`);
  return text;
}