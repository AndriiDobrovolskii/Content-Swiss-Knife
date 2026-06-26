/**
 * Strips locale-specific thousands separators from spec numbers and inserts
 * the required space between numeric values and unit symbols.
 * Safe to apply to any HTML string; must be idempotent.
 */
export function fixNumberFormatting(html: string): string {
  return ensureUnitSpaces(stripThousandsSeparators(html));
}

function stripThousandsSeparators(text: string): string {
  // Comma groups: 1,000 / 1,234,567 -> 1000 / 1234567
  text = text.replace(/\b\d{1,3}(?:,\d{3})+/g, m => m.replace(/,/g, ''));

  // Space groups (regular, NBSP U+00A0, thin-space U+202F): 1 000 / 1 234 567
  text = text.replace(/\b\d{1,3}(?:[   ]\d{3})+/g, m => m.replace(/[   ]/g, ''));

  // Period groups: 1.000 / 1.234.567 -> 1000 / 1234567
  // Guard: NOT followed by more digit(s) that would indicate a decimal tail
  text = text.replace(/\b\d{1,3}(?:\.\d{3})+(?!\.\d)/g, m => m.replace(/\./g, ''));

  return text;
}

function ensureUnitSpaces(text: string): string {
  // Multi-character units first (longest match wins).
  text = text.replace(/(\d)(kHz|MHz|GHz|mW|kW|mA|mV|mm|cm|km|µm|μm|nm|mg|ml|MPa|GPa|kPa|Pa)\b/g, '$1 $2');
  // Single- or double-char units.
  text = text.replace(/(\d)(Hz|kg|px|pt|dpi|bar|psi)\b/g, '$1 $2');
  // Degree units (no word boundary — degree sign is not a word char).
  text = text.replace(/(\d)(°[CF])/g, '$1 $2');
  // Remaining single-letter SI units: g, l/L (litre), m (metre), W, V, A.
  text = text.replace(/(\d)([glL]|[mWVA])\b/g, '$1 $2');
  // K (Kelvin): only when preceded by ≥3 digit-sequence (e.g. 6500K → 6500 K), NOT 4K/8K
  text = text.replace(/(\d{3,})(K)\b/g, '$1 $2');
  // Percentage.
  text = text.replace(/(\d)(%)/g, '$1 $2');
  return text;
}
