/**
 * simplified-template-blocks.ts
 *
 * Prompt text for the three simplified content templates (US-2.2): the Doc-pipeline task
 * instruction, the legacy HTML overlay and the translation clause.
 *
 * WHY A SIBLING FILE. `task-a.ts` and `task-c.ts` are FROZEN (AGENTS.md §9). They gain one import
 * and one call each; every word of template text lives here, so a frozen-file diff stays minimal
 * and the text cannot drift between the two paths. Paragraph sets, word ranges and the soft ceiling
 * all come from `simplified-templates.ts`, the single source of truth.
 *
 * NUMBERING follows the Story: §1 hook, §2 killer specs + key benefits, §3 functionality,
 * §4 applications, §5 compatibility, §6 package contents, §7 specifications, §8 CTA, §9 FAQ.
 *
 * OD-8: where the v4 master text conflicts with the Story's decisions (the Accessories checkbox, the
 * single flat §7 table, the data-conditional §5 and §7), these blocks follow the Story.
 *
 * CACHING (NFR-1). `buildSimplifiedDocInstruction` is a FIXED string per template (three stable
 * variants, each cacheable). Everything that varies per run (empty specs, the Accessories checkbox)
 * is emitted by `buildSimplifiedRunFacts` into the uncached user turn, never into a system block.
 *
 * A polarity convention the tests rely on: a clause that names an excluded paragraph is negated
 * ("omit", "do not"), and a clause that mixes polarity uses ONE § number.
 */
import {
  V4_WORD_RANGES, NARRATIVE_SOFT_CEILING, BLOCK2_MAX_ITEMS, paragraphsFor,
  type SimplifiedTemplateId,
} from '../prompt-core/simplified-templates';

export interface SimplifiedRunOptions {
  /** Accessories only: the "Include Functionality (§3)" checkbox. Ignored for every other template. */
  includeFunctionality?: boolean;
  /** Whether the run has non-empty source specifications. */
  hasSpecs: boolean;
}

const TITLES: Record<SimplifiedTemplateId, string> = {
  'filaments-resins-powders': 'FILAMENTS, RESINS AND POWDERS',
  accessories: 'ACCESSORIES',
  'spare-parts': 'SPARE PARTS',
};

const range = (r: { min: number; max: number }): string => `${r.min}–${r.max}`;

/** Paragraph numbers whose prose counts toward the soft narrative ceiling (Story D8). */
const NARRATIVE = [1, 2, 4, 5, 8];

function listNumbers(nums: number[]): string {
  const parts = nums.map(n => `§${n}`);
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Excluded paragraph numbers for a template, whatever the Accessories checkbox says. */
function excludedFor(id: SimplifiedTemplateId): number[] {
  const everPresent = new Set([...paragraphsFor(id, { includeFunctionality: false }), ...paragraphsFor(id, { includeFunctionality: true })]);
  return [2, 3, 4, 6, 7, 9].filter(n => !everPresent.has(n));
}

function ceilingClause(id: SimplifiedTemplateId): string {
  const nums = paragraphsFor(id, { includeFunctionality: false }).filter(n => NARRATIVE.includes(n));
  return (
    `SOFT NARRATIVE CEILING: aim for at most ${NARRATIVE_SOFT_CEILING} characters of narrative text, meaning the prose of ` +
    `${listNumbers(nums)} with tags stripped. The specs table, every tag, figcaption and alt text do not count toward it. ` +
    `The word ranges above take absolute priority over this ceiling: when the two conflict, exceed ${NARRATIVE_SOFT_CEILING} ` +
    `characters rather than break a range.`
  );
}

/** The word-range lines of the paragraphs a template contains (the Accessories §3 has no range). */
function rangeLines(id: SimplifiedTemplateId): string[] {
  const has = new Set(paragraphsFor(id, { includeFunctionality: true }));
  const lines = [`- §1 hook: ${range(V4_WORD_RANGES.hook)} words.`];
  if (has.has(2)) {
    lines.push(`- §2 killer specs and key benefits, counted together: ${range(V4_WORD_RANGES.block2)} words, at most ${BLOCK2_MAX_ITEMS} list items.`);
  }
  if (has.has(3)) lines.push('- Functionality has no word limit; write what the product needs.');
  if (has.has(4)) lines.push(`- §4 applications: ${range(V4_WORD_RANGES.applications)} words, 4–8 entries.`);
  if (has.has(5)) lines.push(`- §5 compatibility: ${range(V4_WORD_RANGES.compatibility)} words.`);
  lines.push(`- §8 CTA: ${range(V4_WORD_RANGES.cta)} words.`);
  return lines;
}

/** A shared shape-independent sentence set for the range block. */
function rangesBlock(id: SimplifiedTemplateId): string {
  return `WORD RANGES — strict, checked after generation; every paragraph you emit must fall inside its range, minimum and maximum:
${rangeLines(id).join('\n')}

${ceilingClause(id)}`;
}

// ---------------------------------------------------------------------------------------------
// Doc pipeline
// ---------------------------------------------------------------------------------------------

/** Generic Doc-contract text shared by every simplified template. Mirrors TASK_A_DOC_INSTRUCTION. */
const DOC_CONTRACT_HEAD = `THIS BLOCK SUPERSEDES [FORMAT] IN THE SYSTEM PROMPT. Ignore "Emit HTML only": emit NO HTML
document, NO Markdown and no code fences. Emit ONE JSON object and nothing else — no prose before
or after it. The [CONTENT STRUCTURE] rules about WHAT a paragraph contains still apply to the
paragraphs listed below; only the serialization changes. The renderer builds the HTML from this
object, so structure you would have expressed with tags is expressed with fields instead.

THIS IS A SIMPLIFIED TEMPLATE: it replaces the full nine-paragraph structure. Produce ONLY the
paragraphs in the SHAPE below. Any paragraph the shape does not list is left out entirely: no key,
no heading, no placeholder and no filler text.`;

const DOC_BLOCK_DEFINITIONS = `Block is one of:
  { "kind": "paragraph", "text": "" }
  { "kind": "bullets",   "items": [ { "lead": "", "text": "" } ] }   // 3–8 items
  { "kind": "figure",    "ref": 0 }                                  // index into "figures"
  { "kind": "video",     "ref": 0 }                                  // index into "videos"

Subsection is: { "heading": "", "blocks": [ <Block> ], "subsections": [ <Subsection> ] }
NESTING IS CAPPED AT TWO LEVELS — a nested subsection has "heading" and "blocks" only and may NOT
carry its own "subsections". A subsection must have at least one block OR at least one nested
subsection; it may have empty "blocks" when its whole content is its sub-headings.`;

const DOC_MEDIA_AND_PROSE_RULES = `HARD RULES:
- FIGURES AND VIDEOS ARE REFERENCED BY INDEX, never embedded. "file" is the FILENAME ONLY
  (e.g. "laser-module.jpg") — no folders, no URL, no domain; the renderer builds the src.
  "src" for a video is the full embed URL, copied VERBATIM from the manifest.
- Every entry in "figures" and in "videos" must be referenced exactly once by a block — no entry
  unused, none referenced twice. Place every figure and every video block inside a paragraph this
  shape lists, and every figure block immediately after a paragraph block that introduces it.
- WHEN THERE IS NO VIDEO CONTENT (no [VIDEO MANIFEST] section below), you MUST still emit
  "videos": [] — an empty array. Do NOT omit the "videos" key and do NOT write "videos": null.
- PROSE FIELDS ADMIT <b> and <strong> AND NOTHING ELSE. No <p>, <ul>, <a>, <em>, no entities, no
  Markdown. Reserve <strong> for brands / main model / core USPs; use <b> for inline scannability.
  The prose fields are exactly: "hook", "why", every Block "text", "items[].text", every "caption".
- PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL — not even <b>, and no Markdown "**".
  They are: every "heading", "title", "label", "value", "scenario", "alt", "lead", "localizedName".
  Writing "<b>Транспортування:</b>" into a "lead" does NOT produce bold text — the renderer already
  wraps that field in <b>, so your tags are escaped and the reader sees the angle brackets
  themselves. Put the plain words there and the renderer applies the formatting.
- A bullet's "lead" carries its own trailing punctuation and spacing; the renderer adds none.
  It joins them as <b>{lead}</b>{text} with nothing in between, so if "lead" ends with a letter or
  digit AND "text" begins with one, the two words collide: "Топографічне зніманняДальність".
  End the "lead" with ":" or ". ", or begin the "text" with a space.
- Do not invent a "section", "hr", "h2" or any other structural field. Section order, headings
  level, tables, <hr> and figure markup are the renderer's job, not yours.
- A "bullets" Block MUST have at least 3 items. If you cannot provide at least 3 genuinely
  distinct sub-points for a topic, use a "paragraph" Block instead — never emit a "bullets" Block
  with fewer than 3 items.`;

function shapeLines(id: SimplifiedTemplateId): string[] {
  const has = new Set(paragraphsFor(id, { includeFunctionality: true }));
  const lines = [
    '  "schemaVersion": "4.0",',
    '  "locale": "<BCP47 of the base language, e.g. uk-UA>",',
    '  "localizedName": "<product name as it should read in this language>",',
    '  "hook": "<one paragraph>",                                          // §1',
  ];
  if (has.has(2)) {
    lines.push(
      '  "killerSpecs": [ { "label": "", "value": "", "why": "" } ],        // §2 — 3–4 entries',
      '  "keyBenefits": [ <"bullets" Block ONLY> ],                         // §2 — at least 1; each "bullets" Block 3–8 items',
    );
  }
  if (has.has(3)) {
    lines.push('  "functionality": [ <Subsection> ],                                 // omit unless the per-run facts ask for §3');
  }
  if (has.has(4)) {
    lines.push(
      '  "applications": {                                                  // §4',
      '    "heading": "",',
      '    "blocks": [ <Block: paragraph or figure ONLY> ],                 // optional lead-in',
      '    "items": [ { "scenario": "", "text": "" } ]                      // 4–8 entries',
      '  },',
    );
  }
  if (has.has(5)) {
    lines.push('  "compatibility": <Subsection>,                                     // §5 — emit only if the source carries compatibility data');
  }
  if (has.has(7)) {
    lines.push(
      '  "specs": {                                                         // §7 — exactly one category',
      '    "heading": "",',
      '    "categories": [ { "title": "", "rows": [ { "label": "", "value": "" } ] } ]',
      '  },',
    );
  }
  lines.push(
    '  "cta": { "heading": "", "text": "" },                              // §8',
    '  "figures": [ { "file": "", "alt": "", "caption": "" } ],',
    '  "videos": [ { "src": "", "title": "", "caption": "" } ]',
  );
  return lines;
}

function paragraphRules(id: SimplifiedTemplateId): string {
  const has = new Set(paragraphsFor(id, { includeFunctionality: true }));
  const out: string[] = [];

  if (has.has(2)) {
    out.push(`§2 — ONE HEADING OVER ONE MERGED LIST:
- The §2 list renders under a single heading and one bulleted list. It carries a table, a paragraph, a figure or a video embed in no case.
- "keyBenefits" therefore admits "bullets" Blocks ONLY.
- The renderer merges "killerSpecs" and the "keyBenefits" items into ONE list, killer specs first. Their COMBINED total is at most ${BLOCK2_MAX_ITEMS} items. Count both collections together before you write.
- Do not write a heading for §2. The heading is fixed in code for each locale, and any heading you emit for it is discarded.
- "value" in a killer spec is always a plain string, never an array — comma-join it when it names more than one item.`);
  }
  if (has.has(3)) {
    out.push(`FUNCTIONALITY:
- Omit §3 unless the per-run facts ask for it. When they do, write one H2 per functional group, expressed as what the product DOES.
- Open "subsections" (H3) only when a group genuinely has 2 or more distinct sub-functions; one lone H3 under a heading is rejected.
- Each block adds a NEW aspect; do not restate a characteristic already covered elsewhere.`);
  }
  if (has.has(4)) {
    out.push(`§4 APPLICATIONS: "heading", an optional lead-in in "blocks" (paragraph or figure only) and 4–8 "items", each a scenario label plus its text.`);
  }
  if (has.has(5)) {
    out.push(`§5 COMPATIBILITY: emit "compatibility" only if the source genuinely carries compatibility data. Otherwise omit the key entirely. Never invent it.`);
  }
  if (has.has(7)) {
    out.push(`§7 SPECIFICATIONS is one flat table: "specs" has exactly one category in "categories", whose "rows" hold every parameter of the source.
The renderer emits a single <tbody> with no <h3> sub-heading and no category title, so do not split the parameters across several categories, and do not try to group them.
"value" in a spec row ("specs.categories[].rows[].value") is ALWAYS a single plain string. Never a list, never an empty value. When a parameter has several values, comma-join them into that one string and keep them in ONE row. Never change a value or a unit; keep a space between a number and its unit ("1.75 mm").
The §7 rows come from the source specifications only. When the per-run facts say there are none, omit "specs" entirely.`);
  }
  out.push(`§8 CTA: "cta" is one paragraph of commercial closing text. Write "cta.text" only — the heading is assembled in code from a per-locale template, so whatever you put in "cta.heading" is discarded. This paragraph is the commercial closing, not an FAQ: the FAQ is a separate artifact.`);
  return out.join('\n\n');
}

/**
 * The task instruction for `systemBlocks[1]` on the Doc path: a fixed string per template.
 * The Accessories checkbox is NOT read here (it would fork the cache); see `buildSimplifiedRunFacts`.
 */
export function buildSimplifiedDocInstruction(id: SimplifiedTemplateId): string {
  const excluded = excludedFor(id);
  return `TASK A — GENERATE THE BASE-LANGUAGE DESCRIPTION AS A ProductDescriptionDoc (JSON) — ${TITLES[id]} TEMPLATE

${DOC_CONTRACT_HEAD}

SHAPE — emit exactly these keys:

{
${shapeLines(id).join('\n')}
}

EXCLUDED — do not emit ${listNumbers(excluded)} content, and omit their keys entirely.

${DOC_BLOCK_DEFINITIONS}

${DOC_MEDIA_AND_PROSE_RULES}

${paragraphRules(id)}

${rangesBlock(id)}`;
}

/**
 * The per-run facts appended to the uncached user turn on the Doc path (never a cached block):
 * empty specs, the Accessories checkbox, and the data-conditional §5. Only the Accessories template
 * reads `includeFunctionality`; a stale `true` for any other template is ignored.
 */
export function buildSimplifiedRunFacts(id: SimplifiedTemplateId, opts: SimplifiedRunOptions): string {
  const has = new Set(paragraphsFor(id, { includeFunctionality: true }));
  const lines: string[] = [];
  if (id === 'accessories') {
    lines.push(opts.includeFunctionality === true
      ? 'Emit §3 functionality for this run: the Include Functionality checkbox is set.'
      : 'Omit §3 for this run: the Include Functionality checkbox is not set.');
  }
  if (has.has(5)) {
    lines.push('Emit §5 only if the source carries compatibility data. Otherwise omit the key.');
  }
  if (has.has(7) && !opts.hasSpecs) {
    lines.push('Omit §7 for this run: no source specifications were provided.');
  }
  return `[TEMPLATE FACTS — ${TITLES[id]}]\n${lines.map(l => `- ${l}`).join('\n')}`;
}

// ---------------------------------------------------------------------------------------------
// Legacy HTML path (Expert-3DPrinter)
// ---------------------------------------------------------------------------------------------

/**
 * The template overlay for the legacy HTML path, appended to `userContent` by the frozen
 * `buildPromptA` so `systemBlocks` (and prompt caching) stay untouched (plan D2, R5).
 */
export function buildSimplifiedHtmlOverlay(id: SimplifiedTemplateId, opts: SimplifiedRunOptions): string {
  const has = new Set(paragraphsFor(id, { includeFunctionality: opts.includeFunctionality === true }));
  const excluded = excludedFor(id);
  const parts: string[] = [
    `[TEMPLATE — ${TITLES[id]}]`,
    'This simplified template REPLACES the full nine-paragraph structure. Produce ONLY these paragraphs, in this order, and nothing else:',
    `- §1 hook: ${range(V4_WORD_RANGES.hook)} words.`,
  ];
  if (has.has(2)) parts.push(`- §2 killer specs and key benefits as one heading over one list, counted together: ${range(V4_WORD_RANGES.block2)} words, at most ${BLOCK2_MAX_ITEMS} list items.`);
  if (has.has(3)) parts.push('- §3 functionality: write what the product needs, at whatever length.');
  if (has.has(4)) parts.push(`- §4 applications: ${range(V4_WORD_RANGES.applications)} words, 4–8 items.`);
  if (has.has(5)) parts.push(`- §5 compatibility: ${range(V4_WORD_RANGES.compatibility)} words. Emit §5 only if the source carries compatibility data.`);
  if (has.has(7)) {
    parts.push(opts.hasSpecs
      ? '- §7 specifications as one flat table holding every parameter row. Use exactly one category and a single <tbody>; add no <h3> sub-heading and no category title row. Keep every value and unit unchanged.'
      : '- Omit §7: no source specifications were provided.');
  }
  parts.push(`- §8 CTA: ${range(V4_WORD_RANGES.cta)} words.`);
  parts.push('');
  parts.push(`Do not emit ${listNumbers(excluded)} content.`);
  if (id === 'accessories' && opts.includeFunctionality !== true) {
    parts.push('Omit §3: the Include Functionality checkbox is not set.');
  }
  parts.push('');
  parts.push(ceilingClause(id));
  return parts.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Translation (FR-19)
// ---------------------------------------------------------------------------------------------

/**
 * Appended to a translation prompt for a simplified template. The translator works from whatever
 * the master holds, so it must neither re-add an omitted paragraph nor enforce a length limit
 * (the ranges and the ceiling apply to the uk-UA master only, OD-4).
 */
export const SIMPLIFIED_TRANSLATION_CLAUSE = `[SIMPLIFIED TEMPLATE — TRANSLATE WHAT IS PRESENT]
The source comes from a simplified content template, so some paragraphs were omitted on purpose.
- Translate only the fields and paragraphs that are present in the source.
- Do not add, re-add, restore or expand any paragraph the source omitted; an omitted paragraph stays absent in the translation.
- Apply no word-count or character limits: translate the full text faithfully, at whatever length it has.`;
