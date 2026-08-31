/**
 * task-a-consumables-doc.ts
 *
 * Task A for consumables (§C1–§C6), emitting a ConsumablesDescriptionDoc (JSON) instead of HTML.
 * The consumables sibling of task-a-doc.ts, same rationale: nothing has ever asked a model to
 * produce a consumables Doc, so this variant makes that question answerable before
 * renderConsumablesDoc() is trusted with production traffic.
 *
 * WHY A SEPARATE FILE RATHER THAN A FLAG IN task-a.ts. That file is FROZEN (CLAUDE.md). This module
 * is purely additive: it calls the frozen builder and swaps ONLY the task-instruction block, so
 * every input rule that builder encodes for consumables inputs — image manifest, the
 * `[CONSUMABLES MODE ACTIVE]` reinforcement, the skipped video block and template hint — is
 * inherited rather than reimplemented, and cannot drift from it. Nothing frozen is edited or copied.
 *
 * NOT WIRED INTO PRODUCTION by this module alone — see content-orchestrator.service.ts's
 * usesConsumablesDocPipeline() gate (src/prompt-core/doc-pipeline-flag.ts), off by default pending
 * a live probe, mirroring how the main Doc pipeline itself was rolled out.
 */
import { buildPromptA } from './task-a';
import type { PromptPayload } from '../prompt-core/payload';
import type { ProductInput } from '../app/types';

/**
 * The output contract, replacing TASK_A_CONSUMABLES_INSTRUCTION's "pure HTML body only". Has to
 * OVERRULE the master system prompt's `[FORMAT]` ("Emit HTML only") the same way
 * TASK_A_DOC_INSTRUCTION does — that block is cached ahead of this one.
 *
 * Every bound below mirrors ConsumablesDescriptionDocSchema. Omitting one does not make the model
 * freer — it makes the generation fail validation late, after the tokens are spent.
 */
export const TASK_A_CONSUMABLES_DOC_INSTRUCTION =
  `TASK A — GENERATE THE CONSUMABLES DESCRIPTION AS A ConsumablesDescriptionDoc (JSON)

THIS BLOCK SUPERSEDES [FORMAT] IN THE SYSTEM PROMPT. Ignore "Emit HTML only": emit NO HTML
document, NO Markdown and no code fences. Emit ONE JSON object and nothing else — no prose before
or after it. Every §C1–§C6 content rule from the consumables simplified schema still applies; only
the serialization changes. The renderer builds the HTML from this object, so structure you would
have expressed with tags is expressed with fields instead.

SHAPE — emit exactly these keys:

{
  "schemaVersion": "C1",
  "locale": "<BCP47 of the base language, e.g. uk-UA>",
  "localizedName": "<product name as it should read in this language>",
  "hook": "<§C1, one paragraph, 40–60 words, no heading>",
  "features": { "heading": "", "items": [ { "lead": "", "text": "" } ] },      // §C2 — 4–6 items
  "applications": { "heading": "", "items": [ { "lead": "", "text": "" } ] },  // §C3 — 3–4 items
  "specGroups": [ { "heading": "", "rows": [ { "label": "", "value": "" } ] } ], // §C4 — 0–3 groups
  "storage": { "heading": "", "items": [ { "lead": "", "text": "" } ] },       // §C5 — 2–3 items
  "cta": "<§C6, plain closing paragraph after <hr>, 1–2 sentences, no heading>",
  "figures": [ { "file": "", "alt": "", "leadIn": "", "caption": "" } ]
}

IMAGES — [IMAGE MANIFEST] below always lists what to do. When it enumerates numbered image entries,
"figures" MUST contain exactly one entry per manifest image, in the SAME order — no entry omitted,
none invented, none duplicated. "file" is the FILENAME ONLY (e.g. "laser-grid-panel.jpg") — no
folders, no URL, no domain; the renderer builds the src. "leadIn" is a substantive sentence
introducing that image (not a caption restated as a sentence, not generic filler) — it renders as
its own paragraph directly above the figure. "alt" and "caption" must not restate each other's
wording. When [IMAGE MANIFEST] instead says "None — skip all <img>" or "None provided — do not emit
<img> tags", emit "figures": [] — an empty array, never omitted, never null.

"specGroups" MAY BE AN EMPTY ARRAY — emit [] when the source supplies no
printing / mechanical / physical parameters. When present, each group's "heading" is NOT always
"Print Settings" — name it for what it actually holds (e.g. "Print Settings", "Mechanical
Properties", "Physical Properties", or a kit-contents heading like "Package Contents" when the
product is a spares/accessory kit rather than a printable material). Never invent a parameter value.

HARD RULES:
- PROSE FIELDS ADMIT <b> and <strong> AND NOTHING ELSE. No <p>, <ul>, <a>, <em>, no entities, no
  Markdown. The prose fields are exactly: "hook", "cta", and every "items[].text".
- PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL — not even <b>, and no Markdown "**".
  They are: "locale", "localizedName", every "heading", "label", "value", and "lead".
  Writing "<b>Транспортування:</b>" into a "lead" does NOT produce bold text — the renderer already
  wraps that field in <b>, so your tags are escaped and the reader sees the angle brackets
  themselves. Put the plain words there and the renderer applies the formatting.
- A bullet's "lead" carries its own trailing punctuation and spacing; the renderer adds none.
  It joins them as <b>{lead}</b>{text} with nothing in between, so if "lead" ends with a letter or
  digit AND "text" begins with one, the two words collide: "Топографічне зніманняДальність".
  End the "lead" with ":" or ". ", or begin the "text" with a space.
- TARGET LENGTH: ~4700 visible characters (HTML tags stripped) across the whole document. HARD
  CEILING: 5500 — validation FAILS above this. You cannot count your own characters, so AIM LOW to
  leave headroom; budget words, do not measure.
- Do not invent a "section", "hr", "h3", "thead" or any other structural field. Section order,
  headings, tables, <hr> and spacing are the renderer's job, not yours.`;

/**
 * Task A returning a consumables Doc contract instead of an HTML one.
 *
 * Delegates to the frozen builder and replaces `systemBlocks[1]` — the task instruction — leaving
 * `[0]` (master) and any trailing store ToV overlay untouched. Index 1 is the task block by the
 * PromptPayload convention documented in payload.ts. Works regardless of which text the frozen
 * builder put at index 1 (TASK_A_CONSUMABLES_INSTRUCTION for a consumables input, per task-a.ts's
 * own `isConsumables` branch), so nothing about that branching is duplicated here.
 */
export function buildPromptAConsumablesDoc(input: ProductInput, baseLanguageOverride?: string): PromptPayload {
  const base = buildPromptA(input, baseLanguageOverride);
  return {
    systemBlocks: base.systemBlocks.map((block, i) =>
      i === 1 ? { text: TASK_A_CONSUMABLES_DOC_INSTRUCTION, cache: true } : block,
    ),
    userContent: base.userContent,
  };
}
