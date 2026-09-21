/**
 * simplified-word-ranges.ts
 *
 * The v4 word-range validators for the simplified templates (US-2.2 D5, FR-14, FR-16, OD-11, OD-15).
 *
 * WHY THIS IS ITS OWN FILE. `output-validator.ts` is FROZEN (AGENTS.md §9). The logic lives here and
 * the frozen file gains ONE call, `validateSimplifiedTemplateHtml`, which composes the range check
 * with the §7 shape check from `simplified-specs-shape.ts`. Same sibling-file idiom as
 * `image-manifest-coverage.ts` and `spec-category-shape.ts`.
 *
 * TWO ENTRY POINTS OVER ONE RANGE TABLE AND ONE `countWords`:
 *   - `validateSimplifiedRangesDoc`  reads the typed Doc, so a violation reaches the Doc-gate repair
 *     loop with a field path;
 *   - `validateSimplifiedRangesHtml` reads rendered HTML (legacy path, final pass).
 * They agree on every shared fixture (plan V6, R3).
 *
 * SEMANTICS. Master locale only (uk-UA; translated locales skip), simplified templates only (Full
 * and unknown ids skip). Each PRESENT paragraph is checked against BOTH its minimum and maximum; a
 * violation is an `error`, at any total length, so the standard retry fires. The 5500-character
 * soft ceiling produces no issue at all: the v4 ranges win over it (FR-16).
 */
import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc, Block, Subsection } from '../domain/description-doc';
import { validateSimplifiedSpecsShapeHtml } from './simplified-specs-shape';
import {
  BLOCK2_MAX_ITEMS, V4_WORD_RANGES, countWords, isSimplifiedTemplateId, type WordRange,
} from '../prompt-core/simplified-templates';
import { MASTER_LOCALE, V4_SECTION_HEADINGS } from '../prompt-core/constants';

/** §5's heading, in the two Cyrillic master scripts. Used only to tell §5 from §3 on the Accessories template. */
const COMPATIBILITY_HEADING = /сумісн|совмест/i;

const RULE = 'simplified-range';

const isMaster = (locale: string): boolean => locale.toLowerCase() === MASTER_LOCALE.toLowerCase();

function rangeIssue(
  path: string, label: string, what: string, words: number, range: WordRange, context: string,
): ValidationIssue | null {
  if (words >= range.min && words <= range.max) return null;
  const direction = words < range.min ? 'too short' : 'too long';
  return {
    severity: 'error',
    rule: `${RULE}-${path}`,
    detail:
      `${what} has ${words} words, ${direction}: the allowed range is ${range.min}-${range.max} words. ` +
      `Rewrite it to fit (${label}).`,
    context,
    path,
  };
}

// ---------------------------------------------------------------------------------------------
// Doc entry point
// ---------------------------------------------------------------------------------------------

const blockWords = (b: Block): number => {
  switch (b.kind) {
    case 'paragraph': return countWords(b.text);
    case 'bullets': return b.items.reduce((n, i) => n + countWords(i.lead) + countWords(i.text), 0);
    default: return 0; // figure / video carry no prose words of their own
  }
};

const subsectionWords = (s: Subsection): number =>
  s.blocks.reduce((n, b) => n + blockWords(b), 0)
  + (s.subsections ?? []).reduce((n, sub) => n + countWords(sub.heading) + subsectionWords(sub), 0);

export function validateSimplifiedRangesDoc(
  doc: ProductDescriptionDoc,
  templateId: string | undefined,
  localeIso: string,
  label: string,
): ValidationIssue[] {
  if (!isSimplifiedTemplateId(templateId) || !isMaster(localeIso)) return [];
  const issues: ValidationIssue[] = [];
  const push = (i: ValidationIssue | null) => { if (i) issues.push(i); };

  push(rangeIssue('hook', label, 'Paragraph 1 (hook)', countWords(doc.hook), V4_WORD_RANGES.hook, label));

  if (doc.killerSpecs || doc.keyBenefits) {
    const killer = doc.killerSpecs ?? [];
    const benefits = doc.keyBenefits ?? [];
    const words =
      killer.reduce((n, k) => n + countWords(k.label) + countWords(k.value) + countWords(k.why), 0)
      + benefits.reduce((n, b) => n + blockWords(b), 0);
    const items = killer.length + benefits.reduce((n, b) => n + (b.kind === 'bullets' ? b.items.length : 0), 0);
    push(rangeIssue(
      doc.killerSpecs ? 'killerSpecs' : 'keyBenefits', label,
      'Paragraph 2 (killer specs + key benefits)', words, V4_WORD_RANGES.block2, label,
    ));
    if (items > BLOCK2_MAX_ITEMS) {
      issues.push({
        severity: 'error', rule: `${RULE}-items`, context: label, path: 'keyBenefits',
        detail: `Paragraph 2 has ${items} list items; at most ${BLOCK2_MAX_ITEMS} are allowed. Remove ${items - BLOCK2_MAX_ITEMS}.`,
      });
    }
  }

  if (doc.applications) {
    const words =
      (doc.applications.blocks ?? []).reduce((n, b) => n + blockWords(b), 0)
      + doc.applications.items.reduce((n, i) => n + countWords(i.scenario) + countWords(i.text), 0);
    push(rangeIssue('applications', label, 'Paragraph 4 (applications)', words, V4_WORD_RANGES.applications, label));
  }

  if (doc.compatibility) {
    push(rangeIssue(
      'compatibility', label, 'Paragraph 5 (compatibility)',
      subsectionWords(doc.compatibility), V4_WORD_RANGES.compatibility, label,
    ));
  }

  push(rangeIssue('cta', label, 'Paragraph 8 (CTA)', countWords(doc.cta.text), V4_WORD_RANGES.cta, label));

  return issues;
}

// ---------------------------------------------------------------------------------------------
// HTML entry point
// ---------------------------------------------------------------------------------------------

/** Text and list-item count of an <h2> group, excluding the heading, figures and embeds. */
function groupStats(h2: Element): { words: number; items: number } {
  let words = 0;
  let items = 0;
  for (let el = h2.nextElementSibling; el && el.tagName !== 'H2' && el.tagName !== 'HR' && el.tagName !== 'SECTION'; el = el.nextElementSibling) {
    if (el.tagName === 'FIGURE' || el.tagName === 'IFRAME') continue;
    if (el.classList.contains('cta')) break;
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll('figure, iframe').forEach(n => n.remove());
    words += countWords(clone.textContent ?? '');
    items += clone.querySelectorAll('li').length;
  }
  return { words, items };
}

export function validateSimplifiedRangesHtml(
  html: string,
  templateId: string | undefined,
  locale: string,
  label: string,
): ValidationIssue[] {
  if (!isSimplifiedTemplateId(templateId) || !isMaster(locale)) return [];
  const issues: ValidationIssue[] = [];
  const push = (i: ValidationIssue | null) => { if (i) issues.push(i); };

  const body = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html').getElementById('root')!;
  const top = Array.from(body.children);
  const localeKey = locale.toLowerCase();

  // §1: the first top-level <p> before the first <h2>.
  const firstH2Index = top.findIndex(e => e.tagName === 'H2');
  const hookEl = top.slice(0, firstH2Index < 0 ? top.length : firstH2Index).find(e => e.tagName === 'P');
  if (hookEl) push(rangeIssue('hook', label, 'Paragraph 1 (hook)', countWords(hookEl.textContent ?? ''), V4_WORD_RANGES.hook, label));

  // §8: the closing <p class="cta">.
  const ctaEl = body.querySelector('p.cta');
  if (ctaEl) push(rangeIssue('cta', label, 'Paragraph 8 (CTA)', countWords(ctaEl.textContent ?? ''), V4_WORD_RANGES.cta, label));

  const keyBenefitsH2 = V4_SECTION_HEADINGS[localeKey]?.keyBenefitsH2;
  const remaining: Element[] = [];

  for (const h2 of top.filter(e => e.tagName === 'H2')) {
    const text = (h2.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (h2.nextElementSibling?.classList.contains('cta')) continue; // §8's own heading

    if (keyBenefitsH2 && text === keyBenefitsH2) {
      const { words, items } = groupStats(h2);
      push(rangeIssue('keyBenefits', label, 'Paragraph 2 (killer specs + key benefits)', words, V4_WORD_RANGES.block2, label));
      if (items > BLOCK2_MAX_ITEMS) {
        issues.push({
          severity: 'error', rule: `${RULE}-items`, context: label, path: 'keyBenefits',
          detail: `Paragraph 2 has ${items} list items; at most ${BLOCK2_MAX_ITEMS} are allowed. Remove ${items - BLOCK2_MAX_ITEMS}.`,
        });
      }
    } else {
      remaining.push(h2);
    }
  }

  // The other <h2> groups are told apart by the template's paragraph set, in document order. §3 has no
  // word range, so a group that is not identifiably §4 or §5 is simply left unchecked.
  const compat = (h2: Element, key: 'compatibility') =>
    push(rangeIssue(key, label, 'Paragraph 5 (compatibility)', groupStats(h2).words, V4_WORD_RANGES.compatibility, label));
  const applications = (h2: Element) =>
    push(rangeIssue('applications', label, 'Paragraph 4 (applications)', groupStats(h2).words, V4_WORD_RANGES.applications, label));

  if (templateId === 'filaments-resins-powders') {
    if (remaining[0]) applications(remaining[0]);
    if (remaining[1]) compat(remaining[1], 'compatibility');
  } else if (templateId === 'spare-parts') {
    if (remaining[0]) compat(remaining[0], 'compatibility');
  } else {
    // accessories: an optional §3 (no range), then an optional §5. §5 is recognised by its heading.
    for (const h2 of remaining) {
      if (COMPATIBILITY_HEADING.test(h2.textContent ?? '')) compat(h2, 'compatibility');
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------------------------
// The single composed entry point the frozen validator calls
// ---------------------------------------------------------------------------------------------

/**
 * Range check (master locale only) composed with the §7 shape check (every locale: structure is
 * locale-independent, FR-8). One call from `output-validator.ts`, so the frozen edit stays minimal.
 */
export function validateSimplifiedTemplateHtml(
  html: string,
  templateId: string | undefined,
  locale: string,
  label: string,
): ValidationIssue[] {
  return [
    ...validateSimplifiedRangesHtml(html, templateId, locale, label),
    ...validateSimplifiedSpecsShapeHtml(html, templateId, label),
  ];
}
