/**
 * decimal-separator.ts
 *
 * Deterministic decimal-point → decimal-comma pass for comma-decimal locales.
 *
 * Why this exists: `decimal-separator` was a validator rule with no fixer anywhere in the
 * codebase. The gate could report "46.8 should be 46,8" but nothing could act on it — on the
 * FAQ path nothing could even *reach* it, since that gate had no block-repair rung.
 *
 * ── WHY THIS IS AN ALLOW-LIST ──────────────────────────────────────────────────────────────
 *
 * The first version of this file was a blacklist: convert every dot-decimal EXCEPT those a chain
 * of lookbehinds excused — (?<!USB\s), (?<!IEEE\s), (?<![Ff]\/) and so on. That shipped a
 * corruption within one run. The FAQ said:
 *
 *     …базу для збору контрольних точок (GCP), USB-кабель 3,1 та інструкцію користувача…
 *
 * A USB interface version rewritten as a decimal. The same run's description got it RIGHT twice
 * ("Кабель USB 3.1", "USB 3.1 Gen2") — not because the guard worked, but because "USB" happened
 * to land directly before the number there. In the FAQ the model wrote the hyphenated compound
 * "USB-кабель", putting Cyrillic before the digits, and no positional lookbehind could ever fire.
 *
 * A guard that depends on word order is unreliable by construction, not merely incomplete: the
 * model rewrites that order freely, and the same input produced both spellings in one run. The
 * same defect was latent for "версія 1.0", "PCIe 4.0", "SATA 3.0", "Type-C 3.2" and a bare
 * "802.11", and the list of standards can never be finished.
 *
 * So the rule is inverted. A decimal separator is a property of a MEASURED QUANTITY, and a
 * measured quantity carries a unit. Convert only when a unit follows; leave everything else
 * alone. Every false positive above disappears for one honest reason — no unit follows it —
 * rather than because someone remembered to enumerate it.
 *
 * DESIGN RULE (unchanged, now actually enforced): this fixer is a strict SUBSET of what the
 * validator flags. A missed value costs a warning; a wrongly-converted one silently edits a spec.
 * A bare unit-less decimal therefore keeps its dot by design — see the spec, which asserts it.
 *
 * Relationship to the validator (`checkNumberFormatting` in output-validator.ts): that file is
 * FROZEN and keeps its own positional lookbehinds. It only warns, so its false positives cost a
 * report line rather than a value. decimal-separator.spec.ts binds the two by round-trip in the
 * direction that matters: everything this fixer converts satisfies the validator afterwards.
 *
 * Pure function, no LLM.
 */

import { mapHtmlText } from './html-text-walk';
import { LATIN_TO_CYRILLIC_UNITS, UNIT_SCRIPT_EXCEPTIONS } from './unit-tables';

/**
 * Locales whose decimal separator is a comma. Mirrors COMMA_DECIMAL_LOCALES in the frozen
 * output-validator.ts — case-sensitive BCP47, exactly as that file compares them.
 */
const COMMA_DECIMAL_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']);

/**
 * Every token that counts as a unit, in BOTH scripts.
 *
 * Sourced from unit-tables.ts — the shared vocabulary that exists precisely so consumers stop
 * hand-rolling partial copies of "what counts as a unit". Both scripts are required because this
 * pass runs BEFORE cyrillizeUnits, so a unit may still be Latin here; and for pl-PL / de-DE /
 * es-ES / pt-PT it stays Latin permanently.
 *
 * Longest-first, the same convention unit-cyrillize.ts:33-36 follows, so "mm/s" wins over "mm"
 * and "kW" over "W" — otherwise a short alternative matches first and the tail is left dangling.
 */
const UNIT_ALTERNATION = Array.from(new Set([
  ...Object.keys(LATIN_TO_CYRILLIC_UNITS),
  ...Object.values(LATIN_TO_CYRILLIC_UNITS).flatMap(m => [m.uk, m.ru ?? m.uk]),
  ...UNIT_SCRIPT_EXCEPTIONS,
]))
  .sort((a, b) => b.length - a.length)
  .map(u => u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
  .join('|');

/** Regular space, NBSP and narrow NBSP — fixNumberFormatting has already inserted NBSP by now. */
const SP = '[ \\u00A0\\u202F]';

/**
 * Connectors that keep a number inside the same measured phrase as a later unit.
 *
 * REQUIRED, not decorative. The FAQ carries "радіусу сканування LiDAR від 0,5 до 120 м", where
 * the unit belongs to the FAR end of the range; without this the leading 0.5 would look
 * unit-less and a currently-correct conversion would regress. Same for the dimension chains the
 * spec sheets are full of: "60 см × 60 см × 15 см".
 */
const CONNECTOR = `(?:${SP}*(?:[–—~…×xX-]|до|to|bis|a)${SP}*\\d+(?:[.,]\\d+)?)*`;

/**
 * A dot-decimal that is part of a measured quantity.
 *
 * (?<![\w.])          — not inside a longer number/word: blocks "1.2.3", "v1.5"
 * \d+\.(?!\d{3}(?!\d))— the dot, excluding a 3-digit thousands group
 * (?=(\d+))\1         — emulated atomic group; stops backtracking to a shorter digit run
 * (?!\.\d)            — not a multi-part version
 * CONNECTOR           — optional range / dimension tail (see above)
 * SP* UNIT            — the unit that makes this a measurement at all
 *
 * The unit is deliberately NOT anchored to a token boundary: "46.8 Вт·год" has to match on the
 * "Вт" prefix, because Wh / Вт·год is absent from unit-tables (only mAh and kg/h are composite).
 * Matching a prefix is safe here — this lookahead only decides WHETHER to convert; it never
 * consumes or rewrites the unit.
 *
 * The old standards lookbehinds (IEEE / USB / Bluetooth / HDMI / Wi-Fi / [Ff]/) are gone, not
 * merely disabled: under an allow-list they are unreachable, and keeping two overlapping
 * mechanisms would leave the next reader maintaining the wrong one. "F/2.0" is now excluded
 * because no unit follows it, which is the real reason.
 */
const MEASURED_DECIMAL_RE = new RegExp(
  `(?<![\\w.])\\d+\\.(?!\\d{3}(?!\\d))(?=(\\d+))\\1(?!\\.\\d)(?=${CONNECTOR}${SP}*(?:${UNIT_ALTERNATION}))`,
  'g',
);

/** The one text transform. Exported for the spec; callers use fixDecimalSeparator. */
export function localizeDecimalsInText(text: string): string {
  // The lookahead is zero-width, so the match is exactly "<int>.<frac>" and contains one dot.
  return text.replace(MEASURED_DECIMAL_RE, match => match.replace('.', ','));
}

/**
 * Rewrite measurement dot-decimals to comma-decimals in the visible text of `html`.
 *
 * No-op for dot-decimal locales (en-*, es-US, es-MX …) and for empty input. Routed through
 * mapHtmlText, so `src`, `href`, `class` and `style` are structurally out of reach.
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
