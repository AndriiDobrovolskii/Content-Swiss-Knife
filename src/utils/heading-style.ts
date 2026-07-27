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
 * @param html      generated HTML for one locale
 * @param locale    BCP47; only uk-UA / ru-UA are analyzed
 * @param storeName gate — Style B is Center 3D Print's voice, not a global rule
 * @returns one 'h2-nominal-heading' warning per offending section heading
 */
export function validateHeadingStyle(
  html: string,
  locale: string,
  storeName: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim()) return issues;
  if (!isCenter3dPrintStore(storeName)) return issues;

  const localeKey = locale.toLowerCase();
  if (!CYRILLIC_LOCALES.includes(localeKey)) return issues;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return issues; // DOMParser unavailable — skip, same guard style as specs-grounding.ts
  }

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
        `The section heading "${text}" is a bare nominal topic. Style B requires section <h2>s to ` +
        `state a function or answer a query — «Як працює [Product]», «Яке ПЗ підтримує [Product]», ` +
        `«Які механізми безпеки застосовує [Product]», «Де застосовують [Product]». ` +
        `This applies to <h2> ONLY: <h3> sub-headings in §3 and §7 stay concise nominal labels ` +
        `and must never be dropped or merged.`,
      context: `${locale} — Center 3D Print ToV`,
    });
  }

  return issues;
}
