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
 * A SIBLING of tov-second-person.ts rather than an extension of it: that module's walker
 * deliberately skips PAST the operating-tips <h2> to exclude the block's body text, whereas this
 * one has to inspect that heading. Same house idioms — DOMParser guard, store gate, locale gate.
 *
 * Pure function, no LLM.
 */

import type { ValidationIssue } from './output-validator';
import {
  FUNCTIONAL_H2_OPENERS,
  MANDATED_NOMINAL_H2,
  OPERATING_TIPS_H2_MARKERS,
  isCenter3dPrintStore,
} from '../prompt-core/constants';
import { productShort } from '../prompt-core/product-name-core';

/**
 * [ADAPTED from buildProductNamePattern in output-validator.ts:369]
 *
 * Re-implemented rather than imported because that file is FROZEN (CLAUDE.md) and does not
 * export the helper. Same idiom test/render-reconciliation.spec.ts uses for COUNTED_TAGS: copy
 * with a pointer, keep them in step by hand. The digit/letter flexibility is inherited for the
 * same reason — a name typed "20W" appears as "20 W" after unit-spacing normalization.
 */
function productNamePattern(name: string): RegExp {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/(\d)(?=[A-Za-zµμ])/g, '$1\\s?'), 'i');
}

/** Same scope as tov-second-person.ts: the heading lexicon exists only for these two. */
const CYRILLIC_LOCALES = ['uk-ua', 'ru-ua'];

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
  productName: string,
  locale: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const full = productName.trim();
  if (!full) return issues;

  const short = productShort(full);
  const fullPattern = productNamePattern(full);
  // Only meaningful when the short form is genuinely shorter; otherwise the "full name"
  // check already covers it and counting twice would double-report the same heading.
  const shortPattern = short && short !== full ? productNamePattern(short) : null;

  const headings = Array.from(doc.querySelectorAll('h2, h3'));
  const named: Element[] = [];

  for (const heading of headings) {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (fullPattern.test(text)) {
      issues.push({
        severity: 'warning',
        rule: 'heading-product-name-stuffing',
        detail:
          `The <${heading.tagName.toLowerCase()}> "${text}" contains the FULL product name. ` +
          `Per [HEADING FORM] no heading may carry the configuration code or the package/kit ` +
          `suffix — use the short form "${short}" in the first §3 heading and the §9 closing, ` +
          `and a generic category noun everywhere else.`,
        context: `${locale} — heading form`,
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
      });
      continue;
    }

    if (heading.tagName === 'H2' && shortPattern?.test(text)) named.push(heading);
  }

  // Budget of two: the first §3 heading and the §9 commercial closing.
  for (const heading of named.slice(2)) {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    issues.push({
      severity: 'warning',
      rule: 'heading-product-name-stuffing',
      detail:
        `"${text}" is the ${named.indexOf(heading) + 1}th <h2> naming the product; at most TWO ` +
        `may — the first §3 heading and the §9 closing. Replace this one's product name with a ` +
        `generic category noun ("пристрій", "лідар-сканер") or drop it entirely.`,
      context: `${locale} — heading form`,
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
  issues.push(...checkProductNameStuffing(doc, productName, locale));

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
    if (OPERATING_TIPS_H2_MARKERS.some(m => lower.startsWith(m.toLowerCase()))) continue; // §8 tips
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
