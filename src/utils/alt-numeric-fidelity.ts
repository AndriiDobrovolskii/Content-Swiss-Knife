/**
 * alt-numeric-fidelity.ts
 *
 * Deterministic cross-check that every number+unit appearing in an `alt` attribute or a
 * `<figcaption>` is actually present in this product's source input.
 *
 * WHY THIS EXISTS: a generated artifact shipped an <img alt> reading "лазерна головка 40 Вт" for
 * a product whose specs state 20 W. NUMERIC_SOURCE_FIDELITY_RULES (constants.ts) instructs the
 * model not to do that, but a prompt is a probabilistic defence — this is the deterministic one.
 *
 * WHY ONLY alt/figcaption: numbers legitimately enter body prose from application context
 * ("cuts 3 mm acrylic") that never appears in the spec table, so a body-wide gate would fail
 * correct text and burn the repair budget. This is the same reasoning that scopes
 * validateSpecsGrounding to <section class="specs">. In image text a figure has no legitimate
 * independent source: it comes from the specs, from that image's manifest caption, or it is
 * invented.
 *
 * Pure function, no LLM. Mirrors specs-grounding.ts in shape and guard style.
 */

import type { ValidationIssue } from './output-validator';

/**
 * Unit tokens that mark a number as a technical CLAIM rather than an ordinal, a model number or a
 * count. Covers the five languages Center 3D Print publishes plus the Spanish/Portuguese stores.
 * A bare number with no unit is never checked — "Ortur Laser Master 3" and "2 of 4" are not specs.
 */
const UNIT_TOKENS = [
  // power / electrical
  'вт', 'квт', 'w', 'kw', 'мвт', 'mw', 'в', 'v', 'а', 'a', 'ма', 'ma', 'мач', 'mah', 'вт·год', 'wh',
  // length
  'мм', 'mm', 'см', 'cm', 'м', 'm', 'мкм', 'µm', 'um', 'нм', 'nm', 'дюйм', 'inch', 'in',
  // mass
  'кг', 'kg', 'г', 'g', 'мг', 'mg',
  // temperature
  '°c', '°с', '℃', 'c', '°f',
  // frequency / speed / rate
  'гц', 'hz', 'кгц', 'khz', 'мгц', 'mhz', 'ггц', 'ghz', 'об/хв', 'rpm', 'мм/с', 'mm/s', 'мм/хв',
  'mm/min', 'м/с', 'm/s', 'кадр/с', 'fps',
  // volume / capacity
  'мл', 'ml', 'л', 'l', 'гб', 'gb', 'мб', 'mb', 'тб', 'tb',
  // resolution / misc
  'dpi', 'ppi', 'px', 'пкс', 'бар', 'bar', 'па', 'pa', 'кпа', 'kpa',
];

/**
 * A number immediately followed by a unit. The unit alternation is sorted longest-first so
 * "квт" wins over "в" and "mm/s" over "mm" — otherwise "1.5 кВт" would read as "1.5 к" + junk.
 */
const UNIT_ALTERNATION = [...UNIT_TOKENS]
  .sort((a, b) => b.length - a.length)
  .map(u => u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
  .join('|');

/**
 * MINIMUM 2 DIGITS, matching specs-grounding.ts's extractNumberTokens. A single digit collides
 * far too easily ("3 mm" appears in half of all application prose), and this is a HARD gate — a
 * false positive costs a repair cycle on correct text. The reported defect class ("40 Вт" on a
 * 20 W product) is comfortably above that floor. Documented limitation, not an oversight.
 */
const NUMBER_WITH_UNIT = new RegExp(
  `(\\d[\\d\\s\\u00A0\\u202F.,]*\\d|\\d{2,})\\s*(?:${UNIT_ALTERNATION})(?![\\p{L}])`,
  'giu',
);

/**
 * Canonical numeric form: strips thousands separators (ASCII space, NBSP, narrow NBSP, and the
 * dot/comma used as a group separator in de-DE/uk-UA) and normalizes the decimal mark to a dot,
 * so "1 234,5" / "1.234,5" / "1234.5" all compare equal. Runs on both sides of the comparison,
 * so the two locales never have to agree on notation.
 */
function canonicalNumber(raw: string): string {
  let s = raw.replace(/[\s  ]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);
  // A separator is decimal only when 1-3 digits follow it; otherwise it groups thousands.
  if (decimalAt !== -1 && s.length - decimalAt - 1 <= 3 && /^\d{1,3}$/.test(s.slice(decimalAt + 1))) {
    s = s.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + s.slice(decimalAt + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }
  // Trim trailing decimal zeros so "20.0" matches "20".
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/**
 * Every number in a source text, canonicalized — units deliberately ignored (see below).
 *
 * Exported for block-repair.ts, which compares the numbers in a block before and after a local
 * rewrite. A second canonicalizer would drift from this one and eventually disagree about whether
 * "1 234,5" and "1234.5" are the same figure.
 */
export function sourceNumbers(text: string): Set<string> {
  const found = (text.match(/\d[\d\s  .,]*\d|\d/g) ?? []).map(canonicalNumber);
  return new Set(found.filter(Boolean));
}

/**
 * Validate that image text invents no figures.
 *
 * COMPARES THE NUMBER ONLY, NOT THE UNIT. "40 Вт" and "40 W" are the same claim written in two
 * languages, and the master HTML is uk-UA while the sources may be mixed-script — matching unit
 * spellings across five languages would produce false failures far more often than it would catch
 * a real defect. The accepted cost: an alt claiming "40 Вт" passes if the sources happen to state
 * "40 mm" somewhere. This verifies PROVENANCE (where did this figure come from), not semantic
 * correspondence between a parameter and its value. It closes the reported defect class; it is
 * not a proof of correctness.
 *
 * @param html     the generated HTML for one locale
 * @param sources  every sanctioned origin for a figure, joined — the caller must pass ALL of
 *                 them (source specs, raw description, product name, manifest captions), because
 *                 NUMERIC_SOURCE_FIDELITY_RULES permits all of them. A gate stricter than the
 *                 rule the model was given fails correct output.
 * @param context  reporting label, e.g. "HTML (base)"
 * @returns one 'alt-numeric-not-grounded' error per unsupported figure (empty when sources are
 *          unavailable — see the no-op guard)
 */
export function validateAltNumericFidelity(
  html: string,
  sources: string,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // No-op when we have nothing to check against. groundingSpecs can legitimately be empty (see
  // groundingDisabled in the orchestrator); failing every artifact in that state would be worse
  // than not checking.
  if (!html?.trim() || !sources?.trim()) return issues;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return issues; // DOMParser unavailable — skip, same guard style as specs-grounding.ts
  }

  const allowed = sourceNumbers(sources);
  if (allowed.size === 0) return issues;

  const targets: Array<{ where: string; text: string }> = [
    ...Array.from(doc.querySelectorAll('img[alt]')).map(img => ({
      where: `alt of ${img.getAttribute('src')?.split('/').pop() || 'image'}`,
      text: img.getAttribute('alt') ?? '',
    })),
    ...Array.from(doc.querySelectorAll('figcaption')).map(fc => ({
      where: 'figcaption',
      text: fc.textContent ?? '',
    })),
  ];

  for (const { where, text } of targets) {
    if (!text.trim()) continue;
    const seen = new Set<string>();
    for (const match of text.matchAll(NUMBER_WITH_UNIT)) {
      const canonical = canonicalNumber(match[1]);
      if (!canonical || allowed.has(canonical) || seen.has(canonical)) continue;
      seen.add(canonical);
      issues.push({
        severity: 'error',
        rule: 'alt-numeric-not-grounded',
        detail:
          `The ${where} states "${match[0].trim()}", but ${canonical} appears nowhere in the ` +
          `source specs, description, product name or image captions for this product. Do not ` +
          `invent, infer or round a figure. Remove it and describe the subject qualitatively, ` +
          `or replace it with the value the source actually states.`,
        context,
      });
    }
  }

  return issues;
}
