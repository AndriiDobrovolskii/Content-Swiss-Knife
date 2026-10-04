---
artifact: open_decisions
story: US-5.1
version: 6
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-03T23:45:00Z
supersedes: docs/decisions/US-5.1-open-decisions.md@v5
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 5
  - key: clarification_report
    version: 5
  - key: specification
    version: 8
  - key: specification_review
    version: 8
open_decisions_blocking: false
---

# US-5.1 - Open Decisions (v6)

## Change history

- **v1** - OD-1..OD-9 raised, all unanswered (OD-1..OD-4 blocking).
- **v2** - Human answered OD-1..OD-9; checking them raised OD-10..OD-17 (OD-10 blocking).
- **v3 (attempt 3, last)** - Human answered OD-10 (blocking) and OD-11..OD-17. All eight answers are
  recorded below as the human's words, unadjusted, marked RESOLVED. Checking them against the code,
  AGENTS.md (sections 3, 4, 9), Story Q1-Q5/ACs, OD-1..OD-9 and each other found no collision that stops
  the spec writer, but several answers rest on premises the code does not support or leave sub-questions
  of the v2 ODs unanswered. Those are logged as NEW decisions OD-18..OD-24, all **non-blocking**, each with
  the explicit assumption a spec may carry. The blocking decision OD-10 is resolved, so
  `open_decisions_blocking: false`.

- **v4 (re-entry via SPEC_REVIEW `changes_required_clarification`, review v6 finding B-1/B-3).** Specification
  v5 was implemented and the human rejected the PR gate twice; the human decision H-7 (native Ukrainian,
  image-specific label/fallbacks/figcaption/alt, new figure style) is recorded as RESOLVED and resolves
  OD-19. Spec v6 raised three new decisions, recorded here as OD-25 (BLOCKING), OD-26 (BLOCKING), OD-27
  (non-blocking, see reason), plus OD-28 for review finding B-3 (Story override confirmation, BLOCKING because
  a "Story change needed" answer routes to STORY_WRITING). OD-18, OD-20..OD-24 are carried forward unchanged.
  This skill answers none of them; options and the Spec writer's recommendations are recommendations only.
  `open_decisions_blocking: true`.

- **v5 (human answers 2026-10-03, sbruhov; source: `docs/workflow/workflow-state.yaml` `note` "HUMAN ANSWERS
  2026-10-03").** The human answered all four decisions raised in v4: OD-25 = A, OD-26 = (b), OD-28 = (a),
  OD-27 = (a). They are recorded below as RESOLVED (human decision), wording unadjusted. H-7 is corrected: its
  figure width reverts to `fit-content` (see the H-7 entry). No other decision is blocking: OD-18 and
  OD-20..OD-24 are non-blocking and are carried forward unchanged, so `open_decisions_blocking: false`.
  Follow-ups for the Spec writer are listed in the section "Spec follow-ups implied by the v5 answers".

- **v6 (re-entry via SPEC_REVIEW `changes_required_clarification`, review v8 finding B-1; human decisions of
  the `HUMAN_REJECTED` event of 2026-10-03T18:20:00Z in `docs/workflow/history.jsonl`, mirrored in the
  `note` of `docs/workflow/workflow-state.yaml`; the Specification v8 names them H-8).** The human rejected
  HUMAN_SPEC_APPROVAL of Spec v7. Recorded below, wording from the event, unadjusted: H-8 (RESOLVED);
  OD-26 and OD-27 are REVERSED (their v5 entries are kept as history, marked superseded); a new record of the
  AGENTS.md section 9 authorisation for FROZEN `src/prompt-core/master-system-prompt.ts` (example figure lines
  identified by content); A-14, A-15 and A-16 human-confirmed. Nothing new is open, so
  `open_decisions_blocking: false`. OD-18 and OD-20..OD-24 stay OPEN and non-blocking, carried forward
  unchanged. This skill answered nothing; every answer below is the human's.

The Story file is not edited by this skill; where answers disagree with Story text it is reported in the
clarification report only.

**Status summary**

| ID | State | Blocking |
|---|---|---|
| OD-1..OD-17 | RESOLVED (human decision; OD-14, OD-16, OD-17 answered in part - residue carried to OD-18..OD-22/OD-24) | - |
| OD-18 | OPEN | no |
| OD-19 | RESOLVED by H-7 (v4) | - |
| H-7 | RESOLVED (human decision, recorded v4; width corrected v5, re-corrected to `max-content` by H-8 v6) | - |
| OD-20 | OPEN | no |
| OD-21 | OPEN | no |
| OD-22 | OPEN | no |
| OD-23 | OPEN | no |
| OD-24 | OPEN | no |
| OD-25 | RESOLVED (human decision, v5) = A | - |
| OD-26 | REVERSED by H-8 (v6); v5 answer (b) superseded - width is `max-content`, AGENTS.md section 4 amended | - |
| OD-27 | REVERSED by H-8 (v6); v5 answer (a) superseded - styling applies to all non-video figures | - |
| OD-28 | RESOLVED (human decision, v5) = (a) | - |
| H-8 | RESOLVED (human decision, v6) | - |
| Section 9 authorisation (master-system-prompt.ts example figures) | RECORDED (human authorisation, v6) | - |
| A-14, A-15, A-16 | CONFIRMED by the human (v6) | - |

Supersession map (later human answer wins; recorded, not adjusted): OD-2 "HTML rendering level" is
superseded by OD-10 (Doc level on the Doc path) plus OD-11 (regex on the legacy path); OD-3 "split `<p>`"
and "no figcaption if empty" by OD-10 and OD-14; OD-4 "resolved per locale, markers pass through
translation" by OD-12; OD-5 "Expert-3DPrinter out of scope" by OD-13; OD-6 by OD-16 (adds the "View " prefix).

Sources checked: README.md, AGENTS.md (3, 4, 9, 11), `STORE_REGISTRY` (`constants.ts`),
`src/prompt-core/store-render-rules.ts` (`renderContextFor`), `src/prompt-core/doc-pipeline-flag.ts`
(`DOC_PIPELINE_STORES`, `usesDocPipeline`), `src/domain/description-doc.ts`,
`src/domain/description-doc.schema.ts`, `src/render/render-description.ts`, `src/utils/image-figure.ts`,
`src/utils/image-manifest-coverage.ts`, `src/prompts/task-c.ts`, `src/app/app.component.ts`
(~1275-1290), `src/services/content-orchestrator.service.ts` (legacy produce ~352-370, Doc gate ~541-664,
translation loop ~953-1041), `test/render-reconciliation.report.md`.

---

## RESOLVED by human decision

### OD-1 - RESOLVED (human decision, v2)
- **Human answer:** Upload validation is out of scope. The parser looks for the marker and compares it
  with `originalFilename` in the manifest. The `src` attribute uses `urlFilename` (always ends `.jpg`).
- **Note:** contradicts Story Q1 "rejected at upload time" (no such rejection exists in code). Residual
  matching edge cases: OD-17 (partially answered) and OD-24.

### OD-2 - RESOLVED (human decision, v2; layer clause superseded by OD-10/OD-11)
- **Human answer:** A deterministic code step in a post-processor. Prompts (FROZEN) are NOT changed - the
  LLM carries markers through as text.
- **Note:** "HTML rendering level" is superseded by OD-10 (Doc level) and OD-11 (HTML regex, legacy path).
  Risk that the model does not carry the marker through: OD-24.

### OD-3 - RESOLVED (human decision, v2; partly superseded by OD-10 and OD-14)
- **Human answer:** Paragraph splitting; text before the marker becomes the lead-in paragraph;
  `<figcaption>` from `visionDescription` (empty - no figcaption).
- **Note:** "no figcaption if empty" is superseded by OD-14. Lead-in with no preceding text and non-paragraph
  carriers: OD-22.

### OD-4 - RESOLVED (human decision, v2; superseded by OD-12)
- **Human answer:** Marker resolution per locale in the post-processor; markers pass through translation.
- **Note:** OD-12 states the opposite flow (resolve once in the uk-UA master before translation). The later
  answer governs; see OD-12 for the verified code behaviour.

### OD-5 - RESOLVED (human decision, v2; superseded by OD-13)
- **Human answer:** Expert-3DPrinter out of scope; other stores use the standard `figureSrc()` path.
- **Note:** exclusion reversed by OD-13.

### OD-6 - RESOLVED (human decision, v2; refined by OD-16)
- **Human answer:** `alt` from manifest `altText`; fallback "Product image: " + file name without extension
  (hyphens to spaces).

### OD-7 - RESOLVED (human decision, v2; made concrete by OD-10)
- **Human answer:** The post-processor runs BEFORE `validateImageManifestCoverageDoc`; replaced images are
  marked used; unused images are appended at the end (or by standard logic).

### OD-8 - RESOLVED (human decision, v2)
- **Human answer:** Report gets `severity: 'warning'`, rule `unmatched-image-placeholder`; context per
  specific locale; images with status `error` count as not found.
- **Note:** "per locale" collides with OD-12 (resolution happens once, in the master): OD-24.

### OD-9 - RESOLVED (human decision, v2)
- **Human answer:** Strict RegExp for text nodes: `\[[a-z0-9\-]+\.(jpg|webp)\]`. Spaces/other extensions stay
  as plain text.
- **Note:** looser than the Story Q1 hint; relation to OD-17: OD-24.

### OD-10 - RESOLVED (human decision, v3) - was BLOCKING
- **Human answer (translated):** Post-processing works at the Doc level, before coverage validation. After
  the model generates the Doc but before the validation repair-gate, a dedicated step walks all text blocks;
  on finding a marker `[file.jpg]` it splits the text block, inserts between the halves a block
  `{ kind: 'figure', urlFilename: 'file.jpg', ... }`, and deletes the marker. The marker has the highest
  priority (direct user instruction): if the model itself inserted `{kind:'figure', urlFilename:'file.jpg'}`
  and the post-processor also found a marker for the same file, it REMOVES the model-placed figure and keeps
  only the marker-generated one (prevents `image-manifest-duplicate`). Manifest images with no marker and
  not placed by the model are appended at the end of the document by the existing pipeline's standard
  fallback logic.
- **Checked against code:** consistent with the Doc gate. `runDocGate` validates the Doc in `validate`
  (`validateImageManifestCoverageDoc`, ~573) and renders once after the gate (~656), so a Doc step inside
  `produce` (before `validate`) precedes coverage. FROZEN files are not touched. Naming note, not a
  collision: the Doc has no `urlFilename` on a figure block; the real shapes are block
  `{kind:'figure', ref:number}` indexing `doc.figures[]` entries `{file, alt, caption}`, and the schema
  requires every `figures[]` entry referenced exactly once with in-range refs (superRefine). So
  "insert figure with `urlFilename`" means: add/reuse a `figures[]` entry with `file = urlFilename` and a
  `{kind:'figure', ref}` block; removing the model's figure means dropping its block and its `figures[]`
  entry with `ref` re-indexing. This is a design detail for the spec/plan, not an open question.
  Residual sub-questions: OD-22 (split semantics), OD-21 (which sections can host the figure).

### OD-11 - RESOLVED (human decision, v3)
- **Human answer (translated):** For simplified HTML schemas with no Doc level, the post-processor works via
  Regex replacement directly in the output HTML before the coverage check.
- **Checked against code:** premise differs. Simplified templates are NOT a no-Doc category:
  `usesDocPipeline()` ignores the template id (US-2.2 FR-7), so every template of an enrolled store runs the
  Doc pipeline. The only non-Doc path is by STORE (a store absent from `DOC_PIPELINE_STORES` or with an empty
  `imageBaseUrl`): today Expert-3DPrinter and default custom stores. The legacy path is
  `produceTaskAArtifact` (`wrapImageFigures` at ~370); the coverage twin lives in the FROZEN
  `output-validator.ts` (`image-manifest-missing`/`-duplicate`) and runs on the final HTML. A regex step
  placed in `produceTaskAArtifact` BEFORE `wrapImageFigures` needs no edit of any FROZEN file, and
  `wrapImageFigures` is idempotent on an already-built `<figure>`. Residual details: OD-20, OD-23.

### OD-12 - RESOLVED (human decision, v3)
- **Human answer (translated):** Marker substitution into `{kind:'figure'}` happens at Doc level in the
  master locale (uk-UA) BEFORE translation, so task-c.ts receives an already structured Doc with figures,
  not raw marker text; translator models cannot corrupt markers and FROZEN translation prompts need no
  change.
- **Checked against code:** the conclusion holds, one detail differs. Translation does NOT receive the Doc;
  `buildPromptC(finalMasterHtml, ...)` (~967) receives the master's RENDERED HTML, in which the figure is
  already a full `<figure><img><figcaption>` with the final `src`. `task-c.ts` already instructs: preserve
  every `<figure>` byte-identical, translate `<figcaption>` and `alt`, never alter `src` (lines ~9-19);
  `restoreMediaSrcs` (~999) restores a diverged src from the master and `validateStructuralParity`
  (~1005) counts tags, so a figure inserted in the master survives parity (the translation mirrors the
  master). So lead-in text, figcaption and alt in the other locales are produced by the existing
  translation step from the master's already-resolved text; no per-locale resolution exists.
  This SUPERSEDES OD-4 ("per locale; markers pass through translation") and narrows OD-8
  ("context per locale"): OD-24.

### OD-13 - RESOLVED (human decision, v3)
- **Human answer (translated):** Expert-3DPrinter is returned to scope (the earlier exclusion violated
  AC-4). If `imageBaseUrl` is '' then `figureSrc` simply forms a relative path
  (brandFolder/ + modelFolder/ + urlFilename); valid; "All of STORE_REGISTRY" stays untouched.
- **Checked against code:** the desired outcome (relative `src` for an empty base) is clear, but the stated
  mechanism is not reachable: `renderContextFor()` THROWS on an empty `imageBaseUrl`
  (`store-render-rules.ts:126`), `usesDocPipeline()` returns false for it, and Expert-3DPrinter is not in
  `DOC_PIPELINE_STORES` (documented: "must NOT borrow the Spanish store's domain"). `figureSrc` is only
  used by the Doc renderer. Expert-3DPrinter (and default custom stores, `imageBaseUrl: ''`,
  constants.ts:308) therefore take the legacy HTML path (OD-11). Consequences: OD-20.

### OD-14 - RESOLVED in part (human decision, v3)
- **Human answer (translated):** Section 4 requires a mandatory figcaption. If `visionDescription` is empty
  (e.g. Vision failed) the caption fallback is "Product image: " + file name without extension (hyphens
  replaced by spaces). Supersedes the earlier OD-3 "no figcaption if empty".
- **Checked:** agrees with AGENTS.md section 4 (figcaption mandatory, sourced from the manifest caption) and
  `Figure.caption: Prose` (required, non-empty). Of the v2 sub-questions, (1) is answered; (2) alt vs
  figcaption duplication is handled only partly by OD-16 (OD-18); (3) no text before the marker and (4)
  list/table/heading carriers are NOT answered (OD-22); (5) language of the figcaption is NOT answered
  (OD-19).

### OD-15 - RESOLVED (human decision, v3)
- **Human answer (translated):** If a marker is found in a section that historically does not support
  figures (e.g. cta or specs), the Doc schema must be EXTENDED to allow a figure next to paragraphs in any
  section that has text.
- **Checked:** neither `description-doc.ts` nor `description-doc.schema.ts` nor `src/render/**` is on the
  FROZEN list (task-a, task-b, task-c, master-system-prompt, output-validator), so no section 9 stop; all
  are subject to the src/domain and src/render coverage floors. Scope and design of the extension is not
  determined by the answer: OD-21.

### OD-16 - RESOLVED in part (human decision, v3)
- **Human answer (translated):** `alt` always equals `ImageManifestEntry.altText` (the app already derives
  altText from the file name on Vision error). To avoid breaking section 4 (alt != figcaption), if altText
  equals our figcaption fallback, the alt attribute gets the prefix "View " + altText.
- **Checked:** `app.component.ts:1279` sets `altText: e.altText || result.caption` on Vision SUCCESS, i.e.
  `altText` equals `visionDescription` (= the figcaption) by default; on error (`:1285-1288`) `altText` is
  the file name with `.jpg` removed and hyphens to spaces, WITHOUT the "Product image: " prefix, so it
  never equals the fallback figcaption "Product image: ..." exactly. The guard as worded therefore
  triggers only if a user types that exact text, while the real alt==figcaption collision (every
  successful image) is not covered: OD-18. Sub-question (1) language of the fallback and (3) which file
  name feeds the fallback (`urlFilename` vs `originalFilename`) remain unanswered: OD-18, OD-19.

### OD-17 - RESOLVED in part (human decision, v3)
- **Human answer (translated):** Keep Q1 strictly: lowercase kebab-case only. `[Image.jpg]` is ignored by
  the parser and treated as plain text.
- **Checked:** answers v2 sub-question (1) (matching is case-sensitive; unreachable names are accepted).
  Sub-questions (2) duplicate `originalFilename`/colliding `urlFilename`, (3) `[a.webp]` -> `.jpg` src and
  (4) status `pending` are NOT answered; and "Q1 strictly" is ambiguous against the OD-9 regex: OD-24.

### H-7 - RESOLVED (human decision, recorded v4; answers OD-19)
- **Source:** `docs/workflow/workflow-state.yaml` `note` and the last `docs/workflow/history.jsonl` events
  (PR-gate rejections 2026-10-03T16:26:44Z and 2026-10-03T16:40:00Z), as carried in Spec v6 Background. The
  evidence was `Knowledge/Issues/expert3d_agibot_d1_ultra_2026-10-03_1922/description_uk-UA.html`: images land
  in the right place, but the figcaption has an English `<b>Image:</b>` label, English Vision text and an
  English `alt`.
- **Human decision (as paraphrased in Spec v6; wording unadjusted by this skill):** in the uk-UA master the
  figure label, fallback strings, figcaption text and `alt` are native Ukrainian, generated natively (not
  translated from English), image-specific (label example: "Rezultat roboty zelenogo lazera:" in Cyrillic, not a
  generic `Image:` / `Zobrazhennia:`), one full Ukrainian descriptive sentence for `alt` and for the
  figcaption description, `alt` and the whole figcaption still differ. New figure scheme per image:
  `<figure style="display: block; width: max-content; max-width: 100%; margin: 4px auto;">`, `<img ... alt=...
  [loading="lazy" except first in document order] decoding="async" style="max-width: 100%; height: auto;
  display: block;">`, `<figcaption style="text-align: left;"><b>label:</b> sentence.</figcaption>`.
- **Effect on earlier decisions:** resolves OD-19 (language of deterministic strings). Per Spec v6 it
  overrides Assumption A-11, human decision H-6 and the v5 out-of-scope line that kept `Product image: ` and
  `View ` English; it supersedes the English text of OD-14 (fallback "Product image: " + file name) and OD-16
  ("View " prefix) as the Spec v6 re-words them (Ukrainian fallback; `Foto: ` style prefix in the Spec). The
  mechanics of OD-14/OD-16 (fallback when empty; alt != figcaption guard) are otherwise retained; OD-12
  (resolve once in master, propagate by translation) is explicitly unchanged.
- **v5 correction (verified against the `note` line, "HUMAN ANSWERS 2026-10-03"):** the note states "H-7
  figure width reverts to fit-content; rest of H-7 scheme stands" (OD-26 = (b)). The v4 text above therefore
  no longer holds for the width: the effective figure scheme is `<figure style="display: block; width:
  fit-content; max-width: 100%; margin: 4px auto;">`; the `img` and `figcaption` parts, native Ukrainian,
  image-specific text and the alt != figcaption rule are unchanged. The `max-content` wording in the v4 quote
  is retained above as history only and is superseded. Verification limit: the `note` line carries only the
  four answers; the original H-7 wording (label example, element attributes) is known to this skill only via
  the Spec v6 paraphrase and history.jsonl lines 321/322 (which mention H-7 without verbatim text), so those
  parts could be checked only for non-contradiction with the note, not verbatim.
- **v6 correction (H-8):** the v5 correction above is itself superseded. By H-8 item 1 the width is again
  `max-content` (the original H-7 width), i.e. the effective figure style is `display: block; width:
  max-content; max-width: 100%; margin: 4px auto;`. The rest of the H-7 scheme stands (see H-8 item 6 for
  the `loading`/`decoding` and style detail).
- **Residue (v4, now answered):** per-image text source: OD-25 = A. Width: OD-26 = (b), reversed in v6 by H-8.
  Scope of the scheme: OD-27 = (a), reversed in v6 by H-8. Story-text override: OD-28 = (a). OD-18 is still open for the alt/figcaption equality rule (the
  Spec v6 amendment A-4 is a proposal, not a decision).

---

### OD-25 - RESOLVED (human decision, v5) - was BLOCKING
- **Human answer (verbatim from the note):** "OD-25 = A (Vision pre-pass returns Ukrainian label, description,
  alt into the manifest; marker postprocessor takes them deterministically; no Task A change, no new section
  9)."
- **Human rationale (reported in the session):** text-only Task A cannot see the images, so it cannot write
  image-specific text; the Vision pre-pass can.
- **Checked:** route A as defined in the v4 entry (Vision extra fields in the store's master language, stored on
  the manifest entry). No FROZEN file is touched and no further AGENTS.md section 9 approval is needed.
  Consequence for the Spec: the Vision output type and `ImageManifestEntry` gain label, description and alt
  fields (Ukrainian), and the Vision call must run in the master language (uk-UA). This is a product change
  beyond the Story's Out of scope, which OD-28 = (a) overrides.

### OD-26 - REVERSED by H-8 (v6); was RESOLVED (human decision, v5) = (b), was BLOCKING
- **v6 status:** SUPERSEDED. The human reversed this answer on 2026-10-03T18:20:00Z (H-8 item 1): the
  figure width MUST be `width: max-content;` and the Specification must explicitly state that it amends
  AGENTS.md section 4 on this rule. The v5 record below is kept as history only; do not apply it.
- **Human answer (verbatim from the note):** "OD-26 = (b) withdraw max-content, keep width: fit-content per
  AGENTS.md section 4 (H-7 figure width reverts to fit-content; rest of H-7 scheme stands)."
- **Checked:** AGENTS.md section 4 (`fit-content`), `render-description.ts:51` and `image-figure.ts:19`
  (`FIGURE_STYLE`) and the FROZEN `master-system-prompt.ts` lines 403/408 already use `fit-content`, so the
  conflict with AGENTS.md disappears: no AGENTS.md amendment, no renderer constant change for the width. The
  Spec v6 FR-14, AC-9(g) and NFR text that mandate `max-content` must be reverted.

### OD-27 - REVERSED by H-8 (v6); was RESOLVED (human decision, v5) = (a)
- **v6 status:** SUPERSEDED. The human reversed this answer on 2026-10-03T18:20:00Z (H-8 item 3): the
  structural styling (`max-content`, `text-align: left`) applies to ALL non-video figures in the document,
  not only marker-inserted ones, and the human authorises the FROZEN edit recorded in "Section 9
  authorisation (v6)" below. The v5 record below is kept as history only; do not apply it.
- **Human answer (verbatim from the note):** "OD-27 = (a) new rules apply only to marker-inserted figures;
  model-placed and fallback figures keep the old rules; no FROZEN master-system-prompt lines 403/408 change."
- **Checked:** option (a) of the v4 entry. One document may carry marker figures with the new rules and
  model-placed or fallback figures with the old rules; FROZEN lines 403/408 stay untouched. With OD-26 = (b) the
  width is the same for all figures, so the remaining difference is the per-image text and the other H-7 parts
  that the Spec must scope to marker-inserted figures only.

### OD-28 - RESOLVED (human decision, v5) - was BLOCKING
- **Human answer (verbatim from the note):** "OD-28 = (a) H-7 overrides Story line 66 Out of scope, AC-3, Q5;
  Story file NOT changed; the Spec must declare the override in its Background supersession list and update
  its own Out of scope."
- **Checked:** option (a) of the v4 entry. The Story is not edited and is not routed back to STORY_WRITING
  (no `story_drift`). The override is a human decision recorded here; the Spec must carry it explicitly.

---

### H-8 - RESOLVED (human decision, recorded v6; reverses OD-26 and OD-27, confirms A-14/A-15/A-16)
- **Source:** `docs/workflow/history.jsonl` event `HUMAN_REJECTED` of 2026-10-03T18:20:00Z (stage
  HUMAN_SPEC_APPROVAL, actor sbruhov@gmail.com, "confirmed in chat"), mirrored in the `note` line of
  `docs/workflow/workflow-state.yaml`; both read in full and compared. Human statement of principle: "the
  provided HTML examples are the source of truth". Named H-8 by Specification v8. Items 1-5 below are the
  event's own (1)-(5); item 6 is the event's trailing "HTML:" sentence.
- **Human decision (event wording, unadjusted):**
  1. "Figure width MUST be `width: max-content;` and the Spec must explicitly state it amends AGENTS.md
     section 4 on this rule (overrules OD-26 b)."
  2. "figcaption MUST carry style="text-align: left;"."
  3. "This structural styling (max-content, text-align: left) applies to ALL non-video figures in the
     document, not only marker-inserted ones (overrules OD-27 a)".
  4. "the human authorizes under section 9 updating FROZEN master-system-prompt.ts lines 403 and 408 to match
     the new layout" (recorded separately below).
  5. "A-16 confirmed: Vision-provided Ukrainian alt completely replaces the legacy operator-editable altText
     for marker images." and "A-14 and A-15 (Ukrainian fallbacks) confirmed." (recorded separately below).
  6. "HTML: first image has no loading attribute, decoding=async; 2nd+ images loading=lazy decoding=async;
     figure style `display: block; width: max-content; max-width: 100%; margin: 4px auto;`; img style
     `max-width: 100%; height: auto; display: block;`."
- **Effect on earlier decisions:** OD-26 (b) and OD-27 (a) are reversed (histories kept above). H-7 stands
  with its original `max-content` width. OD-25 = A and OD-28 = (a) are unaffected. OD-12 (resolve once in the
  master, propagate by translation) is unchanged.
- **Scope of item 3 as the human stated it:** the structural styling only. The event does not widen the
  label/language/fallback rules to non-marker figures; Specification v8 keeps those for marker-inserted
  figures only (the Spec's reading, consistent with the event; recorded for visibility, not as a new decision).
- **AGENTS.md section 4 amendment:** the human requires the Specification to state explicitly that it amends
  section 4 on the figure width rule (`fit-content` -> `max-content`). The event does not say that AGENTS.md
  itself is to be edited in this Story. Specification v8 adds a planner follow-up to update the AGENTS.md text;
  that follow-up goes beyond the event's wording and is flagged for confirmation at the gate (review v8 N-3).
  This skill does not edit AGENTS.md.

### Section 9 authorisation (v6) - FROZEN `src/prompt-core/master-system-prompt.ts` example figures
- **Source:** the same event (2026-10-03T18:20:00Z), H-8 item 4. Event wording: "the human authorizes under
  section 9 updating FROZEN master-system-prompt.ts lines 403 and 408 to match the new layout."
- **What is authorised:** an update of the model's example figures in `src/prompt-core/master-system-prompt.ts`
  (the two example `<figure style=...>` lines under [IMAGE HANDLING] / FIGURE FORMAT: Image #1 eager and
  Images #2+ lazy; today `width: fit-content`) so that they match the new layout (`width: max-content`,
  figcaption `text-align: left`, first image without `loading`, later images `loading="lazy"`). The limit
  "those two lines only" is the Specification v8 reading of the event; the event names the two lines and no
  other.
- **Identification (review v8 N-4):** the line numbers are valid only in the working tree after the FR-20
  sentence is inserted (HEAD: 400 and 405; checked in the current working tree: the two
  `<figure style="display: block; width: fit-content; ...">` lines sit at 403 and 408). Downstream stages
  must identify the lines BY CONTENT (the two example figure lines) and verify against HEAD, not by number.
- **Relation to earlier approvals:** separate from, and additional to, the earlier section 9 approval of
  2026-10-03T09:25:44Z / 09:28:48Z (additive edits to `task-a.ts` and `master-system-prompt.ts`, recorded in
  Specification NFR-1). It covers no other line of that file and no other FROZEN file. `task-b.ts`,
  `task-c.ts` and `output-validator.ts` remain non-editable; any other FROZEN edit is still a section 9 stop.
- **FROZEN impact statement (v6):** section 9 approval is now NEEDED for the example-figure lines and IS GIVEN
  (human, 2026-10-03T18:20:00Z). This supersedes the v5 statement "no FROZEN file is edited".

### A-14, A-15, A-16 - CONFIRMED by the human (v6)
- **Source:** the same event, H-8 item 5. Event wording only: "A-16 confirmed: Vision-provided Ukrainian alt
  completely replaces the legacy operator-editable altText for marker images." and "A-14 and A-15 (Ukrainian
  fallbacks) confirmed." Meanings are taken from Specification v8 (assumptions A-14, A-15, A-16).
- **A-16 (confirmed):** the Ukrainian alt recorded in the manifest by the Vision analysis (OD-25 = A) is the
  `alt` of marker-inserted figures and completely replaces the legacy operator-editable `altText` for them;
  `altText` is not read for these figures. Whether a later operator UI edit overrides the recorded text was
  NOT raised by the human; Spec v8 says the recorded text applies - that parenthetical is the Spec's reading,
  not a human statement.
- **A-14 and A-15 (confirmed):** the human confirmed "Ukrainian fallbacks". Spec v8 A-14 = the Ukrainian
  fallback wording (`Зображення товару:`, alt prefix `Фото: `), rule ids `image-caption-not-native` and
  `image-caption-duplicate-label`, the generic-label list, duplicate-label behaviour and the Cyrillic proxy
  test; Spec v8 A-15 = for a store without `uk-UA` FR-21 applies in that store's master locale and the
  Cyrillic test is defined for a uk-UA master only.
- **N-1 flag (review v8):** the event says only "A-14 and A-15 (Ukrainian fallbacks) confirmed". Spec v8
  H-8 item 5 words it as "Ukrainian fallbacks, the rule id `image-caption-not-native`, Cyrillic check only for
  a uk-UA master", which attributes more specific words to the human than the event contains. Recorded as
  human-confirmed here: the numbered assumptions A-14 and A-15 as labelled, evidenced by the words "Ukrainian
  fallbacks". The other items (rule ids, generic-label list, Cyrillic scope) are confirmed only insofar as
  they are part of A-14/A-15 as written in the Spec; the human did not itemise them. The Spec should align
  H-8 item 5 with the careful wording of its own A-14 (review v8 N-1).

---

## Spec follow-ups implied by the v6 answers (for so-spec-writer; not decisions)

1. The Spec already carries H-8 (v8). Remaining wording items from review v8: N-1 (align H-8 item 5 with
   the event), N-4 (identify the lines by content; diff against HEAD), and N-2, N-3, N-6 as listed there.
2. Bump `inputs_consumed` for `open_decisions` to v6 on the next Spec revision (review v8 B-1).
3. Treat OD-26 and OD-27 as REVERSED by H-8 and cite this log (v6) for the section 9 authorisation, instead
   of the history event alone.

---

## Spec follow-ups implied by the v5 answers (historical; items 1 and 4 are superseded by H-8 in v6)

1. FR-14, AC-9(g) and the NFRs: revert the figure width from `max-content` to `fit-content` (AGENTS.md
   section 4); drop the OD-26 conflict from the Spec.
2. Vision output and manifest extension (OD-25 = A): extend the Vision output and `ImageManifestEntry` with
   Ukrainian label, description and alt; the Vision call runs in the master language; FR-4, FR-13 and FR-21
   take their text from the manifest deterministically; no Task A or master-prompt change and no new section 9
   approval beyond what NFR-1 already records.
3. Supersession list and Out of scope (OD-28 = (a)): the Spec Background supersession list names Story line 66
   Out of scope, AC-3 (caption source) and Q5 as overridden by H-7; the Spec's own Out of scope first bullet
   (alt/caption generation excluded) is reworded to match. The Story stays unchanged.
4. Scope (OD-27 = (a)): the new rules apply only to marker-inserted figures; model-placed (FR-5) and fallback
   (FR-8) figures keep the old rules; state that FROZEN `master-system-prompt.ts` lines 403/408 are not edited.
5. Review v6: B-2 (`max-content` vs AGENTS.md and FROZEN lines 403/408) is closed by items 1 and 4; B-3
   (undeclared Story contradiction) is closed by item 3; the testability findings of review v6 are still to be
   addressed in the next Spec version.

---

## OPEN - non-blocking, carried forward unchanged (each carries an explicit assumption a spec may use)

### OD-18 (non-blocking) - alt == figcaption on every successful image; fallback file-name source
- **Question:** With figcaption = `visionDescription` (OD-3/OD-14) and alt = `altText` (OD-16), and
  `altText` seeded from the same Vision `caption` on success, alt equals the figcaption for every
  successful image, violating AGENTS.md section 4 ("alt must not duplicate the figcaption"). Does the
  "View " + altText rule apply whenever alt equals the figcaption (any source), or only when it equals the
  "Product image: ..." fallback as literally stated? And does the fallback name come from `urlFilename`
  (consistent with `src`) or `originalFilename`?
- **Why it cannot be inferred:** checked `app.component.ts` 1273-1290 (alt seeded from caption;
  error alt is the bare name), `types.ts` (no caption field), section 4. The human text fixes the
  prefix only for equality with the fallback; whether a user-edited altText equal to a Vision caption is
  also prefixed is not stated.
- **Impact:** a literal reading leaves AC-3 (section 4) failing for every ordinary marked image; a
  generalised reading adjusts the human rule.
- **Assumption for the spec (needs human confirmation):** apply "View " + altText whenever alt equals the
  final figcaption text, whichever its source; fallback name from `urlFilename`.

### OD-20 (non-blocking) - Expert-3DPrinter reachability (consequence of OD-13)
- **Question:** The human's mechanism (`figureSrc` forming a relative path) exists only on the Doc path,
  which Expert-3DPrinter cannot enter (`renderContextFor` throws; not in `DOC_PIPELINE_STORES`). Is the
  intent (a) serve Expert-3DPrinter through the legacy HTML path (OD-11 regex) with a relative `src`
  built as `brandFolder/modelFolder/urlFilename`, or (b) change the `renderContextFor` guard and enrol the
  store in the Doc pipeline (reversing the documented "must not be enrolled with an empty base" rule)?
- **Why it cannot be inferred:** checked `doc-pipeline-flag.ts` 43-69, `store-render-rules.ts` 114-134,
  `constants.ts` 77 and 308. Option (b) is a larger change than the story and not asked for.
- **Impact:** wrong path chosen for AC-4 on this store; the legacy path has no `figureSrc`.
- **Assumption for the spec:** (a), no change to the guard or the enrolment list; the post-processor builds
  the relative `src` itself.

### OD-21 (non-blocking) - Doc schema extension (OD-15): which sections, which files
- **Question:** "Extend the Doc schema to allow a figure next to paragraphs in any section that has text":
  which sections exactly, and how, given the real shapes: `hook` and `cta.text` are single `Prose`
  strings, `killerSpecs[].why`, `applications.items[].text`, `specs` cells and `packageContents.items` are
  strings, `keyBenefits`/`functionality`/`compatibility` are Block lists, `applications.blocks` already
  admits paragraph+figure? And is a v4 `keyBenefits` figure allowed, given the schema's FR-4 rule "every
  keyBenefits Block must be bullets" (superRefine under `schemaVersion === '4.0'`, with a message telling
  the model to move figures to sections 3 or 4)?
- **Why it cannot be inferred:** checked `description-doc.ts` (types, zero-dependency contract,
  `forEachBlockInOrder`, `ApplicationsBlock`), `description-doc.schema.ts` (`.strict()` leaf subsections,
  v4-only superRefine, cached-3.0 compatibility NFR-8/OD-2, per-section `ref` bookkeeping),
  `render-description.ts` (figure emitter, first-eager by document order). Files in play, none FROZEN:
  `src/domain/description-doc.ts`, `src/domain/description-doc.schema.ts`, `src/render/render-description.ts`
  and the Doc validators that traverse blocks (template completeness, sentence length, word ranges,
  `forEachBlockInOrder` consumers). No JSON-schema derivation from the zod schema exists in `src` (grep
  found none), so a relaxation does not change a schema sent to the model; the model-facing description of
  the Doc lives in task-a prose (FROZEN) and stays untouched, which is consistent only if the new shapes
  are produced solely by the post-processor and are additive/optional for cached documents.
- **Impact:** an unspecified extension can silently loosen v4 invariants, break cached 3.0 re-parsing or
  leave the renderer unable to emit the figure in `hook`/`cta`.
- **Assumption for the spec:** additive and optional; cached 3.0 documents unchanged; section list and v4
  carve-out proposed by the spec and confirmed at the spec gate.

### OD-22 (non-blocking) - "Split the text block": non-paragraph carriers and the lead-in rule
- **Question:** (1) Marker inside a bullet item, a heading, a killer-spec or table cell, `hook`/`cta`
  string, or `applications.items[].text`: what is split (splitting a `bullets` Block would breach its
  `min(3)`/`min(2)` item floor; a heading or cell cannot host a figure)? (2) Marker at the very start of a
  paragraph, or the only content of a paragraph: AGENTS.md section 4 requires a lead-in `<p>` before every
  `<figure>` ("no orphan images") and the lead-in must not duplicate the figcaption; where does the lead-in
  come from? (3) Empty halves after splitting. (4) Several markers in one block.
- **Why it cannot be inferred:** checked section 4 (lines 208-212), the Block union and bullets floors in
  `description-doc.schema.ts`, and OD-3/OD-10 (cover only "text before the marker becomes the lead-in").
- **Impact:** AC-2/AC-3 unverifiable for these positions; orphan images or dropped text.
- **Assumption for the spec:** only `paragraph` Blocks (and the new extension's paragraph-like carriers) are
  split; a marker elsewhere is removed with an `unmatched-image-placeholder`-style warning or relocated
  (to be chosen at the spec gate); an orphan marked image takes the nearest preceding paragraph as lead-in.

### OD-23 (non-blocking) - Legacy HTML regex path (OD-11): details
- **Question:** On the legacy path (a) is the marker located by a regex over the HTML string or a DOM text
  walk (OD-9 says text nodes only; a raw regex would also hit attributes and `<script>`-like content),
  (b) how is a model-emitted `<img>`/`<figure>` for the same file removed to prevent the FROZEN
  validator's `image-manifest-duplicate`, (c) how is the `<p>` split (a `<figure>` inside `<p>` is
  forbidden) and where does a `<b>` lead-in label figcaption (section 4, line ~215) come from, (d) the
  step order relative to `restoreMissingVideos`/`wrapVideoFigures`/`wrapImageFigures`?
- **Why it cannot be inferred:** checked `produceTaskAArtifact` (352-385), `image-figure.ts` (idempotent;
  adds `loading`, `decoding`, styles; hoists a `<figure>` out of `<p>`), `output-validator.ts` rule names.
  Placement before `wrapImageFigures` avoids any FROZEN edit; the rest is unspecified.
- **Impact:** duplicate images, malformed HTML, or a FROZEN-file temptation.
- **Assumption for the spec:** DOM-based text-node walk (not a raw string regex), step placed in
  `produceTaskAArtifact` before `wrapImageFigures`, marker-created image wins over a model-created one,
  no FROZEN edit.

### OD-24 (non-blocking) - Residuals of OD-4/OD-8/OD-9/OD-17 and marker reliability
- **Question:** (1) The warning context: OD-8 says per locale, but resolution happens once in the master
  (OD-12), so is the `unmatched-image-placeholder` warning emitted once with the uk-UA context only?
  (2) OD-17 "Q1 strictly" vs OD-9: is the accepted grammar the OD-9 regex `\[[a-z0-9\-]+\.(jpg|webp)\]`
  (allows leading/trailing/double hyphens, matched anywhere inside text) or the stricter Q1 hint
  `^\[[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|webp)\]$` (single inner hyphens, whole-token anchor)? (3) Duplicate
  `originalFilename`, two names normalising to one `urlFilename`, `[x.webp]` vs `x.webp` -> `x.jpg`, and
  status `pending` (v2 OD-17 (2)-(4)) are unanswered. (4) The FROZEN prompts say nothing about carrying
  `[file.jpg]` through, so the model may drop, case-change or rewrite a marker; the post-processor then
  never sees it, no warning fires and the image falls to the coverage fallback (end of document).
  Is silent degradation acceptable (OD-2 accepted that the LLM carries markers through)? (5) The
  post-processor runs in every repair attempt (`produce`), and field/block repairs mutate the Doc later:
  must it be idempotent?
- **Why it cannot be inferred:** checked OD-8, OD-9, OD-12, OD-17 answers, Story Q1, `addGenImgFiles`
  (no dedupe), `task-a.ts`/`task-c.ts` marker handling (none), `runDocGate` produce/validate structure.
- **Impact:** inconsistent warning counts, wrong matching on duplicates, an untestable AC-2 for model-dropped
  markers.
- **Assumption for the spec:** (1) once, uk-UA master context; (2) the OD-9 regex is the parser contract
  and the Q1 hint is informative; (3) first uploaded entry wins on a duplicate, `.webp` marker matches by
  `originalFilename`, `pending` counts as unmatched; (4) accepted degradation, AC-2/AC-5 are tested against
  the post-processor with markers present in the Doc; (5) idempotent.

---

## Dependencies (not decisions)

- Consumables Doc pipeline image support landed via PR #100 (merged); AC-4 depends on it - satisfied.
- Image manifest and Vision Phase 1 exist.
- `test/render-reconciliation.report.md` section 5 lists no open gap affecting images; section 3 confirms
  `renderFigure()` is the figure emitter on the Doc path.
