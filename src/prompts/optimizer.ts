import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { PromptPayload } from '../prompt-core/payload';

// ── Optimizer task instruction ─────────────────────────────────────────────
// Reuses MASTER_SYSTEM_PROMPT's Schema v3.0 §1–§9 [CONTENT STRUCTURE] as the
// target shape for the rewrite, instead of hardcoding a separate list of
// section names here — the Generator and Optimizer must never drift apart on
// what a "correct" description looks like. Only the clauses that don't fit a
// rewrite-of-existing-HTML task (image sourcing, FAQ/HowTo placement) are
// explicitly overridden below.

const TASK_OPTIMIZE_INSTRUCTION =
  `TASK OPTIMIZE — REWRITE AN EXISTING HTML DESCRIPTION
OUTPUT: pure HTML body only (no JSON, no Markdown, no code fences, no explanations).
This is a REWRITE task, not fresh generation: restructure [INPUT HTML] below into the Schema v3.0
§1–§9 order already defined in [CONTENT STRUCTURE] above (Hook → Killer Specs + Key Benefits →
Functionality → Applications → Compatibility [conditional] → Package Contents [conditional] →
Technical Specifications → Supplemental → Commercial Closing/CTA). Do not invent new section names —
follow that schema exactly, including the §2a Killer Specs highlight table (3–4 rows, Specification /
Value / Why it matters, localized headers) and the §7 full Technical Specifications section.

HARD ANTI-FABRICATION CONSTRAINT: use only facts, specs, and images already present in [INPUT HTML].
Never invent new specs, numbers, or claims. §7's COMPLETENESS rule applies here too — count every spec
row in the input first and reproduce every one of them in the final Technical Specifications section;
the §2a highlight table is additive (a curated preview), never a replacement for the full table.

OVERRIDE — [IMAGE HANDLING] "ignore source images / manifest-only": does not apply to this task.
[INPUT HTML] already contains real <img> URLs (there is no separate image manifest here) — keep every
<img src> found in the input verbatim, never invent or drop one. Rewrap each per FIGURE FORMAT and
PLACEMENT above, and — unlike a purely structural cleanup — actively author a new, context-aware
<figcaption> for every image (with a <b> lead-in distinct from the alt text); never leave a <figure>
without a <figcaption> in this task's output.

OVERRIDE — §8 "Supplemental FAQ/HowTo MUST NOT appear in the body": does not apply to this task, which
has no separate FAQ/HowTo artifact pipeline. If [INPUT HTML] already contains HowTo or FAQ content
(Schema.org-wrapped or plain), keep it in the body, flattened to plain heading/paragraph structure with
no itemscope/itemtype/itemprop wrappers — do not delete it.

PHASE 1 — STRUCTURAL CLEANUP (apply before restructuring):
- Remove <noscript> tags and content; unwrap <div class="wpb-content-wrapper">.
- Smart image extraction: <a href…><img …></a> → keep only <img …>; <picture>…<img …>…</picture> →
  keep only <img …>; WordPress captions → extract <img> + <p>Caption text</p>.
- Heading hygiene: remove <strong>, <b>, <span> inside <h2>/<h3>/<h4> but keep the text.
- No Schema.org microdata (itemscope, itemtype, itemprop) and no Bootstrap table classes anywhere in
  the output — plain tables only, matching §7's table format.

LENGTH COMPRESSION & LIMIT: Your absolute hard limit for the final output is 32,000 characters
(including all spaces and HTML tags). If the input HTML is extremely long and approaches or exceeds
this limit, you MUST organically condense and shorten the description. How to condense: summarize
wordy narrative paragraphs, merge repetitive marketing claims, and keep bullet points punchy. What NOT
to condense: NEVER remove, merge, or alter the actual technical specifications, numbers, or rows in the
spec tables to save space. Preserve the facts, but compress the prose.`;

export function buildOptimizerPrompt(htmlInput: string, productName = ''): PromptPayload {
  const contextInstruction = productName ? `\n[Product Name]: ${productName}` : '';

  const userContent =
    `[INPUT HTML] — existing description to restructure and optimize:${contextInstruction}
${htmlInput}`;

  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      { text: TASK_OPTIMIZE_INSTRUCTION, cache: true },
    ],
    userContent,
  };
}
