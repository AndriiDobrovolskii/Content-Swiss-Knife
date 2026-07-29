/**
 * decimal-separator.ts
 *
 * Deterministic decimal-point → decimal-comma pass for comma-decimal locales.
 *
 * Why this exists: `decimal-separator` was a validator rule with no fixer anywhere in the
 * codebase. The gate could report "46.8 should be 46,8" but nothing could act on it — on the
 * FAQ path nothing could even *reach* it, since that gate had no block-repair rung. Observed on
 * EXPERT3D XGRIDS L2 Pro (2026-07-29), where `decimal-separator` sat under "Warnings (not
 * repaired)" for FAQ (uk-UA).
 *
 * Relationship to the validator (`checkNumberFormatting` in output-validator.ts): that file is
 * FROZEN, so its pattern cannot be imported. This module deliberately re-states it rather than
 * approximating it, and `decimal-separator.spec.ts` binds the two by round-trip — fix, then
 * assert the validator reports nothing.
 *
 * DESIGN RULE: this fixer is a strict SUBSET of what the validator flags. Converting a value the
 * validator would not have flagged means silently editing a spec; leaving one unconverted only
 * means a warning survives. When in doubt, do nothing. That asymmetry is why the standards
 * lookbehinds below are wider here than in the validator.
 *
 * Pure function, no LLM.
 */

import { mapHtmlText } from './html-text-walk';

/**
 * Locales whose decimal separator is a comma. Mirrors COMMA_DECIMAL_LOCALES in the frozen
 * output-validator.ts — case-sensitive BCP47, exactly as that file compares them. Kept in sync
 * by decimal-separator.spec.ts, which asserts fixer and validator agree on every locale here.
 */
const COMMA_DECIMAL_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']);

/**
 * A dot-decimal that genuinely needs localizing.
 *
 * Mirrors the validator's pattern (see output-validator.ts checkNumberFormatting for the full
 * annotation of each guard) with two deliberate additions, marked ★ — a false positive costs a
 * warning there but a corrupted spec value here:
 *
 * (?<![\w.])                  — not part of a longer number/word: blocks "1.2.3", "v1.5"
 * (?<!IEEE\s|USB\s|…)         — space-separated standard/version numbers
 * ★ (?<!Wi-Fi\s)(?<!WiFi\s)   — "Wi-Fi 802.11" — the validator relies on the suffix guard alone
 * (?<![Ff]\/)                 — lens apertures: "F/2.0" is a ratio designation, not a measurement
 * \d+\.(?!\d{3}(?!\d))        — the dot, excluding a 3-digit thousands group
 * (?=(\d+))\1                 — emulated atomic group; stops backtracking to a shorter digit run
 * (?!(?:Q|D|X|AB|ac|ax|be|[abgnx])(?![a-zA-Z]))
 *                             — 802.11-family suffixes ("802.11a/b/g/n/ac" from real spec sheets)
 * (?!\.\d)                    — not a multi-part version
 *
 * Note there is deliberately NO frequency guard: "2.4 GHz" is a real measurement and must
 * localize to "2,4 ГГц". Only the glued "2.4G" form is skipped, via the suffix guard above.
 */
const DOT_DECIMAL_RE =
  /(?<![\w.])(?<!IEEE\s)(?<!USB\s)(?<!Bluetooth\s)(?<!HDMI\s)(?<!Wi-Fi\s)(?<!WiFi\s)(?<![Ff]\/)\d+\.(?!\d{3}(?!\d))(?=(\d+))\1(?!(?:Q|D|X|AB|ac|ax|be|[abgnx])(?![a-zA-Z]))(?!\.\d)/gi;

/** The one text transform. Exported for the spec; callers use fixDecimalSeparator. */
export function localizeDecimalsInText(text: string): string {
  // The matched run contains exactly one dot — the lookarounds above forbid a second — so a
  // single replace on the match is unambiguous.
  return text.replace(DOT_DECIMAL_RE, match => match.replace('.', ','));
}

/**
 * Rewrite dot-decimals to comma-decimals in the visible text of `html`.
 *
 * No-op for dot-decimal locales (en-*, es-US, es-MX …) and for empty input. Routed through
 * mapHtmlText, so `src`, `href`, `class` and `style` are structurally out of reach — the same
 * protection the validator approximates by stripping href/src before matching.
 *
 * Idempotent: a comma-decimal no longer matches the pattern.
 *
 * @param html   any HTML string
 * @param locale BCP47; an unlisted locale returns the input unchanged rather than guessing
 */
export function fixDecimalSeparator(html: string, locale: string): string {
  if (!html || !locale || !COMMA_DECIMAL_LOCALES.has(locale)) return html;
  return mapHtmlText(html, localizeDecimalsInText);
}
