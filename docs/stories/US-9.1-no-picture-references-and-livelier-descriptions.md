---
artifact: story
story: US-9.1
slug: no-picture-references-and-livelier-descriptions
title: Stop generated descriptions from pointing at their pictures and make the uk-UA text less dry (Creality Pika regression)
track: prompt
version: 6
status: ARCHIVED
owner: so-story-writer
created_at: 2026-10-17T18:00:00Z
updated_at: 2026-10-19T14:50:33Z
---

# US-9.1 — No picture references, livelier descriptions

## Story

> Bug Story — **Observed / Expected / Reproduction** replace the usual actor sentence.

**Actor:** a content operator generating a product description (UA Description / Generator), and
through them the end reader of the product page.

### Observed

For the product Creality Pika (store EXPERT3D, uk-UA), the generated description
(`Knowledge/Issues/4/description_uk-UA.html`) has two defects.

**P1 — the text points at the pictures.** Phrases such as «показано на зображенні», «видно на»,
«нижче», «Колаж показує…», «На фото…» appear in the paragraph above every figure (all 19) and in
16 of 19 figcaptions (8 start with «На фото/зображенні…», 7 with «Колаж/Схема показує…», 1 with
«Рекламний банер, на якому…»); the reported total is 35 hits. Six independent sources in the prompts and
utilities each ask for or model this phrasing (see `Knowledge/Issues/4/prompt-changes.spec.md` §2).
The figcaption text is the Vision pre-pass `description` copied unedited, so fixing only the
description prompt does not fix captions.

**P2 — the text is dry.** Facts are listed without a consequence for the reader. Measured: 81
sentences, mean length 12.2 words, «тож» 7 times, the hook describes a photo («На столі лежить
пошкоджена деталь…»), the five «Застосування» bullets share one template, the hook is 48 words
(requirement 40–85).

### Expected

The description states product facts directly and never refers to the picture or to the page layout
(in body, figcaption or `alt`, in any output language). The text keeps `EXPERT3D_TOV_BASE_OVERLAY`'s
"emotionally neutral" constraint and `STRICT INPUT SCOPE`: it gains life through structure, rhythm
and contrast, not emotion and not new facts. The reference output for this input is
`Knowledge/Issues/4/creality-pika-uk-v2.html` (0 picture references, 74 sentences, mean 14.2 words,
σ 6.5, 12 sentences ≤ 6 words, «тож» 1, «Тому» 1, all numbers from the source).

### Reproduction

1. Store EXPERT3D, template/product Creality Pika, the Original Description and images from
   `Knowledge/Issues/4/`.
2. Run Generator / UA Description with the images uploaded (Vision pre-pass on).
3. Search the output for «на зображенні», «на фото», «нижче», «показано», «Колаж показує» in
   the paragraph above each `<figure>`, in each `<figcaption>` and in each `alt`.

## Context

Reported by the operator on 2026-10-17 with the generated description and a hand-corrected
reference `creality-pika-uk-v2.html`. `Knowledge/Issues/4/prompt-changes.spec.md` is the operator's
analysis: root causes S1–S6, proposed text for each prompt change (FR-1 … FR-16), a deterministic
detector (FR-9), a test list and Creality Pika acceptance numbers. This Story adopts that analysis as
its requirements source; the Specification stage turns it into numbered requirements.

**Operator decisions (2026-10-17):** the liveliness rules apply to **all ToV blocks** (resolved as
shared master-prompt rules plus per-block additions). The original FR-16 (new input fields) was in scope
and was **withdrawn by the owner on 2026-10-19** (see "Amendment", v5). Q1–Q6 raised at Story creation
were answered the same day, checked against `src`, and are recorded under "Resolved decisions". Q1 was
superseded by OD-1 and then withdrawn with the fields.

## Scope

| | |
|---|---|
| **Stores** | All stores in `STORE_REGISTRY` (every profile / ToV block) |
| **Locales** | uk-UA master; the picture-reference ban applies to every output language. A uk-UA change fans out to every translated language |
| **Surface** | `src/prompt-core/constants.ts`, `src/prompt-core/master-system-prompt.ts`, `src/prompts/vision-prepass.ts`, `src/prompts/task-a.ts`, `src/prompts/task-a-doc.ts`, `src/utils/video-manifest.ts`, `src/utils/output-validator.ts`, `src/utils/image-placeholder.ts`, new `src/utils/image-deixis.ts`, `src/services/content-orchestrator.service.ts` (two warning texts), `EXPERT3D_TOV_BASE_OVERLAY` (FR-14, FR-15) and a new measurement script `tools/measure-description.ts`. The Generator input form, `ProductInput`, `numericFidelitySources` and the `STRICT INPUT SCOPE` text are **not** touched (the operator-notes fields were withdrawn in v5). `runFaqPipeline`, `src/utils/faq-form.ts` and the translation prompts (`task-c.ts`, `task-translate.ts`) are not touched |
| **Touches FROZEN files?** | **YES** (AGENTS.md §9 stop): `src/prompts/task-a.ts`, `src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`. `task-a.ts` is a FROZEN file and is changed for one reason (the existing lead-in wording in AC-3). Per-file approvals are on record in `docs/workflow/history.jsonl`: on 2026-10-18T15:24:23Z the owner gave one explicit instruction for each of the three FROZEN files (`modify src/prompts/task-a.ts, modify src/utils/output-validator.ts, modify src/prompt-core/master-system-prompt.ts`), and on 2026-10-19 the owner instructed `modify master-system-prompt.ts, modify task-a.ts, так` for the operator-notes withdrawal hunks. `bash arch-guard.sh --rebaseline` runs in the same commit as each FROZEN-file change. The master prompt change also invalidates the prompt cache once for all stores |
| **Touches generated HTML?** | Yes — AGENTS.md §4: every `<figure>` keeps a `<p>` directly above it (the §4 "lead-in" bullets), the lead-in must not duplicate the `<figcaption>`, `alt` must not duplicate the `<figcaption>`, first-image/lazy rules, video `<figure>`/`<figcaption>` rules. These must not regress |

## Acceptance criteria

Deterministic criteria (AC-1 – AC-8) are unit-testable. AC-9 is withdrawn (v5). AC-10 – AC-12 were to be measured on a live
Creality Pika run and cannot be pinned by a prompt test (spec §6 risks). AC-11 and AC-12 are WAIVED in v6 (see
the waiver notes under each and "Amendment", v6); AC-10 (the script) stays in scope.

- **AC-1:** The Vision pre-pass prompt instructs that `description` never begins with and never
  contains «На зображенні», «На фото», «На знімку», «На кадрі», «Зображено», «Показано», «Видно»,
  never names the medium and never makes it the subject of a verb; `alt` starts with the subject
  noun, differs from `description` and uses one alphabet per word. Its Grounding rules section contains
  `State only what is visible; never infer operating modes, compatibility or requirements`. The phrases `one sentence`,
  `differ` and `NUMBERS ARE THE HIGHEST-RISK ELEMENT` are still present.
- **AC-2:** The master system prompt contains a `[NO PICTURE REFERENCES` rule covering body,
  figcaption and `alt` in all languages, defined as a `constants.ts` constant outside the
  `[IMAGE HANDLING]` block; it no longer contains `SUBSTANTIVE NARRATIVE SENTENCE`, `shown here`
  or `The image below shows`; it still requires a narrative `<p>` directly above every `<figure>`.
- **AC-3:** `task-a-doc.ts`, `task-a.ts` (instruction, `buildVideoBlock`, `buildMarkerBlock`),
  the C3D override text in `constants.ts`, the validator's `image-manifest-missing` and
  `video-embed-missing` messages and the two warnings in `content-orchestrator.service.ts` no
  longer ask for a lead-in that "introduces what the image shows" or points at the video; they ask
  for a body paragraph stating a product fact. Phrases pinned by existing specs («`<figure>` directly
  after a `</ul>`», «no orphan images», `IMAGE GROUNDING LOCK stands`) are preserved.
- **AC-4:** No template in `LEAD_IN_TEMPLATES` (`video-manifest.ts`) contains «нижче», «below»,
  «ниже», «poniżej», «unten», «abaixo» or «siguiente».
- **AC-5:** `findImageDeixis` has a pattern for each of the seven base languages of `STORE_REGISTRY`
  (uk, ru, en, pl, de, es, pt), selected by the primary subtag (so en-ES, en-US, en-GB map to `en`
  and es-MX to `es`). For uk it returns a match for «Ряд із трьох круглих модулів ззаду показано на
  зображенні», «Три кадри показують…» and «Нижче розміщено відео…» and `null` for «Режим працює від
  -10 °C» and «Сенсорний екран запускає сканування й показує 3D-модель»; every other language has at
  least 2 positive and 2 negative tests; an unknown language returns `null`.
- **AC-6:** `collectFigureDeixis` inspects only the paragraph directly above each `<figure>`, each
  `<figcaption>` and each `alt`: a deixis phrase in any of these three is reported; the same phrase in
  a non-adjacent paragraph is not.
- **AC-7:** `validateGeneratedHtml` emits rule `image-deixis` at level `warning` for a deixis phrase
  in a paragraph above a figure, and does not fire for «нижче -10 °C» outside a figure context.
  `figureCaptionWarnings` emits `image-caption-deixis` at level `warning`.
- **AC-8:** SCENE, RHYTHM, HONEST LIMITS and HOOK (spec FR-10, FR-11, FR-12, FR-13) are one shared
  constant interpolated into the master system prompt, so every store gets them; the shared block
  states that where a store voice block defines its own bullet form, heading form, tone or punctuation
  limits, that block wins. APPLICATIONS and HEADINGS (FR-14, FR-15) are added to
  `EXPERT3D_TOV_BASE_OVERLAY` only. `C3D_TOV_BASE_OVERLAY` is not given FR-14/FR-15 (its OVERRIDE #1
  and SIGNATURE MOVE #2 already cover them). `task-c.ts` and `task-translate.ts` are not edited;
  description-translation prompts and the optimizer inherit the new master text through block 0
  (`systemBlocks[0]`; their block 1 and `userContent` do not change); and the shared liveliness block
  states that its rules govern writing a new description, while a translation keeps the source's
  sentences. Each ToV
  block keeps its own tone limits (EXPERT3D: emotionally neutral, no excitement, no exclamation marks;
  C3D: calm, zero exclamation marks, at most 1 em-dash per 400 words).
- **AC-9:** **Withdrawn in v5 (2026-10-19, owner decision).** The four optional Generator textareas, the
  `ProductInput.operatorNotes` carrier, the `[Operator Notes]` block and the related changes to
  `STRICT INPUT SCOPE` and `numericFidelitySources` are not part of this Story. The number AC-9 is kept
  so that AC-10 – AC-12 are not renumbered.
- **AC-10:** `tools/measure-description.ts` takes a generated HTML and the input description, reuses
  `collectFigureDeixis`, and reports: deixis hits (three carriers), figures without a paragraph above,
  consecutive figures, numbers absent from the input, «тож» + «Тому» count, sentences ≤ 6 words per §3
  section, mean sentence length and σ, hook word count. It exits non-zero when a hard threshold is
  violated (AC-11 hard items, AC-12 numbers).
- **AC-11:** Hard (script): on live runs for each of three products — Creality Pika (EXPERT3D), one
  Center 3D Print product, one product from a store with no ToV block (3DDevice) — 0 deixis hits in the
  paragraph above each figure, each figcaption and each `alt` (Creality Pika baseline: 35), no figure
  without a paragraph above it, no two figures in a row.
  > **WAIVED (v6, 2026-10-19, owner decision).** The hard script criteria of AC-11 are waived for this
  > delivery by the owner, on the basis of the owner's manual testing. They are NOT measured: no
  > `tools/measure-description.ts` output, no product list and no run count exists. The headline outcome (0
  > picture references) is accepted on the owner's word, not on script evidence. The criterion text above is
  > kept unchanged so the intent stays readable.
- **AC-12:** Hard (script): 0 numbers absent from the input on the same runs. Soft (reported, not
  blocking, reviewed by the operator): three items, of which at least 2 of 3 must hold — (1) «тож» +
  «Тому» count ≤ 2; (2) mean sentence length ≥ 12 **and** σ ≥ 5.5, counted as one item; (3) the hook
  names the buyer's task / use case (manual check). The number of sentences of 6 words or fewer in each
  §3 section is reported with no threshold. Manual (operator):
  no fact absent from the input, reviewed from the list of sentences containing numbers and proper
  names that the input lacks.
  > **WAIVED (v6, 2026-10-19, owner decision).** The hard script criterion of AC-12 (0 numbers absent from
  > the input) is waived for this delivery by the owner, on the basis of the owner's manual testing. It is
  > NOT measured: no `tools/measure-description.ts` output, no product list and no run count exists. The
  > headline outcome (0 invented numbers) is accepted on the owner's word, not on script evidence. The soft
  > and manual items above are likewise not evidenced by any recorded run. The criterion text above is kept
  > unchanged so the intent stays readable.

## Out of scope

- Raising `image-deixis` from `warning` to `error` — spec FR-9 defers that to "after several real
  runs"; it is a follow-up decision, not part of this delivery.
- Any change to store registry, models/providers, template schemas, or non-image tone rules not listed
  in FR-10 – FR-15.
- Re-analysing images already marked `done` in the current session. Vision results live only in the
  in-memory `genImgManifest` signal (blob URLs, not persisted), so a fresh upload after reload is
  analysed with the new prompt; a forced re-run of `done` entries is not required.
- Any new Generator input field for operator-supplied facts (usage scenarios, test results, comparison with
  the previous generation, limitations), and any change to the FAQ form's `supplementalContent`.
- Native-speaker review of the pl/de/es/pt deixis patterns; it is a precondition for promoting
  `image-deixis` to `error`, not for this delivery.
- Editing AGENTS.md §4 (carried verbatim).

## Resolved decisions

Questions Q1–Q6 raised when the Story was created, answered by the operator on 2026-10-17 and checked
against `src` (`task-a.ts:166` `[Supplemental Content]`, `numericFidelitySources` in
`content-orchestrator.service.ts`, the ToV overlays in `constants.ts`, `genImgManifest` in
`app.component.ts`). Each is reflected in the acceptance criteria above.

- **Q1 (input fields) — superseded by OD-1, 2026-10-17, and withdrawn with the fields, 2026-10-19 (v5):** the original answer was "no new
  `ProductInput` field; the four textareas feed the existing `supplementalContent`; `task-a.ts` is not
  changed for this". The owner replaced it with decision OD-1 (resolved (b)), see "Amendment". The four
  fields now travel in a new optional `ProductInput.operatorNotes`, `task-a.ts` (FROZEN) emits an
  `[Operator Notes]` block, and `STRICT INPUT SCOPE` and `numericFidelitySources` are extended. → AC-9
  (withdrawn in v5).
- **Q2 (ToV blocks):** shared FR-10/11/12/13 in the master prompt; FR-14/15 only in the EXPERT3D
  overlay; C3D already covers them; translation prompts untouched; the store voice block wins on
  conflict. → AC-8.
- **Q3 (locales):** all seven base languages of `STORE_REGISTRY`, selected by primary subtag; severity
  stays `warning`. → AC-5.
- **Q4 (stored Vision results):** no migration; results are not persisted across sessions. → Out of scope.
- **Q5 (Vision grounding sentence):** in scope, one line in `vision-prepass.ts`. → AC-1.
- **Q6 (measurement):** script for mechanical metrics, operator checklist for qualitative ones;
  three products, not one; liveliness metrics are soft. → AC-10 – AC-12.

## Amendment

### v2 — 2026-10-17T15:08:25Z — decided by the owner (human operator, sbruhov@gmail.com)

**What changed:** Q1 and AC-9 were rewritten, and the Surface and FROZEN-file rows of the Scope table
were updated. The input carrier for the four Generator textareas moved from the existing
`supplementalContent` (no new field, no `task-a.ts` change) to a new optional `ProductInput.operatorNotes`
rendered by `task-a.ts` as an `[Operator Notes]` block. All other content is unchanged.

**Why:** `supplementalContent` is the only FAQ trigger in the Generator, so putting the four fields
there would have started FAQ generation whenever one of them was filled.

**Recorded decision (2026-10-17), original text:**

> OD-1 — resolved (b). Чотири поля не потрапляють у supplementalContent, бо це поле є єдиним тригером FAQ у Генераторі. Носій: нове необов'язкове ProductInput.operatorNotes (структурований об'єкт з чотирма ключами). У task-a.ts виводиться блок [Operator Notes]; порожній об'єкт не змінює userContent. STRICT INPUT SCOPE і numericFidelitySources розширюються. runFaqPipeline і faq-form.ts не змінюються.

English rendering:

> OD-1 — resolved (b). The four fields do NOT go into supplementalContent, because that field is the only FAQ trigger in the Generator. Carrier: a new optional ProductInput.operatorNotes (a structured object with four keys). task-a.ts emits an [Operator Notes] block; an empty object leaves userContent unchanged. STRICT INPUT SCOPE and numericFidelitySources are extended. runFaqPipeline and faq-form.ts are unchanged.

**FROZEN file:** `task-a.ts` is FROZEN (AGENTS.md §9). This amendment does not claim approval to change
it; the explicit per-file approval is still deferred to the plan gate.

### v3 — 2026-10-17T15:49:00Z — decided by the owner (human operator, sbruhov@gmail.com) at HUMAN_SPEC_APPROVAL

**What changed:** only the soft part of AC-12. Before: at least three of four soft items must hold
(«тож» + «Тому» ≤ 2; ≥ 1 sentence ≤ 6 words in every §3 section; mean length ≥ 12 and σ ≥ 6; hook starts
from the buyer's task). After: three soft items, at least 2 of 3 must hold, still non-blocking — (1)
«тож» + «Тому» ≤ 2; (2) mean sentence length ≥ 12 and σ ≥ 5.5 as one item; (3) the hook names the buyer's
task / use case (manual). The per-section count of sentences of 6 words or fewer is now reported with no
threshold. The hard criteria of AC-12 and every other AC are unchanged.

**Why:** the Specification's calibration showed the reference output (`creality-pika-uk-v2.html`) met only
1–2 of the old four soft items, so the old "three of four" bar was not reachable by the owner's own
reference.

**Recorded decision (2026-10-17), original text:**

> AC-12: amend soft part to {tozh+Tomu <= 2; mean >= 12 and sigma >= 5.5 as one item; hook use-case names the buyer's task (manual)}, need 2 of 3, non-blocking. Per-section short-sentence count reported, no threshold. D-6 unchanged.

### v4 — 2026-10-17T19:33:15Z — decided by the owner (human operator, sbruhov@gmail.com) in response to plan-review blocker B1

**What changed:** only the last sentence of AC-8. Before: "The translation prompts get no liveliness
rules." After: `task-c.ts` and `task-translate.ts` are not edited; description-translation prompts and the
optimizer inherit the new master text through block 0 (`systemBlocks[0]`; their block 1 and `userContent`
do not change); and the shared liveliness block states that its rules govern writing a new description,
while a translation keeps the source's sentences. No other sentence of the Story restated the old claim, so
no other criterion, the Scope table, Out of scope or the Q entries were touched.

**Why:** plan-review blocker B1 (`docs/reviews/plans/US-9.1-plan-review.md`). The old sentence was
unsatisfiable: the edited `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` of every Task C description-translation
prompt (`src/prompts/task-c.ts:89`) and of the optimizer (`src/prompts/optimizer.ts:124`), so those prompts
necessarily receive the new master text.

**Recorded decision (2026-10-17, `docs/workflow/history.jsonl`, last event, actor sbruhov@gmail.com):**

> Owner decision on plan-review blocker B1: Story AC-8 last sentence is reworded at FILE level (task-c.ts and task-translate.ts not edited; translation prompts and optimizer inherit the new master via block 0; block 1 and userContent unchanged). A self-scoping sentence in LIVELINESS_RULES (rules govern writing a new description; a translation keeps the source sentences) is added to the spec. Plan question Q1 (a/b Task C guard) remains the humans at the plan gate.

**Not decided here:** plan question Q1 (the a/b Task C guard) stays with the humans at the plan gate. The
Specification change the decision mentions (the self-scoping sentence in `LIVELINESS_RULES`) belongs to the
Specification stage and is not made by this Story amendment.

### v5 — 2026-10-19T07:25:00Z — decided by the owner (human operator, sbruhov@gmail.com)

**What changed:** the operator-notes feature is withdrawn. AC-9 is replaced by a withdrawal stub; the Scope
table (Surface and FROZEN-file rows), Context, Out of scope, Q1 and Open questions are updated to match. No
other criterion changed. `task-a.ts` stays in scope for the AC-3 wording only; `master-system-prompt.ts`
stays in scope for the other rules.

**Why:** the owner decided the four fields (usage scenarios, test results, comparison with the previous
generation, limitations) are not needed.

**Recorded decision (2026-10-19, `docs/workflow/history.jsonl`, last event, actor sbruhov@gmail.com), original text:**

> досліди можливість безпечного видалення цих полів. вони не потрібні
>
> modify для task-a.ts та master-system-prompt.ts, шлях 1

English rendering:

> Investigate whether these fields can be removed safely. They are not needed.
>
> Modify task-a.ts and master-system-prompt.ts, path 1 (amend US-9.1 on its branch).

**Consequence:** the Specification is revised (FR-24 – FR-31, FR-40, FR-41 withdrawn) and passes SPEC_REVIEW
and HUMAN_SPEC_APPROVAL again; plan, task breakdown, tests and reports are then reconciled with it.

### v6 — 2026-10-19T14:50:33Z — decided by the owner (human operator, sbruhov@gmail.com) at the AC-11/AC-12 reconciliation blocker

**What changed:** only the acceptance status of AC-11 and AC-12. Their criterion text (thresholds, the three
products, the hard/soft split) is unchanged; each now carries a marked waiver note: the hard script
criteria are WAIVED for this delivery by the owner on the basis of the owner's manual testing, and are NOT
measured. The sentence introducing the acceptance criteria and the "Touches FROZEN files?" row of the Scope
table were also corrected (the row said no per-file approval had been given; the approvals on record in
`docs/workflow/history.jsonl` are 2026-10-18T15:24:23Z for the three FROZEN files and 2026-10-19 for the
operator-notes withdrawal hunks of `master-system-prompt.ts` and `task-a.ts`). AC-1 – AC-10 text, Scope
(other rows), Out of scope and the Q entries are untouched. AC-10 (`tools/measure-description.ts`) stays in
scope.

**Why:** the live-run criteria could not be met as written. The owner found the 6-run measurement (three
products, two runs each) too hard and tested generation manually instead. No `measure-description.ts`
output, product list or run count exists, so the headline outcome of the Story (0 picture references, 0
invented numbers) is **unmeasured**; it is accepted on the owner's word, not on script evidence.
`so-reconciliation-reviewer` returned BLOCKED (reconciliation_report v3) because the earlier owner
statement was neither script evidence nor an explicit waiver.

**Recorded decision (2026-10-19, `docs/workflow/history.jsonl`, last event, actor sbruhov@gmail.com), verbatim:**

> Waive the AC-11/AC-12 hard script criteria for US-9.1; accepted on my manual testing

Owner context (previous owner event in the same file, 2026-10-19T14:42:16Z), original text:

> Це дуже важко. Я зробив простіше. Було проведено тестування генерації товарів. Все працює так як треба.

English rendering:

> This is very hard. I did it a simpler way. Product generation testing was carried out. Everything works as it should.

**Consequence:** the Specification (FR-34, FR-35, OD-11), the `ac_test_matrix` and the reconciliation report
must be revised to the waiver and re-reviewed; the Specification v7 approval does not cover this change.
Until then the AC-11/AC-12 rows cannot be reconciled as measured. The delivery ships with the headline
outcome unmeasured and accepted on the owner's word.

## Open questions

None.

## References

- `Knowledge/Issues/4/prompt-changes.spec.md` — root causes, proposed prompt text, detector design,
  tests, acceptance numbers
- `Knowledge/Issues/4/description_uk-UA.html` — generated description with the defects
- `Knowledge/Issues/4/creality-pika-uk-v2.html` — corrected reference output
- AGENTS.md §4 (HTML acceptance criteria), §9 (FROZEN files), §11 (Open Decisions)
- Related: US-5.1 (image placeholder substitution), US-7.1 (prompt-level fix across modes)
