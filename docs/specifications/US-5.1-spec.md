---
artifact: specification
story: US-5.1
version: 9
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-04T00:30:00Z
supersedes: docs/specifications/US-5.1-spec.md#8
inputs_consumed:
  - key: story
    version: 1
  - key: clarification_report
    version: 6
  - key: open_decisions
    version: 6
  - key: specification_review
    version: 8
  - key: specification
    version: 8
open_decisions_blocking: false
---

# Specification: US-5.1 — Replace [file-name.ext] markers in Original Description with the matching uploaded image at the same position in the final description

## Summary

When the operator writes a file-name marker such as `[image-name.jpg]` in the Original
Description, the final description contains the matching uploaded image, as a compliant figure,
at the position of that marker, and no raw marker text reaches the output. A marker that matches
no usable uploaded image is removed and reported as a non-blocking warning. Bracketed text that
is not a file-name marker is left untouched. The substitution is resolved once, in the uk-UA
master, and reaches every other locale through the existing translation step.

## Background

Uploaded images are already recorded in the image manifest and analysed by Vision, but a
bracketed file name in the Original Description has no defined meaning today. The Story gives it
one. Human decisions OD-1..OD-17 fix the mechanism (a deterministic post-processing step, resolved once in the master
before translation, marker wins over a model-placed figure). Their original "no prompt change"
position is superseded for prompts only: see the OD-2 prompt clause below. Where the Story's Decisions log (Q1-Q5) and ACs disagree with a later
human decision, the later decision governs, as recorded in the open-decisions supersession map:

- Q1 "rejected at upload time": no such rejection exists; upload validation is out of scope
  (OD-1). The accepted marker grammar is defined by OD-9 (see Assumption A-2), not by the Story's
  anchored hint.
- Q4 "absolute URL from the manifest": superseded by OD-1/OD-13; `src` is formed from the
  store's image base (or a relative path when the base is empty) and the manifest's
  `urlFilename`.
- Q5 alt priority list: superseded by OD-16 (`alt` is the manifest `altText`, with a guard).
- AC-3 "figcaption from the manifest caption": extended by OD-14 with a fallback when the
  caption is empty; and, for marker-inserted figures, its caption source is overridden by H-7 /
  OD-25 = A: the figcaption description (and the `<b>` label and `alt`) are the Ukrainian texts
  that the Vision analysis records in the image manifest (OD-28 = (a)).
- Story line 66 "Out of scope" (alt-text and caption generation, the Vision analysis themselves) is
  **overridden by H-7 / OD-25 = A / OD-28 = (a)**: this Story extends the Vision analysis and the
  manifest entry with a Ukrainian label, description and alt (FR-21). The Story file is not edited
  and is not routed back to STORY_WRITING (OD-28 = (a)); this Specification declares the override.
- Story Q5 (alt priority list) is overridden for marker-inserted figures by H-7 / OD-25 = A / OD-28
  = (a) (it was already superseded by OD-16; `alt` now comes from the Ukrainian alt in the manifest,
  FR-4).
- OD-2 "HTML rendering level" is superseded by OD-10 (structured-document level) and OD-11
  (HTML level on the non-structured-document path); OD-3 by OD-10/OD-14; OD-4 by OD-12;
  OD-5 by OD-13; OD-6 by OD-16.
- OD-2 prompt clause "Prompts (FROZEN) are NOT changed" (and the "no prompt change" premise
  carried into OD-11 and the prompt-related parts of OD-12): superseded by the human's later
  decision to add a prompt-level marker instruction (FR-19, FR-20), with the AGENTS.md section 9
  approval limited to `src/prompts/task-a.ts` and `src/prompt-core/master-system-prompt.ts`,
  recorded in `docs/workflow/history.jsonl` in the events of 2026-10-03T09:25:44Z and
  2026-10-03T09:28:48Z (orchestrator `note` fields; there is no standalone approval event). The
  deterministic post-processing mechanism of OD-2/OD-10/OD-11 is unchanged; only the prompt clause
  is superseded. The Open Decisions log (v6) records this; the earlier lag is resolved
  (see Open questions).

Specification v2 was REJECTED by a human at HUMAN_SPEC_APPROVAL. This v3 implements the six
rejection points verbatim (recorded as human decisions H-1..H-6; they are not clarifier
assumptions): H-1 replaces v2 Assumption A-10 with a repair ladder (FR-17, FR-18); H-2 removes
meta fields from the non-hosting positions and makes markers in meta tags, attributes and JSON-LD
ignored entirely (FR-1, FR-7, FR-16); H-3 changes FR-5 so a model-placed figure is removed only
when the matching marker is in a hosting position; H-4 makes the alt-versus-figcaption check
compare `alt` with the whole figcaption text including the `<b>` label (FR-4, FR-13, FR-14);
H-5 drops the strict-adjacency requirement for the lead-in paragraph (FR-6, FR-13); H-6 keeps
`Product image: ` and `View ` as hardcoded English fallbacks (A-4, A-11).

Specification v3 was APPROVED and implemented, then the human REJECTED the Pull Request gate
(`docs/workflow/history.jsonl`, 2026-10-03): in a live Expert-3DPrinter run the model deleted all 8
`[file.jpg]` markers on all 3 repair attempts, so every image went to the end-append fallback. The
verified cause is in the prompts, not the code: `master-system-prompt.ts` ([IMAGE HANDLING]) tells
the model to delete every `<img>` found in [Raw Description] and, for Expert-3DPrinter, to emit 0
`<img>` in every case, and `task-a.ts` builds no image block for that store; no prompt mentions
markers. The human asked for a marker instruction at prompt level and gave the AGENTS.md §9
approval (recorded in `docs/workflow/history.jsonl`, events 2026-10-03T09:25:44Z and 2026-10-03T09:28:48Z) to edit **only**
`src/prompts/task-a.ts` and `src/prompt-core/master-system-prompt.ts`; `task-b.ts`, `task-c.ts` and
`output-validator.ts` are not approved and stay unmodified. The human chose to route the change
through the Specification. Specification v5 corrects v4 after SPEC_REVIEW (B-1..B-4): Background supersession of the OD-2 prompt clause, verified golden numbers and the real footprint of the master edit (AC-9, FR-20, NFR-5), verifiable FR-20 properties, and the FR-19 data source. v4 added FR-19, FR-20 and AC-9 and amended Scope, NFR-1, NFR-5, Out of
scope, FR-7, FR-9, FR-17 and Assumptions A-3 and A-10. All other FR/AC numbering is unchanged and no
existing AC is weakened.

Specification v5 was APPROVED and implemented, then the human REJECTED the Pull Request gate a second
time (`docs/workflow/history.jsonl`, events 2026-10-03T16:26:44Z and 2026-10-03T16:40:00Z; the scheme
is recorded in the `note` of `docs/workflow/workflow-state.yaml`). Evidence:
`Knowledge/Issues/expert3d_agibot_d1_ultra_2026-10-03_1922/description_uk-UA.html` shows images in
the right place (the marker mechanism works) but figcaptions with an English `<b>Image:</b>` label
and English Vision text, and English `alt`. **Human decision H-7 (authoritative, from the workflow
`note`; not a clarifier assumption) overrides OD-19, Assumption A-11, human decision H-6 and the v5
out-of-scope line about localising `Product image: ` and `View `:** in the uk-UA master the figure's
label, fallback strings, figcaption text and `alt` are native Ukrainian (generated natively, not
translated from English; the project rule is that uk-UA is generated natively), laid out as the
following scheme, per marker-inserted image (FR-4, FR-14, FR-21). **Specification v7 withdrew the `max-content` of H-7 (OD-26 = (b)); the human then REJECTED
HUMAN_SPEC_APPROVAL of v7 and reinstated it with the decisions H-8 below, which overrule OD-26 = (b)
and OD-27 = (a).**

```
<figure style="display: block; width: max-content; max-width: 100%; margin: 4px auto;">
  <img src="..." alt="<one full Ukrainian descriptive sentence>"
       [loading="lazy" on every image except the first in document order; the first has NO loading attribute]
       decoding="async" style="max-width: 100%; height: auto; display: block;">
  <figcaption style="text-align: left;"><b>IMAGE-SPECIFIC Ukrainian label:</b> a Ukrainian descriptive sentence.</figcaption>
</figure>
```

The label is descriptive of that image (example: «Результат роботи зеленого лазера:»), not a generic
`Image:` or `Зображення:`. `alt` and the whole figcaption text must still differ.

**Human answers recorded in the Open Decisions log v5 (updated in v6) and carried by this v9** (all RESOLVED, none is
a clarifier assumption):

- **OD-25 = A:** the Vision pre-pass returns the Ukrainian label, description and alt, which are
  stored in the image manifest (the manifest entry); the marker step takes them deterministically.
  Task A and the master prompt are not changed for this, and no new AGENTS.md section 9 approval is
  needed for it (FR-4, FR-21, NFR-1). The reason given by the human: the text-only Task A cannot see
  the images, the Vision pre-pass can.
- **OD-26 = (b) and OD-27 = (a): REVERSED by H-8 below.** The figure width is `max-content` and the
  structural styling applies to all non-video figures (FR-14, FR-22).
- **OD-28 = (a):** H-7 overrides Story line 66 Out of scope, AC-3 (caption source) and Q5. The Story
  is unchanged; the override is declared in the supersession list above and in Out of scope.

**Specification v7 was REJECTED by a human at HUMAN_SPEC_APPROVAL**
(`docs/workflow/history.jsonl`, event `HUMAN_REJECTED` of 2026-10-03T18:20:00Z, mirrored in the `note`
of `docs/workflow/workflow-state.yaml`; the provided HTML examples are the source of truth). The
human decisions of that event are recorded here as **H-8** (authoritative; not clarifier assumptions):

1. **Width.** The figure width is `width: max-content;`; the figure style is
   `display: block; width: max-content; max-width: 100%; margin: 4px auto;`. This **amends AGENTS.md
   section 4** on this rule and overrules OD-26 = (b). See "Amendment of AGENTS.md section 4" below.
2. **Figcaption.** Every `<figcaption>` carries `style="text-align: left;"`.
3. **Scope of the styling.** The structural styling (figure `max-content`, figcaption `text-align: left`)
   applies to **all non-video figures** in the document, not only marker-inserted ones. This overrules
   OD-27 = (a) for the structural styling (FR-22). The language/label rules of FR-21 are not widened:
   they still concern marker-inserted figures only (see Out of scope).
4. **Human AGENTS.md section 9 approval (recorded here).** In the same event (2026-10-03T18:20:00Z) the
   human authorises, under AGENTS.md section 9, an update of the FROZEN file
   `src/prompt-core/master-system-prompt.ts` the two example figure lines only**
   (the model's example figures, today `width: fit-content`: the `<figure style="display: block; width:
   fit-content; ...">` lines under [IMAGE HANDLING] / FIGURE FORMAT, Image #1 eager and Images #2+ lazy;
   they sit at lines 403 and 408 in the working tree after the FR-20 sentence is inserted, 400 and 405 at
   HEAD, so they are identified by content, not by number; verification diffs against HEAD), so that they
   match the new layout. No other line of that file, and no
   other FROZEN file, is covered by this approval; it is separate from, and additional to, the earlier
   approval of 2026-10-03T09:25:44Z / 2026-10-03T09:28:48Z (NFR-1).
5. **Confirmed assumptions.** A-16 is confirmed: the Vision-provided Ukrainian alt completely replaces
   the legacy operator-editable `altText` for marker images. A-14 and A-15 are confirmed: the human's
   words are "A-14 and A-15 (Ukrainian fallbacks) confirmed" and nothing more. They move from proposals to
   human-confirmed as the numbered assumptions A-14 and A-15 as written in this Specification. The rule ids,
   the generic-label list, the Cyrillic-check scope and the other details are this Specification's own
   specification, which travels with those assumptions; the human did not itemise them and they are not
   a human statement.
6. **Per-image HTML.** First image `<img>`: NO `loading` attribute, `decoding="async"`. Images 2 and
   later: `loading="lazy"` and `decoding="async"`. `<img>` style `max-width: 100%; height: auto; display: block;`.
   `<figcaption>` `<b>Label:</b> description` as before (Ukrainian per H-7 / FR-21).

**The Open Decisions log v6 records these answers** (H-8, OD-26 and OD-27 REVERSED, the section 9
authorisation of the two example figure lines, A-14, A-15 and A-16 confirmed). This Specification does not
edit the log.

Unchanged by v9 (relative to v7, for the H-8 decisions; v9 makes no behaviour change to them): marker substitution, the repair ladder (FR-17, FR-18), other-locale propagation by
translation (OD-12), count and ordering rules, and the nearest-preceding-paragraph lead-in rule
(H-5).

## Amendment of AGENTS.md section 4 (human-approved, H-8)

AGENTS.md section 4 currently states the figure inline style as
`display: block; width: fit-content; max-width: 100%; margin: 4px auto;`. By the human decision H-8
(2026-10-03T18:20:00Z) this Specification **explicitly amends AGENTS.md section 4 on that one rule**:
the figure width is `width: max-content;` and the figure style is
`display: block; width: max-content; max-width: 100%; margin: 4px auto;`. This overrules OD-26 = (b).
All other section 4 image criteria (figure/figcaption, first image without `loading="lazy"`, later images
with it, `decoding="async"`, `<b>` label, no `<figure>` in `<p>`, lead-in, video survival) are unchanged and
still quoted verbatim in FR-13 and FR-14.

This Specification does not edit AGENTS.md. **Planner follow-up, needs confirmation at the gate:** the
human required only that this Specification state the amendment; the event does not say that AGENTS.md
is to be edited in this Story. This Specification proposes, as a delivery task for the planner, updating
the AGENTS.md section 4 text (the `fit-content` figure style at the second image bullet) to `max-content`
so that the repository authority and the implemented behaviour agree. That task goes beyond the human's
wording and is **not authorised until the human confirms it at the spec gate**; until then, and if it is
declined, the amendment is carried by this Specification alone (human decision H-8).

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY`, including stores that do not use the structured Doc pipeline (Expert-3DPrinter, which has an empty `imageBaseUrl`; default custom stores: see A-3) — OD-13 |
| **Locales** | uk-UA master: the marker is resolved here, once. Every other locale of every store receives the result through the existing translation of the master's rendered output (OD-12); no per-locale marker resolution exists |
| **Track** | angular |
| **Figure scope (H-8, overrules OD-27 = a)** | The structural styling (figure `max-content`, figcaption `text-align: left`, FR-14 and FR-22) applies to **all non-video figures** in the description: marker-inserted, model-placed (kept under FR-5), fallback-appended (FR-8). The label, language and fallback rules of FR-21 / FR-4 apply only to marker-inserted figures. Video figures are untouched |
| **Vision analysis (OD-25 = A)** | In scope: the Vision pre-pass output and the manifest entry gain a Ukrainian label, description and alt (FR-21). Neither is on the AGENTS.md section 9 FROZEN list (`task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts`) |
| **FROZEN files (AGENTS.md §9)** | exactly two may be modified, under the human's recorded §9 approvals: `src/prompts/task-a.ts` (FR-19; approval 2026-10-03T09:25:44Z / 09:28:48Z, additive edit only) and `src/prompt-core/master-system-prompt.ts` (FR-20 additive sentence under the same approval, plus the example-figure lines (identified by content; 403 and 408 in the working tree) only under the H-8 approval of `docs/workflow/history.jsonl` event 2026-10-03T18:20:00Z, FR-22). `task-b.ts`, `task-c.ts` and `output-validator.ts` are not editable; any need to change them, or any other line of the two files, is a §9 stop |
| **AGENTS.md** | Section 4 is amended on the figure width rule (H-8); the AGENTS.md text update is a proposed planner task that needs confirmation at the gate (see "Amendment of AGENTS.md section 4") |

## Functional requirements

### FR-1: Marker recognition

A bracketed token matching the grammar `\[[a-z0-9\-]+\.(jpg|webp)\]` (OD-9) is identified as an
image placeholder when it occurs in the visible text of the generated description: on the
structured-document path, in the text carried by the generated document's text carriers (FR-6
classes); on the non-structured-document path, in the text nodes of the generated HTML (FR-7).
Recognition is case-sensitive. A marker located in a meta tag, an HTML attribute value, JSON-LD
or other non-text content is ignored entirely: it is not recognised, not removed, not reported and
produces no warning; such positions are out of scope (H-2).

**Failure path:** a bracketed token that does not match the grammar (uppercase letters, spaces,
other extensions, e.g. `[Image.jpg]`, `[my image.jpg]`, `[a.png]`) is not a placeholder and is
treated as ordinary text (OD-9, OD-17).

### FR-2: Matching a placeholder to an uploaded image

A placeholder matches an uploaded image when its file name equals the `originalFilename` of an
entry in the image manifest (OD-1). An entry whose status is `error` does not count as a match
(OD-8). Under Assumption A-5, an entry whose status is `pending` does not count as a match, a
`.webp` marker matches by `originalFilename` (the entry's output file name still ends `.jpg`),
and when several entries share an `originalFilename` the first uploaded one wins.

An entry that has no usable `urlFilename` does not count as a match (Assumption A-12). When the
manifest is empty, every placeholder is unmatched.

**Failure path:** no matching entry is the unmatched case, FR-9.

### FR-3: Substitution at the marker position

When a placeholder matches (FR-2), the final description contains that image, as a full figure
(`<figure>` wrapping an `<img>` and a `<figcaption>`), at the position of the placeholder in the
text. The literal `[file-name.ext]` text does not appear in the output (AC-2).

**Failure path:** if the position cannot host a figure (FR-6), FR-6 governs; the literal marker
never remains in the output in any case.

### FR-4: Image attributes

The substituted `<img>` has:
- `src` formed from the store's image base and the entry's `urlFilename` (which always ends
  `.jpg`) (OD-1). For a store whose `imageBaseUrl` is empty, `src` is a relative path made of the brand
  folder, the model folder and `urlFilename` (OD-13; Assumption A-3);
- a non-empty `alt` that is the Ukrainian alt sentence recorded for that image in the image
  manifest by the Vision analysis (OD-25 = A; FR-21), not the legacy manifest `altText` of OD-16.
  Under Assumption A-4, the duplication check compares `alt`
  with the whole text of the final `<figcaption>`, including the `<b>` label text (H-4); whenever
  `alt` would equal that whole figcaption text, the `alt` is that value prefixed with the Ukrainian
  string `Фото: ` so that `alt` and `<figcaption>` differ (replaces the English `View `, H-7);
- a `<figcaption>` consisting of a `<b>` label followed by one descriptive sentence, both taken
  from the Ukrainian label and description recorded for that image in the image manifest (FR-21).
  When the recorded description is empty or unusable (FR-21 failure path: Vision failed, entry
  created before this Story, or no Cyrillic letters), the figcaption falls back to the Ukrainian
  strings below (H-7; wording confirmed by the human, H-8 item 5, A-14): label `<b>Зображення товару:</b>` followed by the file name without extension
  with hyphens replaced by spaces and a closing full stop. When only the label is empty or
  unusable and the description is present, the label falls back to `<b>Зображення товару:</b>`.
  These fallback strings are hardcoded Ukrainian for the uk-UA master (they are the only generic
  label allowed) and reach other locales by translation (OD-12). A figure never has an empty or
  missing figcaption.

**Failure path:** a missing description never yields an empty figcaption (fallback above); a
missing, empty or unusable recorded `alt` is replaced by the file name without extension with
hyphens replaced by spaces (A-12), and the `Фото: ` rule above then applies as needed, so `alt` is
never empty. No English fallback string (`Product image: `, `View `, `Image:`) appears in a
marker-inserted figure of the uk-UA master. This sentence concerns marker-inserted figures only: figures
that are not marker-inserted keep their former caption rules (FR-22, Out of scope).

### FR-5: Single rendering per marker; no duplicate figure

The first marker for a given file renders the image; every later marker for the same file only
has its marker text removed (Story Q2). If the model itself placed a figure for the same file
and a marker for that file is also found **in a hosting position** (FR-6, FR-7), the model-placed
figure is removed and only the marker-generated figure remains, so that no duplicate-image
coverage error arises (OD-10, H-3).

If the matching marker is in a **non-hosting position** (for example a table cell, bullet item
or heading), the marker is removed with the FR-6 `image-placeholder-not-placed` warning and the
model-placed figure for that file stays untouched, so the image appears exactly once (H-3). The
same applies when a marker in a hosting carrier is demoted to non-hosting by the FR-6 lead-in
rules.

**Failure path:** removing a model-placed figure must leave the document valid (every remaining
figure referenced exactly once, no dangling reference) and the output well-formed; no outcome
leaves two figures for one file or none (a file whose marker is non-hosting and which has no
model-placed figure falls to the FR-8 fallback).

### FR-6: Text splitting, lead-in and carriers

Text carriers of the generated document are divided into the following enumerated classes
(Assumptions A-6 and A-7; proposed by this Specification, flagged for confirmation at the spec
gate).

**Hosting classes** (a figure is placed at the marker): a marker in the text of

1. a paragraph block of any section that has paragraph blocks (functionality subsections,
   compatibility, applications blocks, and key-benefits paragraphs where the schema version
   allows them);
2. the hook paragraph;
3. the CTA text paragraph.

For a hosting class the paragraph is split at the marker: the text before it is the lead-in
paragraph, the figure follows, the text after it continues in a following paragraph, and the
marker text is deleted (OD-3, OD-10). Several markers in one paragraph are processed in order of
appearance; an empty half is not emitted. To allow a figure next to text in the hook and CTA
carriers, which do not support one today, the document model is extended additively and
optionally (OD-15); documents already cached in an earlier version continue to parse unchanged.

**Non-hosting classes** (single behaviour): a marker in a bullet item (including every
key-benefits bullet), a heading, a killer-spec text, an applications item text, a specification
table cell, a package-contents item, or any other carrier not listed as hosting, is removed from
the text, the surrounding text is otherwise unchanged, the image is not placed at that position,
and a non-blocking warning with rule `image-placeholder-not-placed`, severity `warning`, naming
the file is reported in the generation QA report (distinct from FR-9's rule; Assumption A-6).
The matched image is then handled as an unmarked image (FR-8: standard fallback, appended at the
end of the document, unless it was placed by another marker or by the model; a model-placed
figure for it stays, FR-5). The v4 rule that
key-benefits holds bullets only is unchanged: no figure is placed in key-benefits (A-7).

**Lead-in rules** (Assumption A-6): the lead-in of a figure is the text immediately before the
marker in its paragraph; when the marker has no text before it in its paragraph, the nearest
preceding paragraph of the document is the lead-in. Strict adjacency of that paragraph is not
required: other block elements (for example a bullet list or a table) may sit between the lead-in
paragraph and the figure (H-5). If no preceding paragraph exists at all
(marker at the very start of the document), or if the lead-in text would equal the figcaption
text (FR-13), the marker is treated as non-hosting (removal plus `image-placeholder-not-placed`
warning, image to the fallback).

**Failure path:** no outcome produces an orphan figure, a lost text fragment other than the
marker, or a marker left in the output.

### FR-7: Non-structured-document path (legacy HTML path)

For stores that do not use the structured-document pipeline (Expert-3DPrinter, the registry store
with an empty `imageBaseUrl`; a default custom store is addressed in A-3), the substitution is performed on the generated HTML before the manifest-coverage check,
with the same observable results as FR-3 to FR-6 (OD-11, OD-13). Under Assumption A-8, markers
are located in text nodes only (not attributes), a model-emitted image for the same file is
removed in favour of the marker-generated one, the paragraph is split so that no `<figure>`
is nested in a `<p>`, and no FROZEN file is altered. Markers in non-hosting positions (headings,
list items, table cells) follow the non-hosting behaviour of FR-6 and FR-5. Meta fields are not
among the non-hosting positions: markers in meta tags, attributes and JSON-LD are ignored
entirely, neither removed nor reported (H-2, FR-1). The nearest preceding `<p>` lead-in need not
be adjacent to the `<figure>` (H-5).

**Failure path:** HTML remains well-formed; no duplicate image; no raw marker text.

For Expert-3DPrinter the model is still told to emit 0 `<img>` tags (OD-1) and is now also told to
keep the markers (FR-19, FR-20), so the end-append of FR-18 is a fallback for a non-compliant
model, not the routine outcome.

### FR-8: Coverage and unmarked images

The substitution runs before the manifest-coverage validation. Images placed by a marker count as
used for coverage. Uploaded images that have no marker and were not placed by the model are
placed by the existing standard fallback (appended at the end of the document); this Story does
not change that behaviour (OD-7, OD-10; Story out-of-scope).

**Failure path:** n/a for a new failure; the existing coverage validation keeps reporting
missing/duplicate images as it does today.

### FR-9: Unmatched placeholder

When a placeholder matches no usable uploaded image (FR-2), the marker is removed from the final
description, the HTML stays well-formed with no `[file-name.ext]` text remaining, and a
non-blocking warning, rule `unmatched-image-placeholder`, severity `warning`, naming the
unmatched file name appears in the generation QA report shown in the UI (AC-5, Story Q3, OD-8).
Under Assumption A-1 the warning is emitted once, in the master generation gate only (translations
never re-run the step). Its `context` is that gate's own label, not a bare locale code: `HTML (base)`
for everything run from the Generator (its non-structured path and its Doc gate), and `HTML (uk-UA)`
for everything run from the uk-UA generation path (its non-structured path and its Doc gate): the
Doc gate takes the label of the path that runs it (reconciliation note N-2). For a store whose language list has no `uk-UA`, the
marker is resolved once in that store's master locale, i.e. the locale from which the store's other
locales are generated or translated, and the single warning is emitted there (Assumption A-13).

**Failure path:** the warning never blocks generation or fails a repair/validation gate. A
placeholder that the model dropped before the step could see it is governed by FR-17, not FR-9.

### FR-10: Non-file bracketed text untouched

Bracketed text that is not a placeholder by FR-1 (for example `[note]`, `[1]`) is left in the
output exactly as written, and produces no warning (AC-6).

**Failure path:** n/a (this requirement defines non-action).

### FR-11: Idempotence

Running the substitution again on content it has already processed (e.g. in each repair attempt
of the generation gate) produces the same result and no additional figure, warning or duplicate
(Assumption A-9).

**Failure path:** a repeated run never creates a second figure for one marker.

### FR-12: Every schema, store and locale

The behaviour of FR-1 to FR-11 holds for every content schema the Generator offers (all v4 and
simplified Content Template schemas, and the Consumables doc pipeline), for every store in
`STORE_REGISTRY`, and for every generated locale (AC-4). A figure inserted in the uk-UA master
appears in every translated locale at the same structural position with the same `src`; the
translations' lead-in, figcaption and `alt` come from the existing translation of the master and
this Story adds no per-locale substitution and no change to translation prompts (OD-12).

**Failure path:** if a translation diverges in `src` or structure, the existing restoration and
structural-parity checks govern; this Story adds no new handling.

## Generated-HTML requirements (AGENTS.md §4)

The Story changes generated HTML (`<img>`/`<figure>` output). The criteria below are in play and
are requirements of this Specification. Quoted verbatim from AGENTS.md §4.

### FR-13: Figure, figcaption, lazy-loading, lead-in (first image bullet)

> "Each image wrapped in a `<figure>` with a `<figcaption>` (figcaption sourced from the
> manifest caption). First image's `<img>` — without `loading="lazy"`; every subsequent one
> — with it; `decoding="async"` on all. No orphan images (each `<figure>` is preceded by a
> `<p>` lead-in). The lead-in `<p>` must not duplicate the `<figcaption>`; `alt` must not
> duplicate the `<figcaption>`."

Every substituted image satisfies this. "First" and "subsequent" are by document order across
all images in the description, wherever the marker sits: the first image in the document is
eager, i.e. its `<img>` has **no `loading` attribute at all** (H-8 item 6), and every later image,
marked or not, has `loading="lazy"`; all have `decoding="async"`.
The figcaption description is the description that the Vision analysis records in the image
manifest (OD-25 = A), so it is sourced from the manifest as the quoted bullet requires; it is in
Ukrainian in the uk-UA master (FR-21), with the Ukrainian fallback of FR-4 (OD-14 as amended by
H-7). The lead-in paragraph differs from the figcaption text, and `alt` differs from the whole
figcaption text including its `<b>` label (FR-4, H-4). The quoted bullet is satisfied as written
(figure, figcaption, first-eager/rest-lazy, `decoding="async"`, lead-in, no duplication); it needs
no reinterpretation and AGENTS.md is not edited. "Preceded by a `<p>` lead-in" is satisfied by the
nearest preceding paragraph without strict adjacency (FR-6, H-5).

**Failure path:** a marker position that would leave the figure without a preceding `<p>`
lead-in is handled by FR-6 (nearest preceding paragraph, adjacency not required); no figure
without a lead-in is emitted.

### FR-14: Figure styling, label, no nesting (second image bullet; amended width)

> "Images wrapped in `<figure>` (inline style
> `display: block; width: fit-content; max-width: 100%; margin: 4px auto;`) with a
> `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and
> `decoding="async"`. First image — without `loading="lazy"`; every subsequent one — with
> it. No `<figure>` nested inside `<p>`. No orphan images (each is preceded by a `<p>`
> lead-in)."

Quoted verbatim from AGENTS.md §4 as it stands today. **This requirement amends that bullet on one
point:** the figure width is `max-content`, not `fit-content` (H-8 item 1; see "Amendment of AGENTS.md
section 4"). Everything else in the quoted bullet holds unchanged. Where the quoted `fit-content`
and this requirement differ, this requirement governs.

Every marker-substituted figure has (and, by FR-22, so does every other non-video figure for the
items marked "structural"):

- `<figure style="display: block; width: max-content; max-width: 100%; margin: 4px auto;">` (structural);
- an `<img>` with `decoding="async"` and `style="max-width: 100%; height: auto; display: block;"`;
  the first image in document order has **no `loading` attribute**; every later image has
  `loading="lazy"` (document order across all images, as in FR-13);
- a `<figcaption style="text-align: left;">` (structural) that contains a `<b>` label followed by the
  description text;
- a `<b>` label text that is the image-specific label recorded for that image (FR-21) and differs
  from the `alt` and from the description text; the `alt`-versus-figcaption duplication check uses the whole figcaption text
  including the `<b>` label (H-4);
- no `<figure>` nested inside `<p>` after a split (FR-6, FR-7).

**Failure path:** as FR-13. A figure whose figure style, `img` style or `figcaption` style differs from
the above is a defect, except video figures (FR-22).

### FR-15: Spec count and video survival remain true

> "Spec count on output = spec count on input. Don't change values or units."

> "**A video embed present in the input is present in the output.** A YouTube/Vimeo
> `<iframe>` in the source description must survive into every generated language version.
> Losing it is a bug, not a stylistic choice — see `src/utils/video-manifest.ts`."

The substitution touches only text carrying a marker and the figure it inserts; it does not
change, drop or reorder specs, spec values or units, nor any video embed or its figure wrapper.

**Failure path:** a split or removal that would change a spec or drop a video is a defect.

### FR-16: Remaining §4 output rules stay true

> "SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency
> symbol** …"

> "HTML only, no Markdown. No `<br>` for spacing; `<hr>` after each `</section>`."

The substitution neither alters `meta_title` or `meta_description`, nor introduces Markdown,
`<br>` spacing, or removes a `<hr>`. A marker appearing in a meta field, meta tag, attribute or JSON-LD
is ignored entirely by this Story: it is neither removed nor reported (H-2; see Out of scope). `output-validator.ts`'s `meta-description-currency` rule stays
disarmed.

**Failure path:** n/a (preservation requirement).

### FR-17: Dropped marker raises a validation error and drives the repair ladder

Before generation, the placeholders present in the Original Description are pre-extracted by the
FR-1 grammar (the pre-extracted set; Assumption A-10). After generation and after the
substitution step, every pre-extracted placeholder that matches a usable uploaded image (FR-2)
and has no processed occurrence in the generated visible text is an unprocessed marker: it
raises a validation error with rule `dropped-image-placeholder` (severity `error`) naming the
file. That error blocks the current generation attempt and triggers the standard repair ladder
(H-1). A marker is processed when it was substituted by a figure (FR-3) or removed with a
warning (FR-6, FR-9, FR-5 non-hosting case); an occurrence in meta, attributes or JSON-LD does
not count as processed (FR-1). The check applies on the structured-document path and on the
non-structured-document path, in each path's existing generation validation and repair
sequence.

**Failure path:** an Original Description with no placeholder, or whose placeholders are all
unmatched, yields an empty expected set and this rule never fires; content without markers
behaves as before (NFR-8). The check is idempotent across repair attempts (FR-11).

The ladder is the fallback that applies after the prompt-level instruction of FR-19 and FR-20 has
failed to keep a marker; it does not replace them. FR-17's behaviour is unchanged by this revision.

### FR-18: Ladder exhaustion moves the image to the end with a warning

When the repair ladder is exhausted and a `dropped-image-placeholder` error is still raised for
a file, that error no longer blocks generation (H-1). The image for that file appears exactly
once, at the end of the description (the FR-8 fallback position, no marker text anywhere), and a
non-blocking warning, severity `warning`, naming the file, with the Ukrainian text
"ШІ не зміг зберегти маркер [file-name.ext] у тексті. Зображення було перенесено в кінець опису. Будь ласка, перевірте його позицію."
(`[file-name.ext]` replaced by the actual marker, e.g. `[image-name.jpg]`), is reported in the
generation QA report shown in the UI. The warning is emitted once, with the master locale
context (A-1, OD-12).

**Failure path:** the warning never blocks generation or fails a validation gate; the rest of
the document is unchanged, and the figure still satisfies FR-13 and FR-14.

### FR-19: Task A user turn carries the marker instruction (`task-a.ts`)

When [Raw Description] (the generation input's description) contains one or more tokens matching
the FR-1 grammar that also match a usable entry of `input.imageManifest` (FR-2), the Task A user turn (`userContent`,
never a system block) carries an `[IMAGE MARKERS]` block with `COUNT=N` (the number of such
distinct markers) and the exact `[file.ext]` list. The block requires that each marker is:

- copied character for character (lowercase, with its brackets, no spaces), never translated,
  split or wrapped in other markup;
- present in the output exactly once;
- placed in a prose paragraph in the body language (an HTML `<p>`, or the text string of a
  paragraph block on the structured path), never in a heading, list item or bullet, table cell,
  section 2, section 7, an attribute or a meta field;
- placed at the end of the sentence that introduces what the image shows. If the marker's source
  position is non-hosting, it is moved to the end of the nearest preceding body paragraph and never
  dropped;
- not an `<img>`: Expert-3DPrinter still emits 0 `<img>` tags; the system replaces the marker with
  the figure and removes any duplicate.

The markers are extracted from [Raw Description] and kept only if they match a usable entry of
`input.imageManifest`, through the same helper as the FR-17 pre-extraction
(`preExtractPlaceholders`, which takes the description and the manifest). This is independent of
the [IMAGE MANIFEST] prompt block: for Expert-3DPrinter that block prints None, yet the
`[IMAGE MARKERS]` block is still produced from the real `input.imageManifest`; the same holds for
default custom stores. Beyond `COUNT=N` and the exact `[file.ext]` list the line format of the block
is not fixed by this Specification. "Nearest preceding body
paragraph" is read as in Q-D (the OQ-4 section-boundary rule: nearest in document order, even across
a section boundary). When the description contains no such token, `userContent` is byte-identical to
its value before this Story.

**Failure path:** when every marker in the description is unmatched (FR-2) the block is absent,
since there is nothing to preserve (FR-9 governs). A marker the model still drops goes through
FR-17 and FR-18.

### FR-20: Master prompt reconciles marker tokens with image deletion (`master-system-prompt.ts`)

The [IMAGE HANDLING] section of the master system prompt gains additive static text (one sentence,
no per-run data) stating that a bare `[file.jpg]` or `[file.webp]` token in [Raw Description] is an
image marker to be preserved, not an `<img>` to delete, and that the Expert-3DPrinter "0 `<img>`"
rule does not apply to markers. It is verifiable by these asserted properties of the master prompt
text:

1. it contains the literal strings `[file.jpg]` and `[file.webp]`;
2. it contains the word "marker";
3. it refers to the Expert-3DPrinter "0 `<img>`" rule as not applying to markers;
4. it is located inside the [IMAGE HANDLING] section;
5. the FR-20 sentence is an addition: it changes or removes no existing line (the only existing lines changed by this Story are the two example figure lines identified by content, FR-22);
6. it contains no per-run data and no interpolation (the constant is identical for every run).

`MASTER_SYSTEM_PROMPT` is also imported by `src/prompts/task-c.ts` (translation) and
`src/prompts/optimizer.ts`; the sentence and the one-time prompt-cache invalidation therefore reach
Task C and the optimizer prompt as well as Task A. This is accepted: the sentence is static and
instructs neither of them to do anything. `task-c.ts` itself is not modified; only the constant it
imports changes. Task B (`task-b.ts`) does not use the master text and stays byte-identical.

**Failure path:** the sentence does not instruct the model to emit an `<img>` or relax the 0 `<img>`
rule for any store.

### FR-21: Native, image-specific Ukrainian label, description and alt (H-7)

**Source (OD-25 = A).** The Vision analysis of each uploaded image returns three texts in the
store's master language (Ukrainian for uk-UA): an image-specific label, one descriptive sentence
(description) and one descriptive sentence for `alt`. They are recorded in the image manifest entry
of that image. The marker step reads them from the manifest deterministically and makes no model
call (NFR-2). Task A and the master prompt play no part in producing them. The texts are produced by
the Vision call directly in Ukrainian, not by translating English text (NFR-10). Every other locale
receives label, description and `alt` through the existing translation of the master (OD-12); this
Story adds no per-locale generation.

**Deterministic rules** (the whole set that is checked by tests; A-14). For every marker-inserted
figure in the uk-UA master (and, per A-15, in the master locale of a store without `uk-UA`):

1. **Label.** The `<b>` label is the recorded label, trimmed, ending in exactly one colon: any run of
   trailing colons (one or more, with any whitespace between them) is collapsed to a single colon, and a
   colon is appended when the recorded label has none (`Результат::` and `Результат:` both give
   `Результат:`). It contains
   at least one Cyrillic letter. It is not a generic label: after trimming, removing the trailing colon(s)
   and ignoring case, it is not equal to `Image`, `Product image`, `Зображення` or
   `Зображення товару`. `Зображення товару:` is produced only by the FR-4 fallback.
2. **Description.** The figcaption description after the label is the recorded description, trimmed,
   non-empty, containing at least one Cyrillic letter.
3. **Alt.** The `alt` is the recorded alt, trimmed, non-empty, containing at least one Cyrillic
   letter.
4. **Difference.** `alt` and the whole figcaption text (label included) differ (FR-4).
5. **Duplicate labels.** If the label of a marker-inserted figure equals (same comparison as in rule
   1) the label of an earlier marker-inserted figure in document order, the figure keeps its text
   and a non-blocking warning with rule `image-caption-duplicate-label`, severity `warning`, naming
   the file, is reported in the generation QA report (Ukrainian user-facing text; rule id and wording
   proposed, A-14). The generic fallback label `Зображення товару:` is exempt: it may repeat without
   a warning. No automatic rewording is performed.

**What is not deterministically checked.** That a label is "image-specific", that a description or
`alt` is exactly one sentence, and the idiomatic quality of the Ukrainian are properties of the
Vision instruction and of the model, not of the substitution step. They are verified only by the
human-verified live re-run named in "What this Specification cannot guarantee". No Latin-word
allowlist exists and no check of Latin-script words is made (the earlier "no English words other
than product names, model designations and units" point is withdrawn); the Cyrillic-presence test of
rules 1 to 3 is the only language check and is a deliberately cheap proxy, not a language detector
(A-14).

**Failure path** (per field, per file):

- A recorded label, description or alt that is missing or empty (Vision failed, or a manifest entry
  created before this Story has no such field) is replaced by the Ukrainian fallback of FR-4 (label
  `Зображення товару:`; description and `alt` from the file name) with no warning: never an English
  string, never an empty label, figcaption or `alt`.
- A recorded field that is non-empty but contains no Cyrillic letter (rules 1 to 3) is treated as
  empty, the same fallback applies, and one non-blocking warning with rule
  `image-caption-not-native`, severity `warning`, naming the file, is reported in the generation QA
  report (Ukrainian user-facing text; rule id and wording proposed, A-14). A recorded label that
  equals a generic label (rule 1) is treated as non-native in the same way.
- Entries with status `error` do not match (FR-2), so they never reach these rules.

### FR-22: Structural figure styling applies to all non-video figures (H-8)

In the final generated description, **every non-video `<figure>`** (a figure that wraps an image) has the
figure style of FR-14 (`display: block; width: max-content; max-width: 100%; margin: 4px auto;`) and a
`<figcaption style="text-align: left;">`. This holds regardless of who placed the figure: inserted by a
marker (FR-3), placed by the model and kept (FR-5), or appended by the standard fallback (FR-8), on the
structured-document path and on the non-structured-document path, in the uk-UA master and, through the
existing translation, in every other locale (OD-12).

**Testable scope (A-17).** The requirement is asserted deterministically for the figures that the
application itself produces: the renderer of the structured document, the substitution step (FR-3, FR-7)
and the standard fallback (FR-8), on both paths. A figure that the model itself writes as HTML on the
non-structured-document path is covered only through the updated example figures of consequence 2: it
follows them on a best-effort basis, no deterministic test can fail it, and no deterministic rewrite of
model-emitted HTML is required. Under A-17 (proposed, to be confirmed at the gate) this is the whole
claim; if the human wants a rewrite, FR-22 must be extended. The residual exposure is small because the
model on that path is told to emit 0 `<img>` (OD-1).

The requirement overrules OD-27 = (a) for this structural
styling only; the label, language and fallback rules of FR-4 and FR-21 still apply to marker-inserted
figures only.

Consequences, stated as requirements and not as design:

1. The renderer that produces image figures from the structured document, and the existing
   standard-fallback figure, produce the new figure width and the figcaption `text-align: left` for
   every non-video figure, so a figure that was `fit-content` before this Story is `max-content` after it.
2. The FROZEN example figures in the master system prompt, `src/prompt-core/master-system-prompt.ts`
   (the two example `<figure style="...fit-content...">` lines, identified by content; lines 403 and 408 in
   the working tree, 400 and 405 at HEAD), are updated to the FR-14 layout (figure style with `max-content`; the
   figcaption carrying `style="text-align: left;"` if the example shows a figcaption), under the human
   section 9 approval of H-8 item 4. The allowed edit is limited to those two example-figure lines; no other
   line of the file changes by this approval (NFR-1). Model-emitted figures on the non-structured-document
   path follow these updated examples; this Specification does not require a deterministic rewrite of
   model-emitted HTML beyond figures produced by the substitution step and by the standard fallback
   (Assumption A-17).
3. Operator editing must not undo the layout: a description containing figures in the new layout
   survives the HTML editor round trip and the HTML cleaning step with the figure and figcaption styles
   unchanged (verified by AC-9 (n)). *Proposed by this Specification as a necessary condition of the
   human's layout; it is not one of the human's literal H-8 points. Needs confirmation at the gate
   (review v8 N-3).*
4. Existing tests, fixtures and golden files that pin the former `fit-content` figure style or the
   former figcaption (including the prompt golden file, whose master-text portion changes through the
   lines 403 and 408 edit) are updated to the new layout as part of this Story; this is a requirement
   on the delivered test suite, not a weakening of any assertion (verified by AC-9 (o)). *This follows
   from H-8 items 1 to 3 (a width change changes every pinned expectation); stated so that it is not
   left implicit.*
5. Video figures (YouTube/Vimeo `<iframe>` wrapped in a `<figure>`, aspect-ratio on the `<figure>`) are
   not changed by this requirement and keep their existing rules (FR-15).

**Failure path:** a non-video figure produced by the renderer, the substitution step or the standard
fallback with `fit-content` (or any figure style other than the FR-14 one), or with a `<figcaption>`
lacking `text-align: left`, is a defect (a model-emitted legacy-path figure is outside the deterministic
claim, see "Testable scope"); a video
figure that acquires the image figure style is a defect.

## Non-functional requirements

- **NFR-1 (FROZEN files):** Only `src/prompts/task-a.ts` and `src/prompt-core/master-system-prompt.ts`
  may be modified. `task-a.ts`: one additive marker block (FR-19), under the human's recorded §9
  approval (`docs/workflow/history.jsonl`, 2026-10-03T09:25:44Z and 2026-10-03T09:28:48Z).
  `master-system-prompt.ts`: (i) one additive static sentence (FR-20), under that same approval, and
  (ii) an update of the two example figure lines **only**, identified by content (lines 403 and 408 in the
  working tree; FR-22), under the human's
  separate §9 approval of `docs/workflow/history.jsonl` event 2026-10-03T18:20:00Z (H-8 item 4). Apart
  from that update, no existing line of either file is changed or removed. `task-b.ts`,
  `task-c.ts` and `output-validator.ts` are unmodified. OD-25 = A routes the Ukrainian label, description
  and alt through the Vision pre-pass and the manifest, so no FROZEN file changes for that. Any edit
  outside these approvals is a §9 stop.
- **NFR-2 (Determinism):** The substitution is a deterministic code step: same input gives same
  output, no randomness, no wall-clock dependence, no model call (OD-2).
- **NFR-3 (Provider independence):** Behaviour does not depend on the active LLM provider
  (AGENTS.md §3 Rule 1).
- **NFR-4 (Retrieval separation):** The step does not use search or page fetch; retrieval stays
  out of generation (AGENTS.md §3 Rule 2).
- **NFR-5 (Prompt caching):** `systemBlocks` are not collapsed into `userContent` (AGENTS.md §3).
  The cached system blocks (two, plus a third static overlay block for Expert-3DPrinter and Center 3D
  Print) stay static: no filename, count or other per-run text is interpolated
  into them. Per-run marker data lives only in the uncached `userContent` (FR-19). The one-sentence
  master edit (FR-20) is a one-time cache invalidation, not a recurring cost; it
  affects every prompt that embeds `MASTER_SYSTEM_PROMPT` (Task A, Task C and the optimizer), not
  only Task A.
- **NFR-6 (Stores and locales):** Store and locale information comes only from `STORE_REGISTRY`;
  no hard-coded store or locale list (AGENTS.md §3).
- **NFR-7 (Secrets):** Nothing is added to the browser bundle that carries a secret (AGENTS.md
  §3 Rule 4).
- **NFR-8 (Backward compatibility):** Content without markers behaves exactly as before; cached
  documents of earlier versions parse unchanged (OD-15, A-7).
- **NFR-9 (Warning is non-blocking):** Warnings from this Story never fail a generation or a
  validation gate (including the `image-caption-not-native` warning, FR-21). The single exception is the `dropped-image-placeholder` validation error
  (FR-17), which blocks one generation attempt and triggers the repair ladder; once the ladder
  is exhausted it becomes a non-blocking warning (FR-18). The `image-caption-duplicate-label`
  warning (FR-21) is likewise non-blocking.

- **NFR-10 (Native generation, H-7):** the uk-UA texts of FR-21 are produced natively in Ukrainian
  by the Vision call; an English-first-then-translate path for them is not allowed. Task C translation
  of the rendered master to other locales is unchanged.
- **NFR-11 (Hardcoded fallback strings):** the only hardcoded user-visible strings this Story adds are
  the Ukrainian fallbacks of FR-4 and the Ukrainian QA messages (project rule: QA messages are Ukrainian,
  code and docs English). No English user-visible string is added.
- **NFR-12 (Vision route, OD-25 = A):** the extended Vision output must behave the same for every
  active LLM provider (AGENTS.md §3 Rule 1); Task A `systemBlocks` stay static (NFR-5) and carry no
  per-image text; an entry recorded before this Story, or whose Vision call returns none of the new
  texts, must not make generation fail (FR-21 failure path, NFR-8).

## Out of scope

- Uploading images, and upload-time validation or rejection of file names (OD-1). The Vision
  analysis, its alt-text and caption generation are **no longer wholly out of scope**: H-7 / OD-25 =
  A / OD-28 = (a) override Story line 66 Out of scope, AC-3 (caption source) and Q5 to the extent that
  the Vision analysis and the manifest entry gain the Ukrainian label, description and alt of FR-21.
  Anything else about Vision (which images are analysed, its contract for other consumers, its UI)
  stays out of scope.
- Changing which uploaded images are used or where they go when no placeholder is present.
- Adding new content schemas, stores or locales.
- Changing any FROZEN file other than the two approved ones: `task-b.ts`, `task-c.ts` and
  `output-validator.ts` stay unmodified, and the two approved files take additive edits only (NFR-1).
- A guarantee that the model preserves markers: FR-19 and FR-20 raise the likelihood, they do not
  guarantee it; the repair ladder of FR-17 and FR-18 remains the safety net (Assumption A-10).
- Per-locale marker resolution and any change to translation prompts (OD-12).
- Enrolling Expert-3DPrinter or any default custom store in the Doc pipeline and changing the
  empty-`imageBaseUrl` guard (Assumption A-3).
- Building or changing any external app dictionary for the fallback strings: they are hardcoded
  Ukrainian in the master (H-7; the v5 line that kept `Product image: ` and `View ` English is withdrawn).
- Applying the label, language and fallback rules of H-7 / FR-4 / FR-21 to figures that are not produced
  by a marker (model-placed figures that stay, FR-5; fallback-appended figures of FR-8; video figures):
  they keep their former caption rules. Only the structural styling of FR-22 reaches them (H-8).
- Changing video figures or their layout (FR-22, FR-15).
- Editing AGENTS.md in this Specification: the section 4 amendment is stated (H-8). The text update is a
  proposed planner task that needs confirmation at the gate (the human required only that the amendment be
  stated); it is not done here.
- Editing any line of `master-system-prompt.ts` other than the FR-20 addition and the two example figure
  lines (identified by content, lines 403 and 408 in the working tree; NFR-1).
- Any Task A or master-prompt change to produce the label/description/alt, and any translation-prompt
  change (OD-25 = A).
- Markers inside meta title/description, meta tags, JSON-LD or HTML attribute values: ignored entirely, not removed, no warning (H-2).
- Case-insensitive or otherwise relaxed marker matching (`[Image.jpg]` stays plain text, OD-17).

## Open questions

No Open Decision is blocking (`open_decisions_blocking: false`; Open Decisions log v6 has no
`blocking: true` entry; the log lag noted in v8 is resolved by log v6, which records H-8, OD-26 and OD-27 as REVERSED, the section 9 authorisation of the two example figure lines, and A-14, A-15, A-16 as confirmed). OD-1..OD-17, OD-19 (answered by H-7), H-7, H-8, OD-25 and OD-28 are
RESOLVED human decisions (OD-26 and OD-27 were resolved and then REVERSED by H-8). OD-18 and OD-20..OD-24 are OPEN, non-blocking and are **not resolved here**;
they carry **assumptions made by the clarifier, not human decisions**. This Specification states each assumption explicitly, for confirmation at
the spec gate:

- **A-1 (OD-24.1, OD-8):** the unmatched-placeholder warning is emitted once, with the uk-UA
  master's context, not once per locale.
- **A-2 (OD-24.2):** the parser contract is the OD-9 grammar `\[[a-z0-9\-]+\.(jpg|webp)\]`; the
  Story Q1 anchored single-hyphen hint is informative only. (The OD-9 grammar also accepts
  leading, trailing or doubled hyphens.)
- **A-3 (OD-20, reconciliation N-1):** Expert-3DPrinter, a registry store with an empty
  `imageBaseUrl`, is served through the non-Doc HTML path (FR-7) with a relative `src` (brand
  folder, model folder, `urlFilename`); the empty-`imageBaseUrl` guard and the Doc-pipeline
  enrolment list are not changed. A default custom store (a name absent from `STORE_REGISTRY`) is
  not served on that path today: `getStore` gives it an empty `deliveryRegion` and
  `buildDeliveryRegionBlock` throws, so it cannot generate at all. It is therefore out of reach for
  this Story and v3's claim that it is served is withdrawn; the FR-7 behaviour and the FR-19 block
  would apply to it the day it can generate. This differs from the mechanism the human described in
  OD-13 (which is unreachable for these stores).
- **A-4 (OD-18, H-4, H-7; amended in v6; OD-18 still open):** the `Фото: ` prefix (was `View `) is applied whenever `alt` would equal the whole
  final figcaption text (including the `<b>` label), from any source (not only the
  `Product image: ` fallback); the fallback file name is taken from `urlFilename`. The fallbacks are hardcoded Ukrainian (FR-4, A-11 as amended). This generalises the literal wording of
  OD-16. Observation: because the label is part of the compared text, the equality is reachable
  only when the recorded alt already contains the label; the rule is kept as the human specified
  and is a cheap safety net, not a main path.
- **A-5 (OD-24.3):** first uploaded entry wins on duplicate `originalFilename`; a `.webp`
  marker matches by `originalFilename`; status `pending` counts as unmatched.
- **A-6 (OD-22, review F-1, F-2, F-4):** the hosting and non-hosting carrier classes are those
  enumerated in FR-6. For non-hosting carriers the single behaviour is "remove the marker, warn
  with rule `image-placeholder-not-placed`, image falls to the coverage fallback"; the OD-22
  alternative "relocate the figure to the nearest hostable position" was not chosen (smaller) and
  a human may replace it. A marker with no preceding paragraph in the document, or whose lead-in
  would equal the figcaption, is treated as non-hosting. This narrows Story AC-2 ("at the position
  of the placeholder") for the non-hosting classes; confirm at the gate.
- **A-7 (OD-21, review F-1):** the document-model extension is additive and optional and covers
  only the hook and CTA carriers; cached earlier-version documents are unchanged; figures
  are produced only by this step; the v4 bullets-only rule for key-benefits is kept, so key-benefits
  bullets are non-hosting. OD-15's "any section that has text" is read as limited to the carriers
  that hold paragraph text; confirm at the gate.
- **A-8 (OD-23):** on the HTML path markers are located in text nodes (not in attributes), the
  marker-created image wins over a model-created one, and the result is in place before the
  coverage check.
- **A-9 (OD-24.5):** the step is idempotent (FR-11).
- **A-10 (OD-24.4, H-1, replaces v2 A-10):** the v2 "silent degradation" assumption is withdrawn.
  The pre-extracted set (FR-17) is the distinct file names of placeholders found by the FR-1
  grammar in the Original Description before generation, restricted to those that match a usable
  uploaded image (FR-2). A dropped marker is a repair-ladder event (FR-17), and on exhaustion the
  image moves to the end with a warning (FR-18). AC-2 is verified both for content that contains
  the marker and for content from which the model dropped it. The ladder is the fallback after
  FR-19 and FR-20 and does not replace them; since the prompt now tells the model to keep markers,
  a dropped marker is expected to be the exception, not the routine outcome, including on
  Expert-3DPrinter. See open questions Q-A..Q-C.
- **A-12 (review F-5):** a manifest entry matched by name but lacking a usable `urlFilename`
  counts as unmatched; a missing or empty `altText` falls back to the file name without extension,
  hyphens as spaces.
- **A-13 (review F-6):** for a store without `uk-UA` in its language list, the marker is resolved
  once in that store's master locale and the single warning is emitted there.
- **A-11 (OD-19, H-6, H-7; REVERSED in v6, OD-19 RESOLVED by H-7):** the v5 assumption that `Product image: ` and `View ` stay
  English is withdrawn by the human decision H-7 (see Background). OD-19 is answered: label, fallback
  strings, figcaption and `alt` in the uk-UA master are native Ukrainian. This Story still neither adds
  nor requires an external app dictionary.
- **A-14 (CONFIRMED by the human, H-8 item 5; was a proposal in v6/v7):** the
  Ukrainian fallback wording `Зображення товару:`, the alt prefix `Фото: `, the rule ids
  `image-caption-not-native` and `image-caption-duplicate-label` and their Ukrainian messages, the
  generic-label list of FR-21 rule 1 (`Image`, `Product image`, `Зображення`, `Зображення товару`), and
  the duplicate-label behaviour (keep the text, warn, no rewording; the generic fallback label is
  exempt). The Cyrillic-presence test (FR-21) is a deliberately cheap deterministic proxy, not a
  language detector; no Latin-word allowlist exists. (The human confirmed the Ukrainian fallbacks and
  `image-caption-not-native` explicitly; the other items listed travel with them as part of the same
  assumption.)
- **A-15 (CONFIRMED by the human, H-8 item 5):** for a store without `uk-UA` in its language list, FR-21
  applies in that store's master locale (same reading as A-13). The Cyrillic-presence test is defined
  for a uk-UA master only; for any other master locale it is replaced by the non-empty test and is not
  applied as a script test. The hardcoded fallbacks of FR-4 stay Ukrainian and reach the locales by
  translation.
- **A-16 (CONFIRMED by the human, H-8 item 5):** the Ukrainian alt recorded in the manifest by the
  Vision analysis (OD-25 = A) is the `alt` of marker-inserted figures and **completely replaces** the
  legacy operator-editable `altText` for them; `altText` is not read for these figures. A manifest entry
  created before this Story has no such texts and takes the FR-4 fallbacks. (Whether a later operator
  edit in the UI overrides the recorded text is not raised by the human's answer; the recorded text
  applies.)
- **A-17 (v8, kept in v9; proposed by this Specification, for confirmation at the spec gate):** FR-22 requires the
  FR-14 structural styling on every non-video figure that the renderer, the substitution step or the
  standard fallback produces. For figures the model itself emits as HTML on the non-structured-document
  path, the means is the updated FROZEN example figures (the two example figure lines, by content) which the human authorised
  for exactly that purpose; no deterministic rewrite of model-emitted HTML figures is required. Consequently the
  deterministic and testable claim of FR-22 and AC-9 (l) is limited to figures the application produces
  (renderer, substitution step, standard fallback). If the human wants such a rewrite, FR-22 must be
  extended.

**New undecided questions raised by the v3 changes** (not resolved here; each carries the stated
assumption for confirmation at the spec gate; none blocks):

- **Q-A (dropped-marker scope):** does `dropped-image-placeholder` apply only to markers that
  match a usable image and are lost entirely (per file, counted once regardless of occurrences)?
  Assumed yes (A-10). A dropped marker with no matching image raises no error and no FR-9 warning,
  since the step cannot see it.
- **Q-B (exhaustion with a model-placed figure):** when the marker is dropped and the model placed
  a figure for the same file elsewhere, the human text says the image "was moved to the end".
  Assumed: that figure is relocated to the end so the image appears once and the warning is true.
- **Q-C (rule id and severity of the exhaustion warning):** the human gave the rule id only for the
  blocking error (`dropped-image-placeholder`) and the message text only for the warning. Assumed:
  the warning reuses the rule id `dropped-image-placeholder` with severity `warning`; the human
  may name a different id. The placeholder `[file-name.ext]` in the text is replaced by the real
  marker including brackets.
- **Q-D (lead-in reach):** with strict adjacency dropped (H-5), "nearest preceding paragraph" is
  read as the nearest preceding paragraph in document order, even across a section boundary.
  Confirm whether the lead-in must stay within the same section. FR-19 uses the same reading.

**Decisions raised in v6 and answered by the human (Open Decisions log v5, updated in v6):** OD-25 = A (source of the
per-image Ukrainian label, description and alt: the Vision pre-pass, via the manifest) and OD-28 = (a)
(H-7 overrides Story line 66 Out of scope, AC-3 and Q5; Story unchanged) stand. OD-26 = (b) (width stays
`fit-content`) and OD-27 = (a) (new rules only for marker-inserted figures; lines 403 and 408 untouched)
were REVERSED by the human decision H-8 of 2026-10-03T18:20:00Z (width `max-content`, structural styling
on all non-video figures, section 9 approval of lines 403 and 408). The Open Decisions log v6 records
this reversal, H-8, the section 9 authorisation and the confirmation of A-14, A-15 and A-16. This
Specification does not edit the log.

**Still open, non-blocking, NOT resolved by this Specification:** OD-18, OD-20, OD-21, OD-22, OD-23,
OD-24, each carried as the assumption stated above (A-4, A-3, A-7, A-6, A-8, A-1/A-2/A-5/A-9/A-10).

**AGENTS.md §4 criteria in play (v9):** the first image bullet (figure, figcaption sourced from the
manifest caption, first eager / rest lazy, `decoding="async"`, lead-in `<p>`, no lead-in or `alt`
duplication of the figcaption; FR-13) and the second image bullet (figure style with `max-content` as amended by H-8, `<b>`
label distinct from alt + description, no `<figure>` in `<p>`, no orphans; FR-14, FR-22); also spec-count parity
and video survival (FR-15) and the SEO / HTML-only rules (FR-16), unchanged and satisfied as
written, except the one width amendment above.

Confirmation also requested for FR-11 (idempotence, rests on A-9), for A-17, for FR-22 consequence 3
(editor round trip, AC-9 (n)), for the proposed planner task of updating the AGENTS.md section 4 text,
and for A-4 and A-11, which
change what the human literally said in OD-16 and OD-14.

Also noted (from the clarification report, reported only): the Story's Q1, Q4, Q5 text and the
AC-4 wording "simplified schemas" disagree with later decisions as described in Background; the
Story is not edited.

## AC-9: prompt-level marker instruction (spec-level, deterministic)

AC-9 is a Specification-level criterion added in v4 from the human's rejection of the PR gate. It is
not an AC of the Story (the Story is not edited; numbers AC-7 and AC-8 are not used). It is
satisfied when all of the following hold, each verified deterministically:

- **(a)** `buildPromptA` called with a description containing N markers that match usable manifest
  entries returns `userContent` with an `[IMAGE MARKERS]` block, `COUNT=N`, and each filename
  verbatim. The tests assert only `COUNT=N` and the verbatim list; the line format is not fixed. This also holds for an Expert-3DPrinter input whose image manifest block is None in the
  prompt (FR-19).
- **(b)** For an input with no marker, `userContent` is byte-equal to the pre-Story golden (FR-19).
- **(c)** The `systemBlocks` of `buildPromptA` contain no filename and no per-run marker data
  (NFR-5, FR-19).
- **(d)** `buildPromptADoc` output carries the same `[IMAGE MARKERS]` block (FR-19).
- **(e)** The master system prompt (the FR-20 addition) satisfies the six asserted properties listed in FR-20: literals
  `[file.jpg]` and `[file.webp]`, the word "marker", the reference to the Expert-3DPrinter 0 `<img>`
  rule not applying to markers, placement inside [IMAGE HANDLING], additions-only diff for the FR-20 sentence (the separate example-figure-line update is AC-9 (m)), no per-run
  data or interpolation.
- **(f)** `task-b.ts`, `task-c.ts` and `output-validator.ts` are unchanged in the diff (NFR-1).

- **(g)** (H-7 / H-8, style) in the uk-UA master each marker-substituted figure has the exact `<figure>`
  style `display: block; width: max-content; max-width: 100%; margin: 4px auto;`, the exact `<img>`
  style `max-width: 100%; height: auto; display: block;`, `decoding="async"`, `loading="lazy"` on all
  images except the first in document order, whose `<img>` has no `loading` attribute, and
  `<figcaption style="text-align: left;">` (FR-14). This is the amended form of AGENTS.md §4 (H-8).
- **(h)** (H-7, language; the complete deterministic check) for each marker-substituted figure whose
  recorded label, description and alt are Cyrillic: the `<b>` label, the description and the `alt` each
  contain at least one Cyrillic letter; the label ends in exactly one colon and is not a generic label
  (FR-21 rule 1); `alt` differs from the whole figcaption text (FR-4); two figures with equal labels
  yield one `image-caption-duplicate-label` warning each for the later figure and keep their text.
  "Image-specific" and "one sentence" are not asserted by tests (FR-21).
- **(i)** (H-7, fallback) with a missing or empty recorded label, description or alt the figcaption and
  `alt` are the Ukrainian fallbacks of FR-4 with no warning; with a non-empty recorded field containing
  no Cyrillic letter the same fallback applies plus one `image-caption-not-native` warning; `alt` is
  non-empty; no `Product image: `, `View ` or `Image:` string appears in a marker-substituted figure of
  the master (FR-4, FR-21).
- **(j)** (H-7, propagation) another locale receives the figure through translation only, with the same
  `src` and structure (FR-12, OD-12).
- **(k)** (OD-25 = A, source) the marker step takes label, description and alt from the manifest entry
  and makes no model call; Task A `userContent` and `systemBlocks` carry no per-image label, description
  or alt; the Vision output and the manifest entry carry the three Ukrainian texts, and an entry without
  them does not fail generation (FR-21, NFR-12).
- **(l)** (H-8, scope; limited by A-17) every non-video figure that the application produces (the renderer
  of the structured document, the substitution step, and the standard fallback of FR-8, on both paths;
  this includes a model-placed figure kept by FR-5 on the structured-document path, which the renderer
  emits) has the FR-14 figure style with `max-content` and a `<figcaption style="text-align: left;">`;
  their caption texts and label rules are otherwise unchanged (FR-22); video figures are unchanged; no
  `fit-content` figure style remains in any non-video figure the application produces. A figure the model
  itself writes as HTML on the non-structured-document path is **not** asserted (A-17): it follows the
  updated example figures best-effort and is covered only by AC-9 (m).
- **(m)** (H-8, FROZEN lines) `master-system-prompt.ts` differs from its pre-Story state (diffed against
  HEAD, the two example figure lines identified by content, not by line number) only by the FR-20 addition
  and the update of those two lines to the FR-14 layout; no other existing line changed (NFR-1, FR-22).
- **(n)** (H-8, operator editing; FR-22 consequence 3; proposed, needs confirmation at the gate) a
  description containing figures in the FR-14 layout passes the HTML editor round trip and the HTML
  cleaning step with the figure style and the figcaption style unchanged.
- **(o)** (H-8, test suite; FR-22 consequence 4) the tests, fixtures and golden files that pinned the former
  `fit-content` figure style or former figcaption are updated to the new layout, and none asserts
  `fit-content` for a non-video figure; the delivered suite has no weaker assertion than before.

Spec-level verifiable outcomes that follow from the approved edits (not separate requirements):
the golden file `test/fixtures/golden/full-description-prompts.json` is regenerated, and its diff
shows a change in `systemBlocks[0]` (the FR-20 sentence and the example-figure-line update) only in the 10 of 12 cases that embed the master text (`doc/*`,
`html/*` and `c/*`: Task A and Task C), with `userContent` unchanged; the 2 `translate/*` cases
(Task B) stay byte-identical; and `bash arch-guard.sh --rebaseline` is run only after confirming that just the two
approved frozen files changed, and `master-system-prompt.ts` changed only as approved (FR-20 sentence; the two example figure lines, by content).

### What this Specification cannot guarantee

Model compliance with FR-19 and FR-20 is non-deterministic: the prompts make marker preservation
likelier, not certain. The only real proof is a human-verified live re-run of the same
Expert-3DPrinter input (the Knowledge/Issues run `expert3d_agibot_d1_ultra_2026-10-03_1217`),
recorded as an evidence line, not as a unit test. A second live re-run of the `..._2026-10-03_1922` input is needed for H-7 (native
Ukrainian, image-specific label, description and alt, one sentence each); this is the only
verification of those qualities (FR-21). Until then AC-9 proves the instruction is
delivered to the model, not that the model obeys it.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1 | Grammar per OD-9 (A-2); meta/attribute/JSON-LD ignored (H-2) |
| AC-2 | FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-17, FR-18, FR-19, FR-20 | literal marker absent; prompt-level instruction keeps markers through the model (FR-19, FR-20); image placed at the marker for hosting carriers, removed with warning for non-hosting ones (A-6); `src`/`alt` per FR-4; dropped markers go through the FR-17/FR-18 ladder (H-1) |
| AC-3 | FR-13, FR-14, FR-22, FR-4, FR-6, FR-8, FR-15, FR-16, FR-21 | §4 criteria quoted verbatim, width amended to `max-content` (H-8); figure/img/figcaption style per FR-14, applied to all non-video figures by FR-22; Ukrainian label, description, alt and fallbacks from the manifest (FR-4, FR-21); caption source override declared in Background (OD-28 = (a)) |
| AC-4 | FR-12, FR-7, FR-6, FR-21, FR-22 | all schemas, all `STORE_REGISTRY` stores (legacy path for non-Doc stores), all locales via master |
| AC-5 | FR-9 | context is the gate label (FR-9); rule `unmatched-image-placeholder`, non-blocking (NFR-9); FR-6's distinct rule `image-placeholder-not-placed` covers matched-but-unplaced markers; FR-18 warning covers dropped markers |
| AC-6 | FR-10, FR-1 | |
| AC-9 (a) | FR-19, FR-7 | `buildPromptA`, N markers, `COUNT=N` and verbatim list only; includes Expert-3DPrinter with None manifest block |
| AC-9 (b) | FR-19, NFR-8 | no marker: `userContent` byte-equal to golden |
| AC-9 (c) | NFR-5, FR-19 | `systemBlocks` static |
| AC-9 (d) | FR-19 | `buildPromptADoc` carries the block |
| AC-9 (e) | FR-20 | six asserted properties of the master text |
| AC-9 (g) | FR-14 | H-7/H-8 figure, img and figcaption style; first image without `loading`, rest lazy; `max-content` |
| AC-9 (h) | FR-4, FR-21 | Cyrillic presence, non-generic label, alt differs from figcaption, duplicate-label warning |
| AC-9 (i) | FR-4, FR-21 | Ukrainian fallbacks; non-Cyrillic warning; no English strings |
| AC-9 (k) | FR-21, NFR-12 | OD-25 = A: texts from the manifest, no model call at substitution |
| AC-9 (l) | FR-22, FR-5, FR-8 | H-8: structural styling on all non-video figures the application produces (A-17 scope); captions of non-marker figures unchanged |
| AC-9 (m) | FR-22, NFR-1 | H-8 §9 approval: only the two example figure lines (by content) plus the FR-20 sentence change in the master prompt |
| AC-9 (n) | FR-22 (consequence 3) | operator editing keeps the layout; proposed, needs confirmation at the gate |
| AC-9 (o) | FR-22 (consequence 4) | tests, fixtures and golden updated to the new layout |
| AC-9 (j) | FR-12 | translation propagation unchanged |
| AC-9 (f) | NFR-1 | `task-b.ts`, `task-c.ts`, `output-validator.ts` unchanged; the two approved files edited only as approved |

Requirements not mapped one-to-one to an AC but supporting one: FR-11 (idempotence, A-9) and
FR-8 (coverage ordering, OD-7) support AC-2/AC-3 under the generation gate; both come from
human decisions OD-7/OD-10 and Assumption A-9 rather than from a Story AC.
