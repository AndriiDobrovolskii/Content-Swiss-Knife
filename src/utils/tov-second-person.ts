/**
 * tov-second-person.ts
 *
 * Center 3D Print "Style B" confines direct second-person address to two places: the
 * operating-tips block (SIGNATURE MOVE #3) and the closing CTA. Everywhere else the voice is
 * impersonal, with the machine as the grammatical subject. This linter enforces that.
 *
 * WARNING SEVERITY, ON PURPOSE. Neither exempt block has a wrapper class in the generated HTML —
 * the tips block is a bare <h2> + <ul>, and the CTA is a <p class="cta"> whose heading is a plain
 * <h2>. Delimiting them is therefore a heuristic (localized heading -> next <h2>/<hr>), and a
 * heading phrased unusually enough to miss the marker set would put that block's legitimate «ви»
 * into the findings. As a hard gate that would fail correct text and burn repair budget; as a
 * warning it surfaces in the report and the panel and costs nothing. Promote to 'error' once the
 * false-positive rate has been measured on real generations.
 *
 * Complements, rather than overlaps, the KILLER_SPECS_HEADERS_C3D change: that removed the one
 * DETERMINISTIC second-person string («Ваша перевага», injected by table-finalize). This covers
 * the model-authored path.
 *
 * Pure function, no LLM.
 */

import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc, Subsection, Block } from '../domain/description-doc';
import { UK_LEFT_BOUNDARY, UK_RIGHT_BOUNDARY } from './terminology-normalize';
import { OPERATING_TIPS_H2_MARKERS, isCenter3dPrintStore } from '../prompt-core/constants';

/**
 * Second-person forms, Ukrainian and Russian. Both scripts share one pattern because the Cyrillic
 * character class covers ы/э/ъ as well as і/ї/є/ґ.
 *
 * DELIBERATELY CYRILLIC-ONLY. pl-PL and de-DE are out of scope: German "Sie"/"Ihr" are homographs
 * of the third-person "sie"/"ihr" that this voice uses constantly, and Polish Style B mandates the
 * impersonal "Należy …" form rather than a second-person pronoun, so there is little to detect and
 * much to false-positive on. Adding them would make the linter noisy without making it useful.
 */
const SECOND_PERSON_FORMS = [
  // pronouns (uk / ru)
  'ви', 'вы', 'вам', 'вас', 'вами',
  // possessive, shared forms
  'ваш', 'ваша', 'ваше', 'вашу', 'вашим', 'вашими', 'ваших',
  // possessive, uk-specific
  'ваші', 'вашого', 'вашому', 'вашій', 'вашою',
  // possessive, ru-specific
  'ваши', 'вашего', 'вашему', 'вашей', 'вашею',
];

/**
 * JS \b DOES NOT WORK HERE. It recognizes only [A-Za-z0-9_], so /\bви\b/ matches inside
 * ВИготовлення, ВИкористання, ВИсокий, ВИмоги, ВИтрати — a catastrophic false-positive rate on
 * exactly the vocabulary this content is made of. The Cyrillic lookarounds are imported from
 * terminology-normalize.ts, where the same mistake once corrupted shipped output.
 */
const SECOND_PERSON_RE = new RegExp(
  `${UK_LEFT_BOUNDARY}(${[...new Set(SECOND_PERSON_FORMS)].sort((a, b) => b.length - a.length).join('|')})${UK_RIGHT_BOUNDARY}`,
  'giu',
);

/** Locales this linter understands. Others return no issues rather than guessing. */
const CYRILLIC_LOCALES = ['uk-ua', 'ru-ua'];

/**
 * Concatenates the text of every top-level block OUTSIDE the two sanctioned zones.
 *
 * The tips block runs from its localized <h2> until the next <h2> or <hr>; <p class="cta"> is
 * dropped wherever it appears. The CTA's own <h2> is NOT exempted — the mandated "worth buying"
 * question form contains no second-person pronoun by construction, so a hit there is a real
 * finding rather than a slicing artifact.
 */
function textOutsideExemptBlocks(doc: Document): Array<{ tag: string; text: string }> {
  const kept: Array<{ tag: string; text: string }> = [];
  let inTipsBlock = false;

  for (const el of Array.from(doc.body.children)) {
    const tag = el.tagName.toLowerCase();

    if (tag === 'h2') {
      const heading = (el.textContent ?? '').trim().toLowerCase();
      inTipsBlock = OPERATING_TIPS_H2_MARKERS.some(m => heading.startsWith(m.toLowerCase()));
      if (inTipsBlock) continue;
    } else if (tag === 'hr') {
      inTipsBlock = false;
      continue;
    }

    if (inTipsBlock) continue;
    if (tag === 'p' && el.classList.contains('cta')) continue;

    const text = textWithSeparators(el).trim();
    if (text) kept.push({ tag, text });
  }

  return kept;
}

/**
 * Element text with a space between every child node.
 *
 * NOT Element.textContent, which concatenates siblings with no separator: two adjacent table
 * cells "Параметр" and "Ваша перевага" become "ПараметрВаша перевага", and the Cyrillic left
 * boundary then correctly refuses to match "Ваша" because a letter precedes it. The word would
 * be silently missed. Inserting separators restores the real word boundaries.
 */
function textWithSeparators(node: Node): string {
  if (node.nodeType === 3 /* TEXT_NODE */) return node.textContent ?? '';
  return Array.from(node.childNodes).map(textWithSeparators).join(' ');
}

/** A short excerpt around the hit, so an editor can judge it without opening the artifact. */
function excerpt(text: string, at: number, len: number): string {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + len + 40);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

/**
 * @param html      generated HTML for one locale
 * @param locale    BCP47 locale of this artifact; only uk-UA / ru-UA are analyzed
 * @param storeName gate — Style B is Center 3D Print's voice, not a global rule
 * @returns one 'tov-second-person-outside-scope' warning per distinct form found outside the
 *          operating-tips block and the CTA
 */
export function validateSecondPersonScope(
  html: string,
  locale: string,
  storeName: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim()) return issues;
  if (!isCenter3dPrintStore(storeName)) return issues;
  if (!CYRILLIC_LOCALES.includes(locale.toLowerCase())) return issues;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return issues; // DOMParser unavailable — skip, same guard style as specs-grounding.ts
  }

  const seen = new Set<string>();
  for (const { tag, text } of textOutsideExemptBlocks(doc)) {
    for (const match of text.matchAll(SECOND_PERSON_RE)) {
      const form = match[0].toLowerCase();
      if (seen.has(form)) continue;
      seen.add(form);
      issues.push({
        severity: 'warning',
        rule: 'tov-second-person-outside-scope',
        detail:
          `Direct second-person address ("${match[0]}") appears in a <${tag}> outside the ` +
          `operating-tips block and the CTA, where Style B requires an impersonal voice with the ` +
          `machine as the subject. Context: "${excerpt(text, match.index ?? 0, match[0].length)}". ` +
          `Rewrite it in the third person, or move the thought into the tips block if it is advice.`,
        context: `${locale} — Center 3D Print ToV`,
      });
    }
  }

  return issues;
}

/** One span of Doc-authored text, addressed by its JSON path — the Doc-side equivalent of the
 *  HTML walker's `{ tag, text }` pairs. */
interface DocTextSpan {
  path: string;
  text: string;
}

/** Text of a single Block, for scope-collection purposes only — figure/video carry no text. */
function blockSpans(block: Block, path: string): DocTextSpan[] {
  if (block.kind === 'paragraph') return [{ path, text: block.text }];
  if (block.kind === 'bullets') {
    return block.items.flatMap((item, i) => [
      { path: `${path}.items[${i}].lead`, text: item.lead },
      { path: `${path}.items[${i}].text`, text: item.text },
    ]);
  }
  return [];
}

function subsectionSpans(sub: Subsection, path: string): DocTextSpan[] {
  const spans: DocTextSpan[] = [{ path: `${path}.heading`, text: sub.heading }];
  sub.blocks.forEach((b, i) => spans.push(...blockSpans(b, `${path}.blocks[${i}]`)));
  sub.subsections?.forEach((s, i) => spans.push(...subsectionSpans(s, `${path}.subsections[${i}]`)));
  return spans;
}

/**
 * Every span of Doc-authored text OUTSIDE the two sanctioned zones — the Doc-side equivalent of
 * textOutsideExemptBlocks.
 *
 * operatingTips is EXCLUDED entirely (the tips-block exemption; unlike the HTML walker, there is
 * no heading-string heuristic to delimit it — the Doc model already segregates tips content into
 * its own optional field). cta.text is EXCLUDED (the CTA exemption); cta.heading is INCLUDED,
 * exactly as in the HTML sibling — "The CTA's own <h2> is NOT exempted" (see the module doc
 * above): the mandated "worth buying" question form contains no second-person pronoun by
 * construction, so a hit there is a real finding, not a slicing artifact.
 *
 * Reasonably broad on purpose, mirroring the HTML walker's own breadth (it scans every top-level
 * body element outside the two zones, including the killer-specs table and the §7 spec table) —
 * every prose-and-label-bearing field in the document, in document order.
 */
function collectScopedSpans(doc: ProductDescriptionDoc): DocTextSpan[] {
  const spans: DocTextSpan[] = [{ path: 'hook', text: doc.hook }];

  doc.killerSpecs.forEach((k, i) => {
    spans.push({ path: `killerSpecs[${i}].label`, text: k.label });
    spans.push({ path: `killerSpecs[${i}].value`, text: k.value });
    spans.push({ path: `killerSpecs[${i}].why`, text: k.why });
  });

  doc.keyBenefits.forEach((b, i) => spans.push(...blockSpans(b, `keyBenefits[${i}]`)));
  doc.functionality.forEach((s, i) => spans.push(...subsectionSpans(s, `functionality[${i}]`)));

  spans.push({ path: 'applications.heading', text: doc.applications.heading });
  (doc.applications.blocks ?? []).forEach((b, i) =>
    spans.push(...blockSpans(b, `applications.blocks[${i}]`)));
  doc.applications.items.forEach((it, i) => {
    spans.push({ path: `applications.items[${i}].scenario`, text: it.scenario });
    spans.push({ path: `applications.items[${i}].text`, text: it.text });
  });

  if (doc.compatibility) spans.push(...subsectionSpans(doc.compatibility, 'compatibility'));
  // operatingTips deliberately excluded — the exempt tips zone, see doc-comment above.

  if (doc.packageContents) {
    spans.push({ path: 'packageContents.heading', text: doc.packageContents.heading });
    doc.packageContents.items.forEach((item, i) =>
      spans.push({ path: `packageContents.items[${i}]`, text: item }));
  }

  spans.push({ path: 'specs.heading', text: doc.specs.heading });
  doc.specs.categories.forEach((cat, ci) => {
    spans.push({ path: `specs.categories[${ci}].title`, text: cat.title });
    cat.rows.forEach((row, ri) => {
      spans.push({ path: `specs.categories[${ci}].rows[${ri}].label`, text: row.label });
      const value = Array.isArray(row.value) ? row.value.join(' ') : row.value;
      spans.push({ path: `specs.categories[${ci}].rows[${ri}].value`, text: value });
    });
  });

  spans.push({ path: 'cta.heading', text: doc.cta.heading });
  // cta.text deliberately excluded — the exempt CTA zone.

  return spans;
}

/**
 * Doc-reading sibling of validateSecondPersonScope — reads Doc fields directly instead of parsing
 * an artifact's rendered HTML with DOMParser. Same store gate, same locale gate, same two
 * sanctioned zones (operating tips, CTA text).
 *
 * @param doc       the ProductDescriptionDoc under validation
 * @param locale    BCP47 locale of this artifact; only uk-UA / ru-UA are analyzed
 * @param storeName gate — Style B is Center 3D Print's voice, not a global rule
 * @returns one 'tov-second-person-outside-scope' warning per distinct form found outside the
 *          operating-tips block and the CTA, addressed by its JSON path
 */
export function validateSecondPersonScopeDoc(
  doc: ProductDescriptionDoc,
  locale: string,
  storeName: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isCenter3dPrintStore(storeName)) return issues;
  if (!CYRILLIC_LOCALES.includes(locale.toLowerCase())) return issues;

  const seen = new Set<string>();
  for (const { path, text } of collectScopedSpans(doc)) {
    if (!text?.trim()) continue;
    for (const match of text.matchAll(SECOND_PERSON_RE)) {
      const form = match[0].toLowerCase();
      if (seen.has(form)) continue;
      seen.add(form);
      issues.push({
        severity: 'warning',
        rule: 'tov-second-person-outside-scope',
        detail:
          `Direct second-person address ("${match[0]}") appears at ${path}, outside the ` +
          `operating-tips block and the CTA, where Style B requires an impersonal voice with the ` +
          `machine as the subject. Context: "${excerpt(text, match.index ?? 0, match[0].length)}". ` +
          `Rewrite it in the third person, or move the thought into the tips block if it is advice.`,
        context: `${locale} — Center 3D Print ToV`,
        path,
      });
    }
  }

  return issues;
}
