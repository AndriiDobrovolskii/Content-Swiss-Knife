---
artifact: ac_test_matrix
story: US-5.1
version: 6
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-03T02:00:00Z
updated_at: 2026-10-04T10:40:00Z
supersedes: docs/tests/US-5.1-ac-test-matrix.md@v5
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
  - key: task_breakdown
    version: 8
  - key: plan_review
    version: 8
  - key: test_strategy
    version: 6
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-5.1 (Specification v9)

Ids are the Story's `AC-1..AC-6` and the Specification's `AC-9 (a)..(o)` (the Story has no AC-7 / AC-8; AC-9 is a
Specification-level criterion, v4). Test names are the exact `it(...)` / `it.each(...)` titles; in an `it.each` title
`%s` is filled by the bracketed rows. Files: `UP` = `src/utils/image-placeholder.spec.ts`, `UD` =
`src/utils/image-placeholder-doc.spec.ts`, `UH` = `src/utils/image-placeholder-html.spec.ts`, `UV` =
`src/utils/image-placeholder-validate.spec.ts`, `OR` = `src/services/content-orchestrator.image-placeholder.spec.ts`,
`FS` = `src/utils/image-figure-style.spec.ts`, `PE` = `src/utils/image-figure-style.prompt-examples.spec.ts`, `VC` =
`src/utils/vision-contract.spec.ts`, `VP` = `src/prompts/vision-prepass.spec.ts`, `TA` = `src/prompts/task-a.spec.ts`,
`TD` = `src/prompts/task-a-doc.spec.ts`, `MM` = `src/prompt-core/master-system-prompt.image-markers.spec.ts`, `RD` =
`src/render/render-description.spec.ts`, `RX` = `src/render/render-description.hook-cta-extra.spec.ts`, `DM` =
`src/domain/description-doc.hook-cta-extra.spec.ts`, `VA` = `src/utils/hook-cta-extra-validators.spec.ts`, `OP` =
`test/openai-provider.spec.ts`. Status at this stage: **RED** = fails now for the stated reason, **GUARD** = already
holds (v5 production code is in the tree, or the case restates unchanged behaviour) and must keep holding.

## AC-1 - a bracketed file-name token is identified as an image placeholder

| File | Test | Status |
|---|---|---|
| UP | `identifies %s as an image placeholder` [`[image-name.jpg]`, `[image-name.webp]`, `[a1.jpg]`, `[photo-2024-03.webp]`, `[a--b.jpg]`, `[-a.jpg]`] | GUARD |
| UP | `is a global, case-sensitive expression (OD-9, OD-17)`; `returns every marker in order of appearance and keeps duplicates`; `finds markers inside surrounding inline markup`; `is not poisoned by regex statefulness between calls` | GUARD |
| UD | `records every exact-grammar marker file found in visible text, matched or not` | GUARD |
| UH | `records visible markers as seen, matched or not` | GUARD |

## AC-2 - a matched marker becomes the image at that position; no literal marker text remains

| File | Test | Status |
|---|---|---|
| UD | `splits a functionality paragraph at the marker: lead-in, figure, continuation, marker text gone`; `uses the preceding paragraph as lead-in when the marker starts its own paragraph`; `emits no empty paragraph when the marker is the whole paragraph`; `emits no empty paragraph when the marker ends the paragraph`; `accepts a lead-in that is not adjacent: a bullet list may sit between lead-in and figure (H-5)` | GUARD |
| UD | `places the figure in an applications paragraph block`; `places the figure in a compatibility paragraph block`; `places the figure in a nested functionality subsection paragraph`; `hosts a figure in the hook: text before stays in hook, the figure and the rest go to hookExtra (OD-15)`; `hosts a figure in the CTA text: the figure and the rest go to cta.extra (OD-15)` | GUARD |
| UD | `processes several markers in one paragraph in order of appearance (FR-6)`; `closes and reopens an inline <b> so no half of a split paragraph is unbalanced`; `never loses a text fragment other than the marker` | GUARD |
| UD | `gives the figure the Ukrainian alt, caption and file from the manifest entry (FR-4, FR-21, A-16)` (`alt` = recorded Ukrainian alt, caption = `<b>label</b> description`, non-empty) | RED: alt/caption still from `altText` / `Image:` |
| UD | `never puts the legacy English altText or caption into a marker figure (A-16, NFR-11)` | RED |
| UD | lead-in rules: `treats a marker with no lead-in inside its section as non-hosting (the lead-in may not cross a section boundary)`; `treats a marker with text before it in its own paragraph as hosting even when it is the first block of its section`; `treats a marker at the very start of the document (hook, no text before) as non-hosting (FR-6)`; `always leaves a preceding paragraph before any figure it places` | GUARD |
| UD | `demotes a marker whose lead-in text would equal the figcaption text (FR-6, FR-13)` | RED (the Ukrainian caption is not built yet) |
| UD | `removes a marker in a %s, warns, and leaves the surrounding text unchanged` [key-benefits bullet text, killer-spec text, applications item text, specification table cell, package-contents item, heading, compatibility bullet text]; `falls back to the end of the document for the image when the marker is non-hosting and no figure exists (OQ-5)`; `keeps a model-placed figure for the file when the marker is non-hosting: the image appears exactly once (H-3)` | GUARD |
| UD | `renders the first marker for a file and only removes the marker text of later ones (Story Q2)`; `is idempotent: a second run changes nothing and adds no figure or warning (FR-11)` | GUARD |
| UD | `drops a model-placed figure for the same file when the marker is hosting, and compacts the figure refs` (marker figure carries the Ukrainian description) | RED |
| UH | `splits the paragraph at the marker into <p>, <figure>, <p> and removes the marker text`; `puts the lead-in from the nearest preceding paragraph when the marker starts its own paragraph`; `accepts a lead-in that is not adjacent: a list may sit between lead-in and figure (H-5)`; `crosses an <h3>: it is not a section boundary (OQ-4)`; `emits no empty paragraph for a marker that is a whole paragraph or ends one`; `processes several markers in one paragraph in order and loses no text`; `closes and reopens an inline <b> around the marker so both halves stay balanced`; `matches a .webp marker by originalFilename and places the .jpg output file (A-5)`; `forms a relative src from the brand and model folders when the image base is empty (A-3, OD-13)` | GUARD |
| UH | `builds a full <img> with src, the Ukrainian alt, and a figcaption with the Ukrainian <b> label (FR-4, FR-14, FR-21)` | RED |
| UH | `does not take a lead-in across a %s: the marker becomes non-hosting` [`<h2>`, `<h1>`, `<hr>`, `</section>`]; `treats a marker with no text before it at the very start of the document as non-hosting`; `removes a marker in a %s, warns, and keeps the surrounding text` [list item, table cell, h2 heading, h3 heading]; `appends the figure at the end, before trailing JSON-LD, when a non-hosting marker has no model figure (OQ-5)`; `keeps a model-placed figure for the file when the marker is non-hosting: the image appears once (H-3)`; `renders the first marker for a file and only removes the marker text of later ones (Story Q2)`; `is idempotent: a second run changes nothing and adds no figure or warning (FR-11)` | GUARD |
| UH | `demotes a marker whose lead-in text equals the figcaption text (FR-13)`; `drops a model-emitted figure for the same file when the marker is hosting`; `drops a bare model <img> for the same file when the marker is hosting` | RED |
| UH | end-append primitive: `adds one figure after the last visible block, preceded by that block as lead-in`; `keeps trailing JSON-LD last`; `keeps trailing meta tags after the figure as well`; `builds a figure that the existing wrapImageFigures pass leaves structurally intact (idempotent)`; `forms a relative src for an empty image base` | GUARD |
| UH | `writes a figcaption with the Ukrainian <b> label and the Ukrainian description, and the Ukrainian alt` | RED |
| UV | dropped marker ends as one figure at the end: `moves the image to the end exactly once and downgrades the error to the Ukrainian warning`; `appends the figure at the end before trailing JSON-LD and downgrades the error to the Ukrainian warning`; `relocates a model-placed figure for the same file to the end so the image appears once (Q-B)` | GUARD |
| OR | `ships a figure at the marker, no marker text, no repair, and the marker image satisfies coverage` (alt = Ukrainian alt; no model call to build it) | RED |
| OR | `hosts a figure in the hook and renders it as the first, eager image (FR-13)`; `spends a full regeneration, names the file in the retry feedback, and accepts a regenerated marker`; `tries the whole ladder, then ships one figure at the end and one Ukrainian warning, with no error left`; `writes the real marker, including a .webp one, into the warning`; `relocates a model-placed figure for the file to the end so the image appears exactly once` | GUARD |
| OR | `places a relative-src figure at the marker for Expert-3DPrinter, which has an empty imageBaseUrl` (Ukrainian alt and caption) | RED |
| DM | `keeps hookExtra on a %s document` [3.0, 4.0]; `keeps cta.extra on a %s document` [3.0, 4.0]; `counts a figure referenced only from hookExtra or cta.extra as referenced (no unreferenced-figure error)`; `rejects a dangling figure ref inside hookExtra`; `rejects a dangling figure ref inside cta.extra`; `rejects one figure referenced twice across hookExtra and the body`; `rejects one figure referenced twice across the body and cta.extra`; `rejects a bullets block inside hookExtra (only paragraph and figure are admitted)` | GUARD |
| RX | `renders the hook paragraph, then the extras in order, before the next section`; `renders the extras after the CTA paragraph, in order`; `keeps the CTA paragraph itself carrying class="cta" and the extra paragraph outside it` | GUARD |

## AC-3 - the substituted image satisfies the AGENTS.md section 4 image criteria

| File | Test | Status |
|---|---|---|
| UD | `wraps the image in a styled figure with a <b>-labelled figcaption and decoding="async"` (exact figure style `max-content`, img style, figcaption `text-align: left`, Ukrainian label and description) | RED: renderer still `fit-content`, caption not Ukrainian |
| UD | `makes the first image in document order eager and every later one lazy, wherever the marker sits`; `never nests a figure inside a paragraph and never leaves a figure without a preceding paragraph`; `keeps the figure alt non-empty and different from the whole figcaption text (FR-13)` | GUARD |
| UH | `first image eager, later images lazy, decoding async, styled figures, figcaptions present` | RED (`max-content`) |
| UH | `raises none of the frozen validator image rules, with the manifest as coverage input`; `never nests a figure in a paragraph, and every figure has a preceding paragraph`; `leaves a video embed, a spec table and the <hr> separators unchanged` | GUARD |
| UP | `takes alt from the recorded Ukrainian alt (A-16), not from the legacy altText`; `builds the caption as <b>label</b> description from the recorded Ukrainian texts`; `guarantees a non-empty alt that differs from the whole figcaption text for every input shape`; `never yields an empty figcaption`; `falls back to the file name (hyphens as spaces) plus a full stop for a missing description, silently`; `falls back to the file name without extension, hyphens as spaces, for a missing alt, silently (A-12)` | RED |
| UP | `uses the urlFilename as the figure file` | GUARD |
| RX | `keys the rule off document position, not off the ref number`; `makes a hook figure the eager one even when the body also has a figure` | GUARD |
| RX | `wraps the hook figure in the styled <figure> with a <figcaption>, decoding async and no nesting in <p>` | RED (`max-content`) |
| UD | `leaves specs, killer specs, meta-bearing fields, videos and their blocks exactly as they were`; `introduces no Markdown and no <br> into any text it writes` | GUARD (FR-15, FR-16) |

## AC-4 - every schema, every store, every locale

| File | Test | Status |
|---|---|---|
| OR | `uses the same manifest for coverage and for the marker step on the Doc store %s` [every `DOC_PIPELINE_STORES` entry] | GUARD |
| OR | `substitutes a marker for the Consumables template (filaments, resins, powders) as for the full description` | GUARD |
| OR | `keeps coverage off for Expert-3DPrinter: an uploaded image with no marker raises no image-manifest rule`; `ships one relative-src figure at the end before any trailing JSON-LD, one Ukrainian warning, no error for it`; `keeps the report of the attempt that actually wins, not the last one produced (N-5)` | GUARD |
| OR | `hands the translation step a master that already contains the figure and no marker text` (locales inherit through the master, OD-12, AC-9 j) | GUARD |
| OR | `(a) grounds a legacy-HTML marker figure whose Ukrainian label, description and alt carry a number the source text lacks, for Expert-3DPrinter`; `(a) on the Doc path: the same number grounded only in the Ukrainian fields passes the numeric gate with no repair` | RED (T10 widening; also blocked by T9 captions) |
| OR | `(b) still rejects an ungrounded number in model-emitted image text (the gate is not disabled)`; `(b) the 75 recorded for one image does not ground a different number in a model-emitted figure on the Doc path`; `(c) keeps a numeric filename-only entry grounded through the marker name in the description` | GUARD |
| UP | `does not name a store from STORE_REGISTRY nor import the registry`; `holds no locale code literal: the Cyrillic proxy is driven by the cyrillicCheck option (A-15)` (NFR-6) | GUARD |
| VA | `does not flag a hook whose words are split across hook and hookExtra`; `still flags a split hook whose combined words exceed the maximum`; `does not flag a CTA whose words are split across cta.text and cta.extra`; `flags a too-long sentence that sits in hookExtra`; `flags a too-long sentence that sits in cta.extra`; `flags «ваше» in a hookExtra paragraph`; controls `control: the same 30-word hook with no extras IS flagged as below the minimum`, `control: the same 30-word CTA with no extras IS flagged as below the minimum`, `control: short extras raise nothing`, `does not flag «ваше» in a cta.extra paragraph (the CTA is exempt)` | GUARD |
| RX | `normalises hookExtra paragraph text exactly as it normalises the hook`; `normalises cta.extra paragraph text exactly as it normalises the CTA text`; `keeps figure refs in the extras untouched` | GUARD |
| DM | `orders hook extras, then keyBenefits, functionality, applications, then CTA extras`; `visits nothing extra for a document without the new carriers`; `hookText returns the hook followed by the paragraph text of hookExtra, and no figure data`; `ctaText returns the CTA text followed by the paragraph text of cta.extra, and no figure data`; `concatenates several extra paragraphs in order` | GUARD |

## AC-5 - an unmatched marker is removed and reported as a non-blocking warning

| File | Test | Status |
|---|---|---|
| UD | `removes an unmatched marker, keeps the text around it, adds no figure, and reports it once`; `treats an entry with %s as unmatched` [status error, status pending, no usable urlFilename] | GUARD |
| UH | `removes the marker, keeps the text, adds no image, and reports the file once`; `treats an entry with %s as unmatched` [status error, status pending, no usable urlFilename] | GUARD |
| UV | `never fires for an unmatched marker: it raises a warning, never an error (FR-9, NFR-9)` (context = the gate label) | GUARD |
| OR | `removes an unmatched marker, adds no image, and warns once without spending a repair`; `removes an unmatched marker with a single non-blocking warning`; `reports an unmatched marker once for the whole run, not once per locale` (context `HTML (base)`) | GUARD |

## AC-6 - bracketed text that is not a file name is left untouched

| File | Test | Status |
|---|---|---|
| UP | `does not treat %s as a placeholder` [`[Image.jpg]`, `[IMAGE-NAME.JPG]`, `[image-name.JPG]`, `[my image.jpg]`, `[a_b.jpg]`, `[a.png]`, `[a.jpeg]`, `[a.jpg.jpg]`, `[.jpg]`, `[note]`, `[1]`, `[see figure 3]`, `[image-name.jpg`, `image-name.jpg]`] | GUARD |
| UD | `leaves %s exactly as written, with no figure and no warning` [`[note]`, `[1]`, `[Image.jpg]`, `[my image.jpg]`, `[a.png]`, `[desk-lamp.JPG]`]; `leaves a mangled marker as plain text and does not count it as seen (OQ-3)`; `ignores a marker inside a figure alt attribute value: not removed, not reported (H-2)`; `ignores a marker in a video title attribute value (H-2)` | GUARD |
| UH | `leaves %s exactly as written, with no warning` [`[note]`, `[1]`, `[Image.jpg]`, `[my image.jpg]`, `[a.png]`]; `ignores markers in meta tags, attributes, JSON-LD, script and style while still processing visible text`; `does not count a marker that only occurs in an attribute as seen (FR-17 relies on this)` | GUARD |
| UD, UH | `returns an equal document and an empty report` / `returns the input unchanged and an empty report when there is no marker (NFR-8)` | GUARD |

## AC-9 (a), (b), (c), (d) - the `[IMAGE MARKERS]` block (FR-19)

| Criterion | File | Test | Status |
|---|---|---|---|
| (a) | TA | `AC-9a: %s gives COUNT=N and every matched file verbatim` [one marker, two markers, three markers]; `AC-9a: a marker repeated in the description is counted once`; `AC-9a: an unmatched or mangled marker is not listed and not counted`; `AC-9a: Expert-3DPrinter, whose [IMAGE MANIFEST] block prints None, still gets the block from the real manifest`; `AC-9a: the block depends only on description + imageManifest, identical for every registered store (any group, imageBaseUrl or none)` | GUARD (A1 edit is in the tree) |
| (b) | TA | `golden case %s: userContent is byte-equal and has no [IMAGE MARKERS]` [`html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`]; `%s: userContent equals the neutral-token build with the tokens restored, and has no block` [an unmatched marker, only an errored-entry marker, a mangled marker] | GUARD |
| (b) | TD | `no-marker golden case %s: userContent byte-equal, no block` [`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`] | GUARD |
| (c) | TA | `%s: no marker filename or COUNT= in any system block`; `%s: systemBlocks deep-equal between a marker input and a no-marker input` [3DPrinter, EXPERT3D, Center 3D Print, Expert-3DPrinter] | GUARD |
| (d) | TD | `%s: carries COUNT=2 and the verbatim matched list, the same block as buildPromptA` [every `DOC_PIPELINE_STORES` entry]; `keeps systemBlocks free of marker data on the Doc path` | GUARD |
| FR-19 wording | TA | `wording: the relocation instruction keeps the marker in the SAME section and never says it may cross one`; `AC-9a: a store absent from STORE_REGISTRY cannot build a prompt (deliveryRegion error), so it is out of AC-9a scope` | GUARD (OI-1: plan outranks spec, human decision) |

## AC-9 (e) - the master prompt marker sentence (FR-20)

| File | Test | Status |
|---|---|---|
| MM | `has the [IMAGE HANDLING] heading line, followed by FIGURE FORMAT`; `keeps every pre-Story line, unchanged and in order`; `still tells the model to delete <img> tags inside [Raw Description] and to emit 0 <img> for Expert-3DPrinter`; `adds new text inside the section (property 4)`; `contains the literals [file.jpg] and [file.webp] (property 1)`; `contains the word "marker" (property 2)`; `states that the Expert-3DPrinter "0 <img>" rule does not apply to markers (property 3)`; `tells the model a bare marker in [Raw Description] is preserved, not deleted as an <img>`; `sits between the pre-Story Expert-3DPrinter line and FIGURE FORMAT, not elsewhere in the prompt`; `does not instruct the model to emit an <img> for a marker (failure path)`; `carries no per-run data: the only filename-shaped tokens are the two literals (property 6)`; `has no ${} interpolation anywhere in the [IMAGE HANDLING] source text (property 6)`; the identical-constant cases for Task A, Task C and the optimizer | GUARD (the two example lines sit after FIGURE FORMAT and do not touch this section) |
| TA (import cycle) | `src/prompts/task-a.import-cycle.spec.ts` (all cases) | GUARD |

## AC-9 (f) - frozen footprint (NFR-1)

Mechanical, not a unit test (test strategy section 6): T11 acceptance (1)-(4) and T13 check `task-a.ts` 17/1,
`master-system-prompt.ts` +5/-2, only the two checksum rows, `task-b.ts` / `task-c.ts` / `output-validator.ts`
absent from the diff, `bash arch-guard.sh`. Supporting unit evidence: `MM` additions-only cases (above) and `PE`
`the example block equals the pre-Story block with the two figure-style lines on max-content`.

## AC-9 (g) - figure, img and figcaption style; first image without `loading` (FR-14)

| File | Test | Status |
|---|---|---|
| FS | `figure %i has the max-content figure style, the img style and a left-aligned figcaption` [0, 1] | RED |
| FS | `keeps the first image eager (no loading attribute), later ones lazy, all decoding="async"` | GUARD |
| UH | `gives the figure the exact FR-14 layout straight out of the step: max-content figure, img style, left figcaption (AC-9 g)`; `gives the appended figure the max-content layout and a left-aligned figcaption (FR-22)` | RED |
| UD | `wraps the image in a styled figure with a <b>-labelled figcaption and decoding="async"`; `makes the first image in document order eager and every later one lazy, wherever the marker sits` | RED / GUARD |
| UV | `Html: the appended figure carries the recorded Ukrainian alt, caption and the max-content layout` | RED |

## AC-9 (h) - Ukrainian language rules, the complete deterministic check (FR-4, FR-21)

| File | Test | Status |
|---|---|---|
| UP | `every one of label, description and alt contains a Cyrillic letter (AC-9 h)`; `trims the recorded label and keeps exactly one trailing colon`; `appends a colon when the recorded label has none`; `collapses a trailing colon run in %j to one colon` [`Результат::`, `Результат:::`, `Результат: :`, `Результат :  : `]; `keeps a label that merely contains a generic word (only equality counts)`; `treats the generic label %j as non-native: the fallback label is used and one image-caption-not-native warning is raised` [`Зображення:`, `Зображення`, `ЗОБРАЖЕННЯ:`, `зображення :`, `Зображення товару:`, `зображення товару`, `Image:`, `Product image:`] | RED |
| UP | `prefixes the Ukrainian "Фото: " when alt equals the whole figcaption text including the label`; `compares after collapsing whitespace`; `keeps alt unchanged when it equals only the description (the label is part of the compared text)`; `never uses the former English "View " prefix`; `escapes <, > and & in the label and the description so the caption stays valid markup` | RED |
| UP | `warns once, for the LATER figure, when two figures share a label, and names that file`; `compares labels trimmed, colon-stripped and ignoring case`; `keeps the text of both figures (no rewording)`; `warns for each later figure when three share a label`; `raises nothing for distinct labels`; `exempts the generic fallback label: it may repeat without a warning`; `is a pure function of the list: the same list gives the same warnings, in order`; `writes the user-facing text in Ukrainian (project rule: QA messages are Ukrainian, NFR-11)` | RED |
| UD | `raises one image-caption-duplicate-label warning for the LATER figure and keeps both captions (rule 5)`; `does not rename the later label automatically (no rewording)`; `exempts the generic fallback label: two legacy entries repeat it with no warning`; `counts a figure appended at the end (non-hosting marker) in document order for the duplicate check` | RED / GUARD (exempt case) |
| UH | `raises one image-caption-duplicate-label warning for the later figure and keeps both captions (rule 5)`; `counts a figure appended at the end (non-hosting marker) in document order for the duplicate check` | RED |
| OR | `reports one image-caption-duplicate-label warning for the later figure and keeps both captions (rule 5)`; `keeps the caption warnings when a block-scoped repair mutates the document afterwards (the report rides on the attempt)` | RED |
| UV | `passes image-caption-duplicate-label through with the gate context and warning severity` | RED |

## AC-9 (i) - Ukrainian fallbacks; non-Cyrillic warning; no English strings (FR-4, FR-21)

| File | Test | Status |
|---|---|---|
| UP | `uses the fallback label without a warning when the recorded label is missing, empty or whitespace`; `falls back to the label and warns when the recorded label has no Cyrillic letter, keeping a native description`; `treats a non-empty description without any Cyrillic letter as empty and raises one not-native warning`; `treats a non-empty alt without any Cyrillic letter as empty and raises one not-native warning`; `raises ONE not-native warning per file even when label, description and alt are all non-native`; `a Cyrillic letter anywhere in the field is enough: the check is a cheap proxy, not a language detector (A-14)` | RED |
| UP | `takes the Ukrainian fallbacks for label, description and alt with no warning`; `never reads the English altText or visionDescription of such an entry (A-16)`; `carries no English fallback string: no "Image:", "Product image", "View"` [entry created before this Story] | RED |
| UP | `no longer exports IMAGE_CAPTION_LABEL`; `contains none of the former English fallback strings`; `contains the hardcoded Ukrainian fallback label and alt prefix` (NFR-11) | RED |
| UP | `with the check off, non-empty text is used as recorded and raises no not-native warning`; `with the check off, an empty field still takes the Ukrainian fallback (the non-empty test)`; `with the check on, the same English entry takes the fallbacks and raises one warning` (A-15) | RED |
| UD | `uses the Ukrainian fallbacks, silently, for an entry created before this Story (FR-4, AC-9 i)`; `raises one image-caption-not-native warning and uses the fallback for a non-Cyrillic recorded field`; `treats a recorded generic label as non-native: the fallback label plus one warning`; `gives the figure appended at the end the Ukrainian builder output, never an English string (OI-7)`; `with cyrillicCheck off the English text is used as recorded and raises no caption warning (A-15)`; `is idempotent for the caption warnings: a second run raises none (FR-11)`; `writes a caption the schema accepts for every recorded-field shape` | RED (idempotent case GUARD) |
| UH | `uses the Ukrainian fallbacks, silently, for an entry created before this Story (FR-4, FR-21, AC-9 i)`; `raises one image-caption-not-native warning, naming the file, when a recorded field has no Cyrillic letter`; `never raises an error-severity issue for a caption problem (NFR-9)`; `with cyrillicCheck off the English text is used as recorded and raises no caption warning (A-15)` | RED |
| UV | `Doc: an entry created before this Story takes the Ukrainian fallbacks, with only the FR-18 warning and no English string`; `Doc: a non-native recorded field raises one image-caption-not-native warning next to the FR-18 warning`; `Html:` twins of both; `passes image-caption-not-native through with the gate context and warning severity` | RED |
| OR | `ships a figure with the Ukrainian fallbacks for an entry created before this Story, without failing or repairing (NFR-12)`; `reports one image-caption-not-native warning with the gate context and spends no repair on it (NFR-9)`; `on ladder exhaustion the appended figure is the Ukrainian one and a non-native field adds one caption warning`; `applies the Cyrillic check in the uk-UA master: an English recorded alt never reaches the shipped figure (A-15, NFR-6)`; legacy path: `reports one image-caption-not-native warning for a non-native recorded field and ships the Ukrainian fallback figure`, `ships the Ukrainian fallbacks without any warning for an entry created before this Story (NFR-12)`, `the end-append after ladder exhaustion carries the Ukrainian label and alt` | RED |

## AC-9 (j) - propagation to other locales by translation only (FR-12, OD-12)

| File | Test | Status |
|---|---|---|
| OR | `hands the translation step a master that already contains the figure and no marker text` (every translation call receives the master with the figure `src` and no marker; no per-locale substitution exists) | GUARD |

## AC-9 (k) - texts come from the manifest; no prompt carries them; old entries do not fail (FR-21, NFR-12)

| File | Test | Status |
|---|---|---|
| TA | `%s: no sentinel in userContent or any system block, with and without markers`; `%s: userContent and systemBlocks are byte-identical whether or not the entries carry the Ukrainian fields` [3DPrinter, EXPERT3D, Center 3D Print, Expert-3DPrinter; both `buildPromptA` and `buildPromptADoc`] | GUARD (type-red until T4; runtime green because the FROZEN `buildImageBlock` never reads the fields) |
| VC | `returns label, description and alt next to the caption, each trimmed`; `parses a caption-only reply (an old or partial reply) without throwing and without the new fields`; `drops a label that is %s and never throws` [a number, null, an object, an array, a boolean, an empty string, whitespace only]; `drops a non-string description or alt independently of the other fields`; `keeps a long Ukrainian description: no word ceiling is applied to the new fields`; `parses the three fields out of a fenced reply` | RED |
| VC | `maps label, description and alt to the three Ukrainian entry fields and nothing else`; `yields an empty patch for a caption-only result (the English caption is never copied in)`; `maps only the fields that are present`; `never carries the caption into visionDescriptionUk, visionLabelUk or visionAltUk` | RED |
| VC | `still throws on a missing caption, even when the three new fields are present`; `still throws on a caption over 20 words and keeps the retry text the caller matches on` | GUARD |
| VP | `advertises exactly the four keys caption, label, description and alt`; `a reply carrying every advertised key round-trips through the parser into the entry patch`; `instructs the three texts to be written directly in Ukrainian`; `says the Ukrainian texts are not translated from the English caption (native generation)`; `asks for an image-specific label, never a generic one`; `asks for an uppercase initial on the label (the frozen lead-in-capitalization warning, OI-9)`; `asks for one sentence each for description and alt, and for them to differ` | RED |
| VP | `keeps the English caption and its 20-word limit instruction`; `takes no store or locale parameter (plan D5, OI-4): the signature stays (productName, specsExcerpt?)`; `still grounds on the product name and the specs excerpt` | GUARD |
| OP | `allows 1000 output tokens for an image analysis, matching the Anthropic non-thinking cap` (NFR-12, other providers unchanged) | RED |
| OR | `ships a figure at the marker, no marker text, no repair, and the marker image satisfies coverage` (asserts `llm.generateText` never called: no model call at substitution) | RED |

## AC-9 (l) - structural styling on every non-video figure the application produces (FR-22, A-17)

| File | Test | Status |
|---|---|---|
| FS | surface 1, renderer: `figure %i has the max-content figure style, the img style and a left-aligned figcaption`; `produces no fit-content anywhere in a document with image figures` | RED |
| FS | surface 2, `wrapImageFigures`: `gives a bare <img> the max-content figure style, the img style and decoding="async"`; `restyles a figure that arrives with the former fit-content width (a model-emitted legacy figure follows as a side effect, U-13)`; `gives an existing figcaption text-align: left and keeps its inner HTML`; `is idempotent on already-wrapped figures`; `keeps first-eager / rest-lazy` | RED / GUARD |
| FS | surface 3, editor node: `defaults a hand-inserted figure to the max-content figure style`; `defaults the image and the figcaption to the shared img style and left-aligned caption` | RED / GUARD |
| FS | video unchanged: `a rendered video figure keeps its own style and never takes the image figure style`; `wrapImageFigures does not restyle a video figure` | GUARD |
| FS | agreement: `exports the three constants with exactly the specified literals`; `renderer, wrapImageFigures and the editor node all carry the one IMAGE_FIGURE_STYLE` | RED (module absent) |
| UD | `a model-placed figure kept by FR-5 (non-hosting marker) is rendered with max-content and a left-aligned figcaption`; `a figure appended at the end is rendered with max-content, a left-aligned figcaption and no fit-content anywhere` | RED |
| PE | `example figure %i carries exactly the FR-14 figure style (max-content)` [0, 1]; `has the FIGURE FORMAT block with two example figures (Image #1 eager, Images #2+ lazy)`; `keeps the example <img> style and the left-aligned example figcaption`; `keeps the first example eager (no loading attribute) and the second lazy, decoding="async" on both` | RED (first two) / GUARD |
| RD, RX | `renders a fully-populated document to the production HTML shape` (inline snapshot, 3 figures); `wraps the hook figure in the styled <figure> with a <figcaption>, decoding async and no nesting in <p>` | RED |
| (corpus) | `test/render-reconciliation.spec.ts`: `renders to HTML equal to production after whitespace normalization` [`expert3d-ortur-h20-20w`; the `center-3d-print` row shares the file] against the token-updated `.uk-UA.html` | RED |

## AC-9 (m) - FROZEN master-prompt example lines (FR-22 consequence 2, NFR-1)

| File | Test | Status |
|---|---|---|
| PE | `the example block equals the pre-Story block with the two figure-style lines on max-content`; `no longer teaches the former fit-content width anywhere in the master prompt` | RED until T11 |
| (mechanical) | diff against HEAD by content: +5 / -2, the two removed lines are the example `<figure style>` lines; golden review (test strategy section 5); T11 acceptance, T13 | T11, T13 |
| `src/prompts/full-description.golden.spec.ts` | `%s: systemBlocks and userContent are byte-equal` [`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`] against the golden that now carries `max-content`; the two `translate/*` cases stay green | RED (10) / GUARD (2 translate) |

## AC-9 (n) - operator editing keeps the layout (FR-22 consequence 3)

| File | Test | Status |
|---|---|---|
| `src/app/components/html-editor/extensions/round-trip.spec.ts` | `preserves first-image eager loading (no loading attr) and subsequent lazy loading` (2 input figures now `max-content`; asserts attributes survive the schema round trip) | GUARD (the editor keeps incoming `style`) |
| FS | `cleanHtmlStructure leaves the figure, img and figcaption styles of a max-content figure unchanged` | RED (cleaning re-asserts `fit-content`) |
| `src/utils/html-cleaner.spec.ts` | `wraps a bare <img> in a <figure> without inventing a <figcaption>` (figure style `max-content`) | RED |
| `src/utils/image-figure.spec.ts` | the two figure-style pins (`max-content`) | RED |

## AC-9 (o) - the suite is updated to the new layout, with no weaker assertion

Every pre-existing `fit-content` pin was moved to `max-content` with the same assertion shape (`round-trip.spec.ts` x2,
`render-description.spec.ts` x3, `render-description.hook-cta-extra.spec.ts`, `html-cleaner.spec.ts`,
`image-figure.spec.ts` x2, `image-placeholder-doc.spec.ts`, `image-placeholder-html.spec.ts`, both corpus
`.uk-UA.html`, the golden). Remaining `fit-content` hits in the repository after this stage:
`src/utils/__fixtures__/description_uk-UA.original.html` / `.corrected.html` (ground-truth inputs, plan U-15, 15 each,
unedited), the three production constants and the two FROZEN master lines (builder tasks T8, T11), and `AGENTS.md`
section 4 (T12). The final grep is T13's. Unit evidence that no non-video figure the application produces keeps
`fit-content`: the `FS` and `UD` `no fit-content` cases above.

## Requirements with no AC row of their own

FR-8 (coverage order) and FR-11 (idempotence) support AC-2 / AC-3: `UD`/`UH` idempotence cases, `OR` coverage cases.
NFR-3 / NFR-12 (provider independence, tolerant Vision parse): `VC`, `OP`. NFR-8 (no marker, unchanged): `OR`
`behaves exactly as before for a description without markers (NFR-8)`, `UD`/`UH` empty-report cases, `TA`/`TD`
byte-equality. NFR-10 (native generation): `VP`. NFR-11 (Ukrainian-only hardcoded strings): `UP` source-text cases.

## v6 change note

Loop-back (TEST_WRITING attempt 2, `changes_required_tests`): two spec defects fixed, no change to
levels, runners or AC-to-test mapping. `image-figure-style.spec.ts` now awaits `loadStyleModule()` in
the two "agreement between the surfaces" cases; `image-placeholder-doc.spec.ts` builds
`SAME_LABEL_KETTLE` from `KETTLE` with only the label overridden. Stage-map expectation: TEST_WRITING
tests normally fail pre-implementation; here they are expected green because production already exists
(loop-back). Verified: the two files 88/88 pass, `npm run test:logic` 4506 passed / 3 skipped, lint clean.
