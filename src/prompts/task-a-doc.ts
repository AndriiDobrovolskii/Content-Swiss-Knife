/**
 * task-a-doc.ts
 *
 * Task A, emitting a ProductDescriptionDoc (JSON) instead of HTML.
 *
 * WHY THIS EXISTS. Two gates prove `renderDescription()` is correct — reconciliation against real
 * artifacts, and rule-conformance across all 8 stores. Neither proves the other half of the
 * pipeline: nothing has ever asked a MODEL to produce a Doc. Until one does reliably, switching
 * production to the renderer is unproven at its most important joint, and the failure would land on
 * every store at once. This variant makes that question answerable on one product first.
 *
 * WHY A SEPARATE FILE RATHER THAN A FLAG IN task-a.ts. That file is FROZEN (CLAUDE.md). This module
 * is purely additive: it calls the frozen builder and swaps ONLY the task-instruction block, so
 * every input rule that builder encodes — image manifest, video manifest, template hint, ToV
 * overlays, consumables mode, the Style B third block — is inherited rather than reimplemented, and
 * cannot drift from it. Nothing frozen is edited or copied.
 *
 * WIRED INTO PRODUCTION FOR THE DOC-PIPELINE STORES. The orchestrator calls this builder for the
 * stores `doc-pipeline-flag.ts` enrols, and the renderer produces their HTML from the object it
 * returns; the remaining stores still go through buildPromptA and the HTML path. (This header said
 * "NOT WIRED INTO PRODUCTION" until US-2.1; that was stale, and the [FORMAT] override below is
 * precisely what lets the Doc path coexist with a master prompt that mandates HTML.)
 */
import { buildPromptA } from './task-a';
import type { PromptPayload } from '../prompt-core/payload';
import type { HookPattern } from '../prompt-core/hook-pattern';
import type { ProductInput } from '../app/types';
import { isSimplifiedTemplateId } from '../prompt-core/simplified-templates';
import { buildSimplifiedDocInstruction, buildSimplifiedRunFacts } from './simplified-template-blocks';

/**
 * The output contract, replacing TASK_A_INSTRUCTION's "pure HTML body only".
 *
 * It has to OVERRULE the master system prompt rather than merely differ from it: [FORMAT] there
 * says "Emit HTML only", and that block is cached ahead of this one. The override is stated in the
 * first line so it cannot be missed.
 *
 * Every numeric bound below mirrors ProductDescriptionDocSchema. Omitting one does not make the
 * model freer — it makes the generation fail validation late, after the tokens are spent.
 */
export const TASK_A_DOC_INSTRUCTION =
  `TASK A — GENERATE THE BASE-LANGUAGE DESCRIPTION AS A ProductDescriptionDoc (JSON)

THIS BLOCK SUPERSEDES [FORMAT] IN THE SYSTEM PROMPT. Ignore "Emit HTML only": emit NO HTML
document, NO Markdown and no code fences. Emit ONE JSON object and nothing else — no prose before
or after it. Every [CONTENT STRUCTURE] rule about WHAT each section contains still applies; only
the serialization changes. The renderer builds the HTML from this object, so structure you would
have expressed with tags is expressed with fields instead.

SHAPE — emit exactly these keys:

{
  "schemaVersion": "4.0",
  "locale": "<BCP47 of the base language, e.g. uk-UA>",
  "localizedName": "<product name as it should read in this language>",
  "hook": "<§1, one paragraph>",
  "killerSpecs": [ { "label": "", "value": "", "why": "" } ],        // §2 — 3–4 entries
  "keyBenefits": [ <"bullets" Block ONLY> ],  // §2 — at least 1; each "bullets" Block 3–8 items
  "functionality": [ <Subsection> ],                                 // §3 — at least 1
  "applications": {                                                  // §4
    "heading": "",
    "blocks": [ <Block: paragraph or figure ONLY> ],                 // optional lead-in
    "items": [ { "scenario": "", "text": "" } ]                      // 4–8 entries
  },
  "compatibility": <Subsection>,                                     // §5 — omit when absent
  "packageContents": { "heading": "", "items": ["", ""] },           // §6 — omit when absent
  "specs": {                                                         // §7
    "heading": "",
    "categories": [ { "title": "", "rows": [ { "label": "", "value": "" } ] } ]
  },
  "cta": { "heading": "", "text": "" },                              // §9
  "figures": [ { "file": "", "alt": "", "caption": "" } ],
  "videos": [ { "src": "", "title": "", "caption": "" } ]
}

Block is one of:
  { "kind": "paragraph", "text": "" }
  { "kind": "bullets",   "items": [ { "lead": "", "text": "" } ] }   // 3–8 items
  { "kind": "figure",    "ref": 0 }                                  // index into "figures"
  { "kind": "video",     "ref": 0 }                                  // index into "videos"

Subsection is: { "heading": "", "blocks": [ <Block> ], "subsections": [ <Subsection> ] }
NESTING IS CAPPED AT TWO LEVELS — a nested subsection has "heading" and "blocks" only and may NOT
carry its own "subsections". A subsection must have at least one block OR at least one nested
subsection; it may have empty "blocks" when its whole content is its sub-headings.

HARD RULES:
- FIGURES AND VIDEOS ARE REFERENCED BY INDEX, never embedded. "file" is the FILENAME ONLY
  (e.g. "laser-module.jpg") — no folders, no URL, no domain; the renderer builds the src.
  "src" for a video is the full embed URL, copied VERBATIM from the manifest.
- Every entry in "figures" and in "videos" must be referenced exactly once by a block — no entry
  unused, none referenced twice.
- WHEN THERE IS NO VIDEO CONTENT (no [VIDEO MANIFEST] section below), you MUST still emit
  "videos": [] — an empty array. Do NOT omit the "videos" key and do NOT write "videos": null.
- PROSE FIELDS ADMIT <b> and <strong> AND NOTHING ELSE. No <p>, <ul>, <a>, <em>, no entities, no
  Markdown. Reserve <strong> for brands / main model / core USPs; use <b> for inline scannability.
  The prose fields are exactly: "hook", "why", every Block "text", "items[].text", every "caption".
- PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL — not even <b>, and no Markdown "**".
  They are: every "heading", "title", "label", "value", "scenario", "alt", "lead",
  "localizedName", and "packageContents.items".
  Writing "<b>Транспортування:</b>" into a "lead" does NOT produce bold text — the renderer already
  wraps that field in <b>, so your tags are escaped and the reader sees the angle brackets
  themselves. Put the plain words there and the renderer applies the formatting.
- "value" in a §7 SPEC ROW ("specs.categories[].rows[].value") is ALWAYS a single plain string.
  Never a list, never an empty value. When a parameter genuinely has several values, comma-join
  them into that one string and keep them in ONE row — e.g. "PA 12, PA 11, PA 12 GB". Do not split
  one parameter across several rows to avoid joining, and do not nest a list inside the cell.
  "value" in a §2 KILLER SPEC ("killerSpecs[].value") is always a plain string, never an array —
  comma-join it when it names more than one item (e.g. "Large Tumbler Basket, Liner Kit").
- A bullet's "lead" carries its own trailing punctuation and spacing; the renderer adds none.
  It joins them as <b>{lead}</b>{text} with nothing in between, so if "lead" ends with a letter or
  digit AND "text" begins with one, the two words collide: "Топографічне зніманняДальність".
  End the "lead" with ":" or ". ", or begin the "text" with a space.
- Do not invent a "section", "hr", "h2" or any other structural field. Section order, headings
  level, tables, <hr> and figure markup are the renderer's job, not yours.
- A "bullets" Block MUST have at least 3 items. If you cannot provide at least 3 genuinely
  distinct sub-points for a topic, use a "paragraph" Block instead — never emit a "bullets" Block
  with fewer than 3 items.

§2 — ONE HEADING OVER ONE MERGED LIST:
- §2 renders as a single heading and a single bulleted list. It carries NO table, no paragraph, no
  figure and no video embed — mobile-first reading, so nothing wide and nothing interrupting.
- "keyBenefits" therefore admits "bullets" Blocks ONLY. A paragraph, figure or video Block here is
  rejected; move that content to §3 functionality or §4 applications.
- The renderer merges "killerSpecs" and the "keyBenefits" items into ONE list, killer specs first.
  Their COMBINED total is at most 8 items, with 6 as the v4 target. Count both collections
  together before you write: 4 killer specs plus 5 benefits is 9 and will be rejected.
- Do not write a heading for §2. The heading is fixed in code for each locale, and any heading you
  emit for it is discarded.

§3 FUNCTIONALITY IS MANDATORY — it is always emitted, for every product:
- One H2 per functional group, expressed as what the product DOES.
- Open "subsections" (H3) only when a group genuinely has 2 or more distinct sub-functions. A
  group with a single sub-function carries its content in its own "blocks" and emits no
  subsections at all — one lone H3 under a heading is rejected.
- §3 has no word limit in any locale — write what the product actually needs.
- Each block must add a NEW aspect. Do not restate, paraphrase or duplicate a characteristic
  already covered by another block or by §2; every paragraph is at least two sentences.
- A video embed belongs in §3, before §7 — that is its destination whenever the source supplies
  one, since §2 admits none and §4 takes no video.

§5, §6 AND §9:
- "compatibility" (§5) and "packageContents" (§6) are emitted ONLY when the source genuinely
  carries that data. Omit the key entirely when it does not — never invent either section.
- "packageContents.heading" must be EXACTLY one of the two strings fixed for the document's
  locale: for uk-UA, "Що в коробці?" for a single product, or "Що входить до набору?" for a set.
  Choose by what the product actually is; any other wording is rejected.
- "cta" (§9) is one paragraph of commercial closing text under the localized commercial heading.
  Write the "cta.text" only — the heading is assembled in code from a per-locale template, so
  whatever you put in "cta.heading" is discarded.

FIGURE PLACEMENT — no orphan images: every figure Block is immediately preceded by a paragraph
Block that introduces what the image shows. A figure moved out of §2 carries that obligation with
it, so place the lead-in paragraph beside it in its new section rather than leaving it behind.

WORD VOLUMES — writing targets that shape the draft. They are guidance for length, nothing more:
- §1 hook: 40–85 words.
- §2 merged list: 90–300 words.
- §4 applications: 80–250 words.
- §9 CTA: 50–100 words.`;

/**
 * Task A returning a Doc contract instead of an HTML one.
 *
 * Delegates to the frozen builder and replaces `systemBlocks[1]` — the task instruction — leaving
 * `[0]` (master) and any trailing store overlay untouched. Index 1 is the task block by the
 * PromptPayload convention documented in payload.ts, and the spec asserts the surrounding blocks
 * survive so a change to that layout fails loudly rather than silently dropping a store's voice.
 *
 * US-2.2 — a simplified content template (`filaments-resins-powders`, `accessories`, `spare-parts`)
 * swaps in a per-template task instruction (a fixed string per template, so it stays cacheable) and
 * appends the per-run facts (empty specs, the Accessories checkbox, the conditional §5) to the
 * UNCACHED userContent. The frozen base is called with `templateId: undefined` so its legacy
 * `[TEMPLATE]` hint never double-instructs the Doc path. With no template (Full description, an
 * empty, unknown or stale id) the output is byte-identical to what it was before the Story.
 */
export function buildPromptADoc(
  input: ProductInput,
  baseLanguageOverride?: string,
  hookPattern?: HookPattern,
): PromptPayload {
  const templateId = isSimplifiedTemplateId(input.templateId) ? input.templateId : undefined;
  const base = buildPromptA(templateId ? { ...input, templateId: undefined } : input, baseLanguageOverride);
  const taskInstruction = templateId ? buildSimplifiedDocInstruction(templateId) : TASK_A_DOC_INSTRUCTION;
  const runFacts = templateId
    ? buildSimplifiedRunFacts(templateId, {
        includeFunctionality: input.includeFunctionality,
        hasSpecs: Boolean(input.specs?.trim()),
      })
    : '';
  const userBase = templateId ? `${base.userContent}\n\n${runFacts}` : base.userContent;
  return {
    systemBlocks: base.systemBlocks.map((block, i) =>
      i === 1 ? { text: taskInstruction, cache: true } : block,
    ),
    // The FR-14 hook pattern rides in userContent and NOWHERE else. payload.ts documents this as
    // the one block that is dynamic and never cached, which is exactly what a per-product value
    // needs: putting it in a cached systemBlock would pin one pattern across every product sharing
    // the cache prefix — the same failure mode as a constant selector (NFR-1, D11).
    //
    // APPENDED, never rewritten: the inherited base.userContent is preserved byte-for-byte as the
    // prefix, so everything the frozen builder assembled still reaches the model unchanged.
    //
    // The parameter is OPTIONAL by constraint C-2, not by preference. buildPromptADoc has two
    // existing two-argument call sites, and T8 is a separate task on a different track; a required
    // parameter here would break the build between the two commits.
    userContent: hookPattern
      ? `${userBase}\n\n[§1 HOOK PATTERN]\n${hookPattern.instruction}`
      : userBase,
  };
}
