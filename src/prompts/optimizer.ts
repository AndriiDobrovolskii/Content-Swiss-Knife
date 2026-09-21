import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { PromptPayload } from '../prompt-core/payload';
import { NO_LEAKED_REASONING_CLAUSE } from '../prompt-core/constants';

// ── Optimizer task instruction ─────────────────────────────────────────────
// Reuses MASTER_SYSTEM_PROMPT's Schema v4.0 §1–§9 [CONTENT STRUCTURE] as the
// target shape for the rewrite, instead of hardcoding a separate list of
// section names here — the Generator and Optimizer must never drift apart on
// what a "correct" description looks like. Only the clauses that don't fit a
// rewrite-of-existing-HTML task (image sourcing, FAQ/HowTo routing) are
// explicitly overridden below. Section references match the rebuilt master
// (2026-07-11): [OUTPUT CONTRACT], [MICRODATA ARCHITECTURE], [ROUTING].

const TASK_OPTIMIZE_INSTRUCTION =
  `TASK OPTIMIZE — REWRITE AN EXISTING HTML DESCRIPTION

SCOPE OVERRIDE — LOCALE INDEPENDENCE (read before everything below): this task has no
[Store Name] and is not bound to any store, region, or currency. The entire [REGIONAL STRATEGY]
section in [MASTER_SYSTEM_PROMPT] above is INAPPLICABLE here — do not use it to select language,
currency, or region, and do not infer a store from an image URL's domain or a brand's country of
origin. Every language-keyed table elsewhere in this prompt (§7 column headers, §9 H2
templates, [COMMERCIAL CLAIMS] phrase substitutions, [PRODUCT NAME LOCALIZATION], [UNIT
LOCALIZATION]) is a REFERENCE PATTERN, not an allow-list: [INPUT HTML]'s language may be ANY
language, including ones with no worked example above. When it isn't listed, apply the SAME
transformation the listed examples demonstrate, translated accurately and idiomatically into the
detected language yourself. Never fall back to the nearest listed language or to English.
SELF-CHECK before emitting: re-scan your own draft. If any table header, H2 label, CTA phrase, or
fixed template string is in a different language than the surrounding prose — even one word —
rewrite it. Zero exceptions.

OUTPUT CONTRACT: emit exactly one artifact — the rewritten HTML body. The first character of your
output is the opening "<" of the §1 hook paragraph; the last character is the final closing tag of
§9. Global hard cap: 25,000 characters including all spaces, text, and HTML tags. Where a preamble,
explanation, JSON wrapper, or Markdown fence would appear, write the HTML itself.

${NO_LEAKED_REASONING_CLAUSE}

OUTPUT LANGUAGE (HARD CONSTRAINT): determine the output language SOLELY from the language of
[INPUT HTML]'s own visible prose — its paragraphs, headings, and list items. Write 100% of the
output in that one language: every paragraph, heading, list item in the §2 merged list, §7 table
cell, and figcaption, from the first character to the last, with zero
language switching partway through. Do NOT let brand names, company names, or any URL's domain/path
(e.g. an <img src> pointing at a .es domain, or a company name that sounds Spanish/French/etc.)
influence this decision — those are not language signal, and this task has produced incorrect
output before by treating them as if they were. If [INPUT HTML] itself already mixes languages,
match the language of its longest/majority stretch of prose and normalize the entire output into
that single language.

SCOPE: this is a REWRITE task: restructure [INPUT HTML] below into the Schema v4.0 §1–§9 order
already defined in [CONTENT STRUCTURE] above (Hook → Killer Specs + Key Benefits → Functionality →
Applications → Compatibility [conditional] → Package Contents [conditional] → Technical
Specifications → Commercial Closing/CTA), reusing that schema's exact section names, heading
templates, and table formats.

MIGRATE A LEGACY §2 TO THE v4 SHAPE. [INPUT HTML] was very often written to the previous schema,
in which §2 was a three-column buyer-decision table followed by separate benefit paragraphs. Do
NOT reproduce that table. Merge its rows and those benefits into ONE <ul> under ONE localized
<h2>, killer specs first, at most 8 <li> combined — drop the weakest items when the source has
more. Write each migrated table row as "<li><b>[Name]: [Value + unit]</b> — [1 sentence: concrete
buyer outcome]</li>", carrying the row's "why it matters" text across as that sentence. §2 in the
output contains no table, no paragraph and no figure.

FORMAT §6 PACKAGE CONTENTS AS AN <ol> under its localized <h2>, not a <ul>, whenever the input
supplies kit contents at all.

§7 MULTI-VALUE CELLS: where the input spreads one parameter over several rows, or nests a list
inside a value cell, comma-join those values into ONE row with a single plain-text value
("PA 12, PA 11, PA 12 GB"). One parameter, one row, no nested list.

FACT SOURCE (HARD CONSTRAINT): build every fact, spec, number, claim, and image exclusively from
[INPUT HTML]. Where a gap invites a plausible-sounding addition, keep the gap and write only
source-confirmed content. §7 COMPLETENESS applies here too — count every spec row in the input
first and reproduce exactly that many rows in the final Technical Specifications section, after any
comma-joining above has merged split rows of the SAME parameter; keep §2's merged list additive (a
curated preview drawn from those same specs) so the full §7 table always ships complete alongside it.

OVERRIDE — [IMAGE HANDLING] source of truth: for this task, [INPUT HTML] itself is the image
manifest. Keep every <img src> found in the input verbatim — the output contains exactly as many
<img> elements as the input, with byte-identical URLs. Rewrap each per FIGURE FORMAT and PLACEMENT
above, and author a new, context-aware <figcaption> for every image (with a <b> lead-in distinct
from the alt text) so that 100% of <figure> blocks in the output carry a <figcaption>.

OVERRIDE — [ROUTING FAQ/HowTo]: this task has no separate FAQ/HowTo artifact pipeline. Keep FAQ or
HowTo content found in [INPUT HTML] (Schema.org-wrapped or plain) in the body, flattened to plain
heading/paragraph structure per [MICRODATA ARCHITECTURE]: strip itemscope/itemtype/itemprop
attributes, keep every question, answer, and step text.

PHASE 1 — STRUCTURAL CLEANUP (apply before restructuring):
- Delete <noscript> blocks with their content; unwrap <div class="wpb-content-wrapper"> keeping
  its children.
- Extract images from wrappers: <a href…><img …></a> → keep only <img …>;
  <picture>…<img …>…</picture> → keep only <img …>; WordPress caption blocks → <img> +
  <p>Caption text</p>.
- Heading hygiene: inside <h2>/<h3>/<h4>, unwrap <strong>/<b>/<span> keeping the text.
- Emit every table and element schema-free and framework-free per [MICRODATA ARCHITECTURE],
  matching §7's plain-table format: where a Bootstrap table class or itemscope/itemtype/itemprop
  attribute appears in the input, strip the attribute and keep the element.
- Consolidate any §7 spec category with fewer than 3 rows into one leading category, titled to
  match this document's own output language — never invent a category label in a different
  language than the rest of the output.

LENGTH COMPRESSION: plan against the 25,000-character cap before writing. When the input HTML
approaches or exceeds the cap, condense organically: summarize wordy narrative paragraphs, merge
repetitive marketing claims into one factual sentence each, and keep bullet points punchy.
Compression happens in narrative prose only — every technical specification, number, unit, and
spec-table row carries into §7 byte-identical, at full count.`;

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
