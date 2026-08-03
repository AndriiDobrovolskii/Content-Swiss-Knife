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
 * NOT WIRED INTO PRODUCTION. The orchestrator still calls buildPromptA and still emits HTML.
 * Switching it over is a separate, explicitly-approved decision that also requires rewriting the
 * frozen prompts, because [FORMAT] in the master system prompt mandates HTML.
 */
import { buildPromptA } from './task-a';
// Interpolated into the instruction rather than retyped. It is the SINGLE SOURCE OF TRUTH for
// detecting the §5b block downstream — tov-second-person.ts:78 exempts that block from the
// second-person rule only when the heading starts with one of these — so a hand-copied string here
// would drift and silently un-exempt the block, flagging the imperative prose it mandates.
import { OPERATING_TIPS_H2_MARKERS } from '../prompt-core/constants';
import type { PromptPayload } from '../prompt-core/payload';
import type { ProductInput } from '../app/types';

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
  "schemaVersion": "3.0",
  "locale": "<BCP47 of the base language, e.g. uk-UA>",
  "localizedName": "<product name as it should read in this language>",
  "hook": "<§1, one paragraph>",
  "killerSpecs": [ { "label": "", "value": "", "why": "" } ],        // §2a — 3–4 entries
  "keyBenefits": [ <Block> ],                                        // §2b — at least 1
  "functionality": [ <Subsection> ],                                 // §3 — at least 1
  "applications": {                                                  // §4
    "heading": "",
    "blocks": [ <Block: paragraph or figure ONLY> ],                 // optional lead-in
    "items": [ { "scenario": "", "text": "" } ]                      // 4–8 entries
  },
  "compatibility": <Subsection>,                                     // §5 — omit when absent
  "operatingTips": <Subsection>,                                     // §5b — Center 3D Print only
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
- PROSE FIELDS ADMIT <b> and <strong> AND NOTHING ELSE. No <p>, <ul>, <a>, <em>, no entities, no
  Markdown. Reserve <strong> for brands / main model / core USPs; use <b> for inline scannability.
  The prose fields are exactly: "hook", "why", every Block "text", "items[].text", every "caption".
- PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL — not even <b>, and no Markdown "**".
  They are: every "heading", "title", "label", "value", "scenario", "alt", "lead",
  "localizedName", and "packageContents.items".
  Writing "<b>Транспортування:</b>" into a "lead" does NOT produce bold text — the renderer already
  wraps that field in <b>, so your tags are escaped and the reader sees the angle brackets
  themselves. Put the plain words there and the renderer applies the formatting.
- "value" in a spec row is a string, or an array of strings when the parameter genuinely has
  several values. Never an empty array.
- A bullet's "lead" carries its own trailing punctuation and spacing; the renderer adds none.
  It joins them as <b>{lead}</b>{text} with nothing in between, so if "lead" ends with a letter or
  digit AND "text" begins with one, the two words collide: "Топографічне зніманняДальність".
  End the "lead" with ":" or ". ", or begin the "text" with a space.
- Do not invent a "section", "hr", "h2" or any other structural field. Section order, headings
  level, tables, <hr> and figure markup are the renderer's job, not yours.
- IF YOUR STORE GUIDELINES ASK FOR AN H2 that this schema has no field for — most often
  "${OPERATING_TIPS_H2_MARKERS[0]}" — DO NOT emit an HTML tag and do not skip the content.
  Put that section into "operatingTips" as a Subsection. The renderer emits the <h2> for you and
  places it immediately before the commercial-closing section, which is what those guidelines ask
  for. Its "heading" MUST BE the exact wording your guidelines give for this language — one of:
  ${OPERATING_TIPS_H2_MARKERS.join(' | ')}. Do NOT append the product name: per [HEADING FORM]
  this heading carries none.
  A heading that only paraphrases those words is not recognised as this block downstream.
  Keep the guidelines' own condition: include it only for production hardware with real
  handling/safety considerations, and omit "operatingTips" entirely otherwise.`;

/**
 * Task A returning a Doc contract instead of an HTML one.
 *
 * Delegates to the frozen builder and replaces `systemBlocks[1]` — the task instruction — leaving
 * `[0]` (master) and any trailing store overlay untouched. Index 1 is the task block by the
 * PromptPayload convention documented in payload.ts, and the spec asserts the surrounding blocks
 * survive so a change to that layout fails loudly rather than silently dropping a store's voice.
 */
export function buildPromptADoc(input: ProductInput, baseLanguageOverride?: string): PromptPayload {
  const base = buildPromptA(input, baseLanguageOverride);
  return {
    systemBlocks: base.systemBlocks.map((block, i) =>
      i === 1 ? { text: TASK_A_DOC_INSTRUCTION, cache: true } : block,
    ),
    userContent: base.userContent,
  };
}
