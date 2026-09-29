/**
 * heading-style.ts
 *
 * Center 3D Print "Style B" requires section <h2>s to state a function or answer a query
 * («Як працює …», «Яке ПЗ підтримує …»), never to be a bare nominal topic («ПЗ та автоматизація»).
 * OVERRIDE #7 in the ToV overlay is the fix; this is the measurement.
 *
 * WARNING SEVERITY, ON PURPOSE. "Functional" is not decidable without morphology, so the verb
 * test below is a suffix heuristic. As a hard gate a false positive would fail correct text and
 * spend a repair cycle; as a warning it costs an editor one glance. Promote to 'error' only after
 * the false-positive rate has been measured on real generations.
 *
 * A SIBLING of tov-second-person.ts, sharing the same house idioms — DOMParser guard, store gate,
 * locale gate.
 *
 * Pure function, no LLM.
 */

import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc, Subsection } from '../domain/description-doc';
import {
  FUNCTIONAL_H2_OPENERS,
  MANDATED_NOMINAL_H2,
  isCenter3dPrintStore,
} from '../prompt-core/constants';
import { productShort } from '../prompt-core/product-name-core';
import { extractBlocks } from './block-repair';
import { LATIN_TO_CYRILLIC_UNITS } from './unit-tables';

/**
 * [ADAPTED from buildProductNamePattern in output-validator.ts:369]
 *
 * Re-implemented rather than imported because that file is FROZEN (CLAUDE.md) and does not
 * export the helper. Same idiom test/render-reconciliation.spec.ts uses for COUNTED_TAGS: copy
 * with a pointer, keep them in step by hand. The digit/letter flexibility is inherited for the
 * same reason — a name typed "20W" appears as "20 W" after unit-spacing normalization.
 */
function escapeNamePattern(text: string): string {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(/(\d)(?=[A-Za-zµμ])/g, '$1\\s?');
}

function productNamePattern(name: string): RegExp {
  return new RegExp(escapeNamePattern(name.trim()), 'i');
}

/** Same scope as tov-second-person.ts: the heading lexicon exists only for these two. */
const CYRILLIC_LOCALES = ['uk-ua', 'ru-ua'];

/**
 * [US-3.1 T7, FR-7, plan D5(e)] — locale-aware sibling of productNamePattern, used ONLY by
 * heading-brand-core-missing's own presence ("hasCore") test at the CTA-heading position.
 *
 * `productNamePattern()`'s digit-flexible escaping has no notion of script: a Latin unit
 * abbreviation immediately after a digit in the raw product name ("W", "kg", …) is never treated
 * as interchangeable with the Cyrillic spelling `unit-cyrillize.ts` deterministically produces for
 * every uk-UA/ru-UA generation ("Вт", "кг", …). This builds the same digit-flexible pattern as
 * productNamePattern, but for every digit+unit span recognized in LATIN_TO_CYRILLIC_UNITS,
 * additionally accepts that unit's Cyrillic spelling in the same span.
 *
 * GATED ON CYRILLIC_LOCALES: for any other locale this degrades to plain productNamePattern.
 *
 * NEVER used by the shared productNamePattern()/shortPattern/fullPattern
 * heading-product-name-stuffing (FR-6) still uses unmodified — widening the shared matcher would
 * newly trip FR-6 against the corpus's own already-accepted non-blessed §7 heading that legitimately
 * carries the cyrillized-unit product name (see heading-style.spec.ts's own "[pin]" test).
 */
function productNamePatternWithUnitLocale(name: string, locale: string): RegExp {
  const trimmed = name.trim();
  const localeKey = locale.toLowerCase();
  if (!CYRILLIC_LOCALES.includes(localeKey)) return productNamePattern(trimmed);

  const useRu = localeKey === 'ru-ua';
  // Longest-first, mirroring unit-cyrillize.ts's UNIT_ALTERNATION — "mm/s" must win over "mm",
  // "kW" over "W".
  const unitKeys = Object.keys(LATIN_TO_CYRILLIC_UNITS).sort((a, b) => b.length - a.length);
  const unitAlternation = unitKeys.map(u => u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|');
  const unitSpanRe = new RegExp(`(\\d)( ?)(${unitAlternation})(?![\\p{L}\\p{N}²³])`, 'gu');

  let pattern = '';
  let lastIndex = 0;
  for (const m of trimmed.matchAll(unitSpanRe)) {
    const start = m.index ?? 0;
    pattern += escapeNamePattern(trimmed.slice(lastIndex, start));
    const digit = m[1];
    const unit = m[3];
    const mapping = LATIN_TO_CYRILLIC_UNITS[unit];
    const cyrillic = (useRu ? mapping.ru ?? mapping.uk : mapping.uk).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const latinUnit = unit.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    pattern += `${digit}\\s?(?:${latinUnit}|${cyrillic})`;
    lastIndex = start + m[0].length;
  }
  pattern += escapeNamePattern(trimmed.slice(lastIndex));

  return new RegExp(pattern, 'i');
}

/** Does `text` contain productShort(core)'s form (Cyrillic-unit-aware)? Empty core is vacuously present. */
function hasProductCore(text: string, core: string, locale: string): boolean {
  if (!core) return true;
  return productNamePatternWithUnitLocale(core, locale).test(text);
}

/**
 * [US-3.1 T7, FR-7, plan D5(f)] — the doc.localizedName leaf's own shape requirement, checked ONLY
 * after presence (hasProductCore) has already passed for that leaf: a bare name, no leading/trailing
 * sentence framing, no CTA wording, no sentence-terminal punctuation, quotation marks or line breaks
 * it did not already carry — each computed against the raw, untranslated source name
 * (opts.input.name), never against invariantCore()/productShort()-derived text.
 *
 * TWO independent tests, either of which alone fails the candidate:
 *   - occurrence-count: a banned character's count in the candidate may never exceed its count in
 *     the source name, per character code point (not per class).
 *   - trailing-position: a banned character that is the candidate's own trailing (non-whitespace)
 *     character is exempt from THIS check only when it also matches the source name's own trailing
 *     character. Additional to the occurrence-count check, never in its place — it catches a newly
 *     added trailing mark that occurrence-count alone would miss whenever that exact character
 *     already appears elsewhere (e.g. an interior decimal point).
 *
 * A line break is banned unconditionally, subject to neither exemption.
 *
 * The punctuation-free CTA/sentence-framing component of this shape requirement is deliberately NOT
 * implemented — Specification v16/v17 checked and rejected both a core-position rule and a
 * word-count-margin rule for it and accepts the gap as a disclosed residual, not a defect.
 *
 * Returns a human-readable reason, or null when the candidate satisfies the shape requirement.
 */
const SENTENCE_TERMINAL = new Set(['.', '!', '?', '…']);
const QUOTE_MARKS = new Set(['"', '“', '”', '„', '«', '»']);
const LOCALIZED_NAME_BANNED_CHARS = new Set<string>([...SENTENCE_TERMINAL, ...QUOTE_MARKS]);

function localizedNameShapeIssue(candidate: string, sourceName: string): string | null {
  if (/[\n\r]/.test(candidate)) {
    return 'must not contain a line break';
  }

  const trimmedCandidate = candidate.trim();
  const trimmedSource = sourceName.trim();
  const candidateTrailing = trimmedCandidate.slice(-1);
  const sourceTrailing = trimmedSource.slice(-1);

  if (LOCALIZED_NAME_BANNED_CHARS.has(candidateTrailing) && candidateTrailing !== sourceTrailing) {
    return `must not end in "${candidateTrailing}" unless the source name's own name ends in it too`;
  }

  const candidateChars = Array.from(candidate);
  const sourceChars = Array.from(sourceName);
  for (const ch of LOCALIZED_NAME_BANNED_CHARS) {
    const candidateCount = candidateChars.filter(c => c === ch).length;
    const sourceCount = sourceChars.filter(c => c === ch).length;
    if (candidateCount > sourceCount) {
      return `carries "${ch}" more times than the source name does`;
    }
  }

  return null;
}

/**
 * FINITE-VERB HEURISTIC — suffix-based, deliberately permissive.
 *
 * Ukrainian and Russian finite verbs cannot be identified without morphological analysis. This
 * approximates them by the endings that mark a 3rd-person present form, a plural present form or
 * an infinitive, on a Cyrillic token of at least 4 letters:
 *   -є / -ється / -ються      працює, забезпечує, підвищується
 *   -ють / -уть / -ять / -ать / -ить   застосовують, підвищують, робить
 *   -ться                     виконуватися
 *
 * BARE -ти IS DELIBERATELY EXCLUDED although it marks the Ukrainian infinitive. It collides with
 * the genitive-singular / nominative-plural of the very large -та noun class — робота→роботи,
 * плата→плати, кімната→кімнати — and «Безпека під час роботи», a real observed regression, was
 * silently passed because of it. Style B headings use the 3rd-person present, not infinitives, so
 * the branch cost far more than it earned. Reflexive -ться is kept: it is unambiguous.
 *
 * BIASED TOWARD FALSE NEGATIVES ON PURPOSE. A few nouns still share these endings ("нить",
 * "путі"), so a nominal heading built on one is silently allowed. The opposite error — calling a
 * real verb a noun — would put a CORRECT heading in front of an editor on every single
 * generation, which for a warning is the expensive direction.
 *
 * Measured against the reported set:
 *   flagged: «Лазерний модуль потужністю 20 Вт» · «ПЗ та автоматизація» ·
 *            «Безпека під час роботи» · «Електронне керування та аварійні системи»
 *   passed:  «Як працює Ortur H20» · «Де застосовують Ortur H20» ·
 *            «Технічні характеристики Ortur H20» · «Поради щодо експлуатації Ortur H20» ·
 *            «Чому варто купити … ?»
 */
const VERB_ENDING = /(?:ється|ються|ется|ются|ють|уть|ять|ать|ить|ться|є)$/u;
const CYRILLIC_TOKEN = /[\p{Script=Cyrillic}'’-]{4,}/gu;

function looksVerbal(heading: string): boolean {
  return (heading.match(CYRILLIC_TOKEN) ?? []).some(w => VERB_ENDING.test(w.toLowerCase()));
}

function startsWithFunctionalOpener(heading: string, localeKey: string): boolean {
  const openers = FUNCTIONAL_H2_OPENERS[localeKey] ?? [];
  const firstWord = heading.split(/\s+/)[0]?.replace(/[«»"'(]/g, '') ?? '';
  return openers.some(o => firstWord.toLowerCase() === o.toLowerCase());
}

/**
 * Product-name stuffing in headings — EVERY store, EVERY language, <h2> AND <h3>.
 *
 * Deliberately NOT gated on Center 3D Print or on a Cyrillic locale, unlike the Style B rule
 * below: [HEADING FORM] in the master prompt is global, and the observed regression hit all
 * five locales of the artifact at once ("Технічні характеристики 3D-сканера XGRIDS L2 Pro
 * 32/300 Standard Package" and its de/pl/en/ru equivalents).
 *
 * Three budgets, and the <h3> one is the point of scanning <h3> at all: a rule scoped to <h2>
 * is an invitation to push the keyword down a level, with the linter silent. An <h3> is only
 * ever a §3/§7 sub-label, so its budget is zero rather than two.
 *
 * This checks the NAME, not nominal-vs-functional form, so it does not touch the <h3>-stays-
 * nominal carve-out that guards against the §7 category collapse.
 */
function checkProductNameStuffing(
  doc: Document,
  html: string,
  productName: string,
  locale: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const full = productName.trim();
  if (!full) return issues;

  const short = productShort(full);
  // The degenerate case (US-3.1 T7, FR-6): productShort(name) === name when there is no
  // configuration code or packaging suffix to drop. The short(=full) form at a blessed position
  // must never be flagged by the full-pattern branch below, even though it IS the full name.
  const degenerate = short === full;
  const fullPattern = productNamePattern(full);
  // Only meaningful when the short form is genuinely shorter; otherwise the "full name"
  // check already covers it and counting twice would double-report the same heading.
  const shortPattern = short && !degenerate ? productNamePattern(short) : null;

  const headings = Array.from(doc.querySelectorAll('h2, h3'));
  // extractBlocks() (block-repair.ts) already indexes h2/h3 among its addressable prose blocks —
  // reused here rather than inventing a second HTML-position scheme, so a finding raised here can
  // be repaired by the SAME repairBlocks executor every other block-scoped rule already uses. Both
  // lists are document-order traversals of the identical `html`, so position i in one corresponds
  // to position i in the other; a length mismatch (a parser disagreement) degrades to "no path" —
  // still reported, just not machine-addressable — rather than mis-pairing a heading to the wrong
  // block.
  const headingBlocks = extractBlocks(html).filter(b => b.tag === 'h2' || b.tag === 'h3');
  const blockPathFor = (heading: Element): string | undefined => {
    if (headingBlocks.length !== headings.length) return undefined;
    const i = headings.indexOf(heading);
    return i >= 0 ? `block[${headingBlocks[i].index}]` : undefined;
  };

  // ── Pass 1 (US-3.1 T7, plan D5): STRUCTURAL blessed-position identification ────────────────────
  //
  // Computed BEFORE the per-heading loop, and by STRUCTURE (position/shape), never by whether a
  // heading happens to already match the short-name pattern. A content-derived "first named
  // heading" silently reassigns the reserved slot to whichever heading comes next once the true
  // first heading is generic — see heading-style.spec.ts's "widens the flagged set" test. The
  // `named.includes(lastH2)` conjunct the old closing-identification carried is dropped: a
  // structurally-last, question-shaped <h2> is blessed regardless of whether it happens to name the
  // product.
  const structuralH2s = headings.filter(h => h.tagName === 'H2' && !h.closest('section.specs'));
  const blessedFirst = structuralH2s[0];
  // The LAST structural <h2> — blessed only when IT is question-shaped, never "whichever question-
  // shaped <h2> sorts last": a mid-document §3 heading that happens to be a question must not be
  // mistaken for the §9 closing when the true last heading isn't one.
  const lastStructural = structuralH2s.at(-1);
  const closing =
    lastStructural && (lastStructural.textContent ?? '').includes('?') ? lastStructural : undefined;
  const blessed = new Set([blessedFirst, closing].filter(Boolean));

  // ── FR-7 (US-3.1 T7, plan D5/D5(e)): heading-brand-core-missing — mandatory presence at the ────
  //     CTA-heading position ONLY, narrowed from two blessed positions as of Specification v16.
  //     doc.functionality[0].heading / the structural first heading is NEVER checked here — it
  //     remains a blessed position for the FR-6 stuffing exemption above only. Uses the
  //     Cyrillic-unit-aware matcher (D5(e)), never the shared productNamePattern the FR-6 loop
  //     below still uses unmodified.
  if (closing) {
    const closingText = (closing.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!hasProductCore(closingText, short, locale)) {
      issues.push({
        severity: 'error',
        rule: 'heading-brand-core-missing',
        detail:
          `The §9 closing heading "${closingText}" omits the required brand core "${short}". Per ` +
          `[HEADING FORM] the CTA heading must name the product using its short form.`,
        context: `${locale} — heading form`,
        path: blockPathFor(closing),
      });
    }
  }

  // ── Pass 2: the existing per-heading loop, unaffected in substance by FR-7's narrowing above ───
  //     except for the degenerate blessed-position exemption on the full-pattern branch.
  const named: Element[] = [];

  for (const heading of headings) {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (fullPattern.test(text)) {
      const isBlessed = heading.tagName === 'H2' && blessed.has(heading);
      // FR-6's degenerate exemption: the short(=full) form at a blessed position is never flagged.
      if (isBlessed && degenerate) continue;
      issues.push({
        severity: 'warning',
        rule: 'heading-product-name-stuffing',
        detail:
          `The <${heading.tagName.toLowerCase()}> "${text}" contains the FULL product name. ` +
          `Per [HEADING FORM] no heading may carry the configuration code or the package/kit ` +
          `suffix — use the short form "${short}" in the first §3 heading and the §9 closing, ` +
          `and a generic category noun everywhere else.`,
        context: `${locale} — heading form`,
        path: blockPathFor(heading),
      });
      continue;
    }

    if (heading.tagName === 'H3' && shortPattern?.test(text)) {
      issues.push({
        severity: 'warning',
        rule: 'heading-product-name-stuffing',
        detail:
          `The <h3> "${text}" names the product. Sub-headings are short nominal labels ` +
          `(«Лазерний модуль», «Безпека») and never carry the product name at all.`,
        context: `${locale} — heading form`,
        path: blockPathFor(heading),
      });
      continue;
    }

    if (heading.tagName === 'H2' && shortPattern?.test(text)) named.push(heading);
  }

  // Budget of two: the first §3 heading and the §9 commercial closing — those two SPECIFICALLY,
  // not "whichever two come first". `named.slice(2)` used to imply the latter, which blamed the
  // wrong heading whenever a stray §4–§7 heading also named the product: the §9 closing sorts last
  // in document order, so it fell outside the first two and was reported while the actual offender
  // passed. Harmless while the finding was unrepairable; not harmless now that repair-strategy.ts
  // can address it, because the ladder would rewrite a correct CTA and leave the real one alone.
  //
  // TWO is still a budget, not a pair of assigned seats: at two or fewer product-named <h2>s
  // nothing is flagged, exactly as before. Identity only decides WHO is at fault once a third
  // appears. Flagging a §4–§7 heading while the artifact is still within budget would rewrite
  // headings that have always passed — a stricter rule than anyone asked for, and one that now
  // costs a field-scoped LLM call because repair-strategy.ts can address these paths.
  const flagged = named.length > 2 ? named.filter(h => !blessed.has(h)) : [];

  for (const heading of flagged) {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    issues.push({
      severity: 'warning',
      rule: 'heading-product-name-stuffing',
      // NO POSITIONAL ORDINAL. It used to read "is the Nth <h2> naming the product; at most TWO
      // may", which was coherent only while slice(2) guaranteed N >= 3. Now that the two slots are
      // reserved by identity, a flagged heading can be the 2nd — and "you are the 2nd of at most 2"
      // gives the model no reason to change anything. This string is spliced verbatim into
      // REPAIR_STRATEGIES' fieldInstruction, so an incoherent detail is an incoherent repair prompt.
      detail:
        `"${text}" names the product in an <h2> that is neither the first §3 heading nor the §9 ` +
        `closing — those two are the only headings allowed to. Replace this one's product name ` +
        `with a generic category noun ("пристрій", "лідар-сканер") or drop it entirely.`,
      context: `${locale} — heading form`,
      path: blockPathFor(heading),
    });
  }

  return issues;
}

/**
 * @param html        generated HTML for one locale
 * @param locale      BCP47; the Style B nominal check analyzes only uk-UA / ru-UA
 * @param storeName   gate — Style B is Center 3D Print's voice, not a global rule
 * @param productName raw input name; enables the global heading-product-name-stuffing check
 * @returns 'h2-nominal-heading' and 'heading-product-name-stuffing' warnings
 */
export function validateHeadingStyle(
  html: string,
  locale: string,
  storeName: string,
  productName = '',
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim()) return issues;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return issues; // DOMParser unavailable — skip, same guard style as specs-grounding.ts
  }

  // Runs for every store and locale — see checkProductNameStuffing's doc-comment.
  issues.push(...checkProductNameStuffing(doc, html, productName, locale));

  if (!isCenter3dPrintStore(storeName)) return issues;

  const localeKey = locale.toLowerCase();
  if (!CYRILLIC_LOCALES.includes(localeKey)) return issues;

  const mandatedNominal = MANDATED_NOMINAL_H2[localeKey] ?? [];

  for (const h2 of Array.from(doc.querySelectorAll('h2'))) {
    // §7 — the specifications header is nominal by master template, and structurally identifiable.
    if (h2.closest('section.specs')) continue;

    const text = (h2.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const lower = text.toLowerCase();

    if (text.includes('?')) continue;                                                  // §9 closing question
    if (mandatedNominal.some(m => lower.startsWith(m.toLowerCase()))) continue;         // §5/§6/§7
    if (startsWithFunctionalOpener(text, localeKey)) continue;
    if (looksVerbal(text)) continue;

    issues.push({
      severity: 'warning',
      rule: 'h2-nominal-heading',
      // The <h3> carve-out is restated here because appendRepairFeedback echoes `detail` back to
      // the model on any error-severity repair in the same artifact — an unscoped heading ban in
      // that feedback is how the §7 category collapse propagated once already.
      detail:
        `The section heading "${text}" is a bare nominal topic. Style B requires §3 <h2>s to ` +
        `state a function or answer a query — «Як працює [Product-short]», «Яке програмне ` +
        `забезпечення підтримує пристрій», «Яким стандартам відповідає пристрій». ` +
        `SCOPE: §3 <h2> ONLY. §4–§7 and the operating-tips block are nominal BY DESIGN, and ` +
        `<h3> sub-headings in §3 and §7 stay concise nominal labels that must never be dropped ` +
        `or merged. Do not add a product name to fix this — see [HEADING FORM].`,
      context: `${locale} — Center 3D Print ToV`,
    });
  }

  return issues;
}

/** A single heading collected off the Doc, in document order, addressed by JSON path. `level`
 *  mirrors the HTML renderer's own choice — top-level Subsections render <h2>, one nesting level
 *  deep renders <h3> (see description-doc.ts's Subsection.heading doc-comment).
 *
 *  `path` is prefixed with `doc.` — relative to `runDocGate`'s `{ doc, issues }` wrapper
 *  (`DocAttempt`), which is what `runRepairGate`'s path addressing actually walks, not the Doc
 *  itself (see repair-strategy.ts's path-addressing note).
 *
 *  EVERY shape emitted here is addressable. That was not always true: the shared path grammar once
 *  required a bracketed array index, so only `doc.functionality[i].heading` parsed and
 *  `doc.specs.heading`, `doc.cta.heading` and any h3 `...subsections[j].heading` threw
 *  "unsupported path" — caught as "cannot patch this one" rather than crashing, but leaving the
 *  warning-only heading rule permanently unrepairable on a Doc, since its field-scoped rung is the
 *  only instrument it has there. A live run put the full product name in the §9 CTA heading and hit
 *  exactly that dead end. repair-strategy.ts now walks arbitrary segments and rejects the
 *  dropped-index caller bug by inspecting the data instead of the string, so adding a path shape
 *  here no longer needs a grammar change — but it does still need the value at that path to be a
 *  string, which is what `applyTier` reads before calling a strategy. */
interface DocHeading {
  text: string;
  level: 'h2' | 'h3';
  path: string;
}

function subsectionHeadings(sub: Subsection, path: string, level: 'h2' | 'h3'): DocHeading[] {
  const out: DocHeading[] = [{ text: sub.heading, level, path: `${path}.heading` }];
  sub.subsections?.forEach((s, i) => out.push(...subsectionHeadings(s, `${path}.subsections[${i}]`, 'h3')));
  return out;
}

/**
 * Every heading in the document, in document order, tagged h2/h3 by nesting depth.
 *
 * Unlike the HTML sibling's `doc.querySelectorAll('h2, h3')`, this does not need a
 * section.specs-wrapper check or a MANDATED_NOMINAL_H2 skip-list to find its way to "which
 * headings are §3" — the Doc's structure already says so directly: functionality[] IS §3,
 * specs.heading IS §7, and so on. See validateHeadingStyleDoc below.
 */
function collectHeadings(doc: ProductDescriptionDoc): DocHeading[] {
  const out: DocHeading[] = [];
  (doc.functionality ?? []).forEach((s, i) => out.push(...subsectionHeadings(s, `doc.functionality[${i}]`, 'h2')));
  if (doc.applications) out.push({ text: doc.applications.heading, level: 'h2', path: 'doc.applications.heading' });
  if (doc.compatibility) out.push(...subsectionHeadings(doc.compatibility, 'doc.compatibility', 'h2'));
  if (doc.packageContents) out.push({ text: doc.packageContents.heading, level: 'h2', path: 'doc.packageContents.heading' });
  if (doc.specs) out.push({ text: doc.specs.heading, level: 'h2', path: 'doc.specs.heading' });
  out.push({ text: doc.cta.heading, level: 'h2', path: 'doc.cta.heading' });
  return out;
}

/** Doc-reading sibling of checkProductNameStuffing — same three rules (full-name-in-any-heading,
 *  short-name-in-h3, budget-of-two short-name-in-h2), reading collectHeadings() instead of
 *  doc.querySelectorAll('h2, h3'). */
function checkProductNameStuffingDoc(
  doc: ProductDescriptionDoc,
  productName: string,
  locale: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const full = productName.trim();
  if (!full) return issues;

  const short = productShort(full);
  const degenerate = short === full;
  const fullPattern = productNamePattern(full);
  const shortPattern = short && !degenerate ? productNamePattern(short) : null;

  const headings = collectHeadings(doc);

  // ── Pass 1 (US-3.1 T7, plan D5): STRUCTURAL blessed-position identification, BY PATH — see the ──
  //     HTML sibling's own note. A doc that omits §3 entirely (test/fixtures/simplified-docs.ts's
  //     sparePartsDoc()) has NO blessedFirst at all, structurally, rather than falling back to
  //     whichever heading happens to come first in collectHeadings()'s output.
  const blessedFirst = headings.find(h => h.path === 'doc.functionality[0].heading');
  // blessedClosing is doc.cta.heading UNCONDITIONALLY, regardless of schemaVersion — FR-6's own
  // Doc-path CTA position is NOT retargeted by this task (a documented, non-blocking parallel gap,
  // separate from FR-7's own schemaVersion-conditional retarget below).
  const blessedClosing = headings.find(h => h.path === 'doc.cta.heading');
  const blessed = new Set([blessedFirst, blessedClosing].filter(Boolean));

  // ── FR-7 (US-3.1 T7, plan D5/D5(f)): heading-brand-core-missing — mandatory presence, CTA- ─────
  //     heading position only, schemaVersion-conditional: doc.cta.heading for '3.0',
  //     doc.localizedName for '4.0' — a render-description.ts-driven retarget (the v4/simplified-
  //     template path discards doc.cta.heading unconditionally and assembles the shipped heading
  //     from doc.localizedName instead). doc.functionality[0].heading is NEVER checked here, under
  //     any schemaVersion.
  if (doc.schemaVersion === '4.0') {
    const candidate = doc.localizedName ?? '';
    if (!hasProductCore(candidate, short, locale)) {
      issues.push({
        severity: 'error',
        rule: 'heading-brand-core-missing',
        detail: `The localized name "${candidate}" omits the required brand core "${short}".`,
        context: `${locale} — heading form`,
        path: 'doc.localizedName',
      });
    } else {
      // Shape check only runs once presence has already passed — see localizedNameShapeIssue's
      // own doc comment for why the two checks never double-report the same leaf.
      const shapeReason = localizedNameShapeIssue(candidate, full);
      if (shapeReason) {
        issues.push({
          severity: 'error',
          rule: 'heading-brand-core-missing',
          detail: `The localized name "${candidate}" ${shapeReason}.`,
          context: `${locale} — heading form`,
          path: 'doc.localizedName',
        });
      }
    }
  } else if (blessedClosing) {
    const closingText = (blessedClosing.text ?? '').replace(/\s+/g, ' ').trim();
    if (!hasProductCore(closingText, short, locale)) {
      issues.push({
        severity: 'error',
        rule: 'heading-brand-core-missing',
        detail:
          `The heading at ${blessedClosing.path} ("${closingText}") omits the required brand ` +
          `core "${short}".`,
        context: `${locale} — heading form`,
        path: blessedClosing.path,
      });
    }
  }

  // ── Pass 2: the existing per-heading loop, unaffected in substance by FR-7's narrowing above ───
  //     except for the degenerate blessed-position exemption on the full-pattern branch.
  const named: DocHeading[] = [];

  for (const heading of headings) {
    const text = (heading.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (fullPattern.test(text)) {
      const isBlessed = heading.level === 'h2' && blessed.has(heading);
      // FR-6's degenerate exemption: the short(=full) form at a blessed position is never flagged.
      if (isBlessed && degenerate) continue;
      issues.push({
        severity: 'warning',
        rule: 'heading-product-name-stuffing',
        detail:
          `The heading at ${heading.path} ("${text}") contains the FULL product name. Per ` +
          `[HEADING FORM] no heading may carry the configuration code or the package/kit suffix ` +
          `— use the short form "${short}" in the first §3 heading and the §9 closing, and a ` +
          `generic category noun everywhere else.`,
        context: `${locale} — heading form`,
        path: heading.path,
      });
      continue;
    }

    if (heading.level === 'h3' && shortPattern?.test(text)) {
      issues.push({
        severity: 'warning',
        rule: 'heading-product-name-stuffing',
        detail:
          `The sub-heading at ${heading.path} ("${text}") names the product. Sub-headings are ` +
          `short nominal labels («Лазерний модуль», «Безпека») and never carry the product name ` +
          `at all.`,
        context: `${locale} — heading form`,
        path: heading.path,
      });
      continue;
    }

    if (heading.level === 'h2' && shortPattern?.test(text)) named.push(heading);
  }

  // Budget of two: the first §3 heading and the §9 commercial closing — see the HTML sibling's
  // note on why this is not `named.slice(2)`. Exact here rather than heuristic: collectHeadings()
  // stamps the CTA with its own field path, so no question-mark sniffing is needed.
  // At or under budget, nothing is flagged — see the HTML sibling's note.
  const flagged = named.length > 2 ? named.filter(h => !blessed.has(h)) : [];

  for (const heading of flagged) {
    const text = (heading.text ?? '').replace(/\s+/g, ' ').trim();
    issues.push({
      severity: 'warning',
      rule: 'heading-product-name-stuffing',
      // No positional ordinal — see the HTML sibling's note on why it became incoherent.
      detail:
        `The heading at ${heading.path} ("${text}") names the product but is neither the first §3 ` +
        `heading nor the §9 closing — those two are the only headings allowed to. Replace this ` +
        `one's product name with a generic category noun ("пристрій", "лідар-сканер") or drop it ` +
        `entirely.`,
      context: `${locale} — heading form`,
      path: heading.path,
    });
  }

  return issues;
}

/**
 * Doc-reading sibling of validateHeadingStyle — reads Doc fields directly instead of parsing
 * rendered HTML with DOMParser.
 *
 * The Style B nominal-heading check (`h2-nominal-heading`) is scoped to `functionality[].heading`
 * ONLY — the Doc-model equivalent of "§3 <h2> ONLY" from the HTML sibling's own detail message.
 * The HTML version needed a §7-wrapper check plus MANDATED_NOMINAL_H2/"?"-suffix skip conditions
 * to reconstruct which headings belong to §3; the Doc model already
 * segregates §3 into its own `functionality[]` field, so none of that reconstruction is needed —
 * every OTHER section's heading (§4–§7, tips, §9) is structurally never a `functionality[]`
 * heading and is therefore never a h2-nominal-heading candidate in the first place. The skip
 * conditions are kept anyway as a defensive no-op (a §3 heading that happens to start with a
 * mandated-nominal phrase is vanishingly unlikely, but free to guard against).
 *
 * `heading-product-name-stuffing` stays global — every store, every locale, h2 AND h3 — exactly
 * like the HTML sibling.
 *
 * @param doc         the ProductDescriptionDoc under validation
 * @param locale      BCP47; the Style B nominal check analyzes only uk-UA / ru-UA
 * @param storeName   gate — Style B is Center 3D Print's voice, not a global rule
 * @param productName raw input name; enables the global heading-product-name-stuffing check
 * @returns 'h2-nominal-heading' and 'heading-product-name-stuffing' warnings, each addressed by
 *          JSON path
 */
export function validateHeadingStyleDoc(
  doc: ProductDescriptionDoc,
  locale: string,
  storeName: string,
  productName: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Runs for every store and locale — see checkProductNameStuffingDoc's doc-comment.
  issues.push(...checkProductNameStuffingDoc(doc, productName, locale));

  if (!isCenter3dPrintStore(storeName)) return issues;

  const localeKey = locale.toLowerCase();
  if (!CYRILLIC_LOCALES.includes(localeKey)) return issues;

  const mandatedNominal = MANDATED_NOMINAL_H2[localeKey] ?? [];

  (doc.functionality ?? []).forEach((section, i) => {
    const text = (section.heading ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const lower = text.toLowerCase();
    // 'doc.'-prefixed for the same reason collectHeadings()'s paths are — see DocHeading's comment.
    const path = `doc.functionality[${i}].heading`;

    if (text.includes('?')) return;                                                    // §9-shaped, defensive
    if (mandatedNominal.some(m => lower.startsWith(m.toLowerCase()))) return;           // §5/§6/§7-shaped, defensive
    if (startsWithFunctionalOpener(text, localeKey)) return;
    if (looksVerbal(text)) return;

    issues.push({
      severity: 'warning',
      rule: 'h2-nominal-heading',
      // The nested-subsection carve-out is restated here because appendRepairFeedback echoes
      // `detail` back to the model on any error-severity repair in the same artifact — an
      // unscoped heading ban in that feedback is how the §7 category collapse propagated once
      // already (see heading-style.ts's HTML sibling).
      detail:
        `The section heading at ${path} ("${text}") is a bare nominal topic. Style B requires §3 ` +
        `headings to state a function or answer a query — «Як працює [Product-short]», «Яке ` +
        `програмне забезпечення підтримує пристрій», «Яким стандартам відповідає пристрій». ` +
        `SCOPE: functionality[].heading (§3) ONLY. §4–§7 and the operating-tips block are ` +
        `nominal BY DESIGN, and nested sub-headings in §3 and §7 stay concise nominal labels that ` +
        `must never be dropped or merged. Do not add a product name to fix this — see [HEADING ` +
        `FORM].`,
      context: `${locale} — Center 3D Print ToV`,
      path,
    });
  });

  return issues;
}
