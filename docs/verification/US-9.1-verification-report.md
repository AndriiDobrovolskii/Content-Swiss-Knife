---
artifact: verification_report
story: US-9.1
version: 1
status: DRAFT
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-18T20:17:58Z
updated_at: 2026-10-18T20:17:58Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
  - key: implementation_report
    version: 1
  - key: quality_gate_report
    version: 1
open_decisions_blocking: false
---

# Implementation Verification - US-9.1 (track prompt)

Verdict: **PASS** (7 non-blocking findings). Diff reviewed: `6546db8..9d8b0c2` (BASE..HEAD), 88 files; production
diff is 20 files. The reports were not used as evidence; every check below was made against the diff, git objects,
`docs/workflow/history.jsonl` and the files at HEAD. The mechanical gate was not re-run.

## 1. Architecture Rule 2 (retrieval separate from generation) - holds

Review-only check (no automated check exists). Read:

- The production diff touches no retrieval path: `server/**`, `src/services/retrieval*`, `RetrievalProvider` /
  `SerperRetrievalProvider` are absent from `git diff --name-only`.
- `src/services/content-orchestrator.service.ts` (3 hunks, 10 lines): an import of `OPERATOR_NOTE_FIELDS`
  (a key list), one spread in `numericFidelitySources` (reads typed `input.operatorNotes`), and two reworded
  `video-embed-restored` warning strings. No `fetch`, no search, no grounding call added.
- Operator notes are typed input: `OperatorNotesFieldsComponent` -> `OperatorNotesFormState` -> `buildGeneratorInput`
  -> `ProductInput.operatorNotes` -> `buildOperatorNotesBlock` in `userContent`. Nothing is retrieved or fetched, no
  Serper content enters the block.
- New modules `image-deixis.ts` (type import only), `description-metrics.ts` (type import only),
  `tools/measure-description.ts` (`node:fs`, `linkedom`, the two utils; no network, no model call) are pure.
- No Google Grounding reintroduced (grep of added lines for grounding/Serper/fetch: only the pre-existing
  `groundingDisabled` context lines, none added).

## 2. AGENTS.md section 4 HTML criteria (prompt/validator changed) - holds, with a limit

Checked against the prompt text at HEAD, the validator, and the corpus fixtures:

- The master hunks leave the figure/video contract intact: `<figure>` + `<figcaption>`, `loading="lazy"` rules,
  `decoding="async"`, the inline style, no `<figure>` in `<p>`, video wrapper and figcaption-in-own-language, spec
  fidelity, SEO meta, `<hr>` rules are in untouched hunks (no `-` line touches them). The "no orphan images"
  requirement survives as `PRECEDING PARAGRAPH` ("precede every `<figure>` with a `<p>`"), the SPACING sentence
  ("every `<figure>` ... has a narrative `<p>` directly above it") is kept, and "paragraph and figcaption separate jobs"
  is kept.
- Video: `[VIDEO]` now says "Place every embed directly after a body paragraph ... Emit exactly one copy per language
  version" - the "video present in input is present in output" rule and the one-copy rule are preserved;
  `LEAD_IN_TEMPLATES` still inserts a `<p>` above a restored embed (pointer clause removed in all 7 languages);
  `video-figure.ts` / `FIGCAPTION_TEMPLATES` untouched.
- `output-validator.ts`: only O1 (message text) and O2 (one `issues.push(...imageDeixisIssues(...))` at `warning`
  inside the existing `try`). **`meta-description-currency` is untouched and still disarmed** (line 683 conditional on
  `currencySymbol`, not in the diff; `src/services/seo-currency-wiring.spec.ts` not in the diff). No Product itemtype,
  number-unit spacing, spec-count, meta_title/meta_description logic changed.
- Corpus run (read-only, `node tools/measure-description.ts`): `test/fixtures/baseline/creality-pika-uk-v2.html` gives
  0 deixis hits, 0 figures without a paragraph above, 0 consecutive figures, 0 numbers absent; the old
  `description_uk-UA.html` gives 28 deixis hits. The fixture is a hand-edited oracle: it has 20 `<figure>`, first
  `<img>` without `loading="lazy"` and the rest with it, `decoding="async"` on all sampled, 0 Product itemtype, 0 `<br>`,
  1 `<iframe>`.
- **Limit (review-only, not caught by anything):** there is no live model output for the new prompt. AC-11/AC-12
  (T36/T42) are manual, owner-run, and not done. Section 4 compliance of real generations after the prompt change is
  therefore unverified; it is verified for prompt text, validator and fixtures only.

## 3. STORE_REGISTRY as the only source - holds, one minor note

- `image-deixis.ts` is keyed by primary language subtag (`uk ru en pl de es pt`), never reads the registry; a spec
  cross-checks the keys against the registry languages. `LEAD_IN_TEMPLATES` already used language keys.
  `figureCaptionWarnings(figures, locale = 'uk')` defaults to a language code (documented, with the NFR-6 pin).
- No currency symbol, no image base URL, no region-locale list added in `src/`. `task-a.ts` still takes the base URL
  from `store.imageBaseUrl`.
- Note (F2): `tools/measure-description.ts` has `args.locale ?? 'uk-UA'` and a `--locale uk-UA` usage example. A
  hard-coded store locale outside `constants.ts` in a developer CLI; `MASTER_LOCALE` exists. Non-blocking.

## 4. Prompt-caching block separation - holds

- `task-a.ts` `systemBlocks` unchanged in structure: master (`cache: true`), `TASK_A_INSTRUCTION` (`cache: true`),
  then the EXPERT3D or C3D overlay (`cache: true`), mutually exclusive. The diff has 0 lines containing `systemBlocks`
  or `cache`. `task-a-doc.ts` still replaces only `systemBlocks[1]`.
- The `[Operator Notes]` block is added to `userContent` (the per-run part), not to a cached block.
- Block 0 (master) grows by static text only: `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` are constants with no
  per-store or per-run interpolation. The cached prefix changes once for all stores, as the plan (NFR-1, R19) said.
- Blocks 1.. : `TASK_A_INSTRUCTION` (T-A1 clause) and the EXPERT3D overlay (APPLICATIONS/HEADINGS) changed as planned;
  no block count change.

## 5. FROZEN files (section 9)

- **task-b.ts, task-c.ts: byte-identical** to BASE (`git diff --quiet 6546db8 HEAD` and against the worktree; their
  `.arch-guard-checksums` lines unchanged).
- **Approval events.** `docs/workflow/history.jsonl` line committed in `cd8b04f` (2026-10-18T15:24:23Z, actor
  `sbruhov@gmail.com`, before any FROZEN edit) quotes the owner verbatim: "modify src/prompts/task-a.ts, modify
  src/utils/output-validator.ts, modify src/prompt-core/master-system-prompt.ts", one instruction per file, scoped to
  the US-9.1 hunks (task-a T21-T24, validator T25-T26, master T27-T32), and states task-b/task-c are not covered. Read
  from the event itself, not from `pipeline_status`.
- **12 FROZEN commits, each re-baselined in the same commit** (verified by hashing each commit's frozen blob through
  the same line-ending filter arch-guard hashes and finding it in that commit's `.arch-guard-checksums`):
  7397081, 7c8fae9, 266cd9c, 87fb3c0 (task-a); ff8ad92, 7958c7f (validator); a0e33a5, 3110e94, 18cad1f, ecaa2fd,
  6db2885, d5d207a (master). All 12 match. These are the only 12 commits touching the three frozen files and the only
  commits touching `.arch-guard-checksums`. HEAD checksums equal the worktree hashes.
- **Hunks against the plan (diff of each frozen file vs BASE, no extra edits found):**
  - task-a.ts: T-A1 (`</ul>` clause), T-A2 (video block), T-A3 (marker block), T-A4 (import + one interpolation
    before `buildImageBlock`) - exactly those four, wording equal to the plan.
  - output-validator.ts: O1 (message), O2 (import + one push). O2 is `imageDeixisIssues(doc, locale ?? '', context)`
    where the plan wrote `locale` (F4, type adaptation: `locale` is `string | undefined`; an empty language returns no
    hit by design).
  - master-system-prompt.ts: M1 import, M2 (`${NO_IMAGE_DEIXIS_RULE}` between `[VIDEO]` and `[IMAGE HANDLING]`), M3
    (`[VIDEO]` sentence), M4 (new first lock bullet + changed example bullet), M5 (PLACEMENT three bullets, SPACING kept),
    M6 (STRICT INPUT SCOPE + neutral INTERNAL RECONCILIATION, equal to Appendix B), M7 (`${LIVELINESS_RULES}` after
    `${SENTENCE_LENGTH_RULES}`). No residual "image below shows" / "visible here" / "SUBSTANTIVE NARRATIVE" /
    "Introduce every embed" strings remain in the frozen prompt files.
  - Golden `full-description-prompts.json` was regenerated in the same commits that forced it.
- Ordering vs owner intent (T-A4 first, validator second, master last): T-A4 was first and master last; validator
  edits fall between task-a commits (T-A2 before, T-A1/T-A3 after). Intent only, not an approval term.
- Finding F1 (non-blocking, human awareness): the approval event says "Scope: this session only". The three round-3
  master commits (ecaa2fd, 6db2885, d5d207a, 2026-10-18T23:02-23:05+03:00) came about 4.7 hours after the grant and
  after a loop-back to TEST_WRITING; `history.jsonl` records no re-grant. The grant is per-file and names T27-T32, so
  the hunks are inside its stated scope, but whether it was still live is not evidenced in the record.

## 6. Angular and server conventions - holds

- `OperatorNotesFieldsComponent`: standalone; `OperatorNotesFormState` is a plain class with a signal and no
  decorator/`inject()` (field of `AppComponent`); no `NgModule`; no RxJS added.
- No SDK import added; prompt text lives in `src/prompt-core/constants.ts`, `src/prompts/*` (including the new leaf
  `operator-notes.ts`); the service gained only warning strings of the existing kind and a key list import.
- `server/**` and `package.json` unchanged (0 diff lines): no secret path, no usage-store schema change, no new
  dependency (`linkedom` already present).
- Operator notes are operator-typed, trimmed, never logged by the new code; no key or secret appears in the diff.

## 7. Scope discipline

Every production file maps to the breakdown or plan: deixis detector and consumers (`image-deixis.ts`,
`image-placeholder.ts`, validator), `LEAD_IN_TEMPLATES`, video message wording, orchestrator warnings, operator-notes
module/type/component/form-state/app wiring/history restore/Clear All, Vision pre-pass, Doc FIGURE PLACEMENT,
`NO_IMAGE_DEIXIS_RULE`/`LIVELINESS_RULES`, EXPERT3D overlay, C3D OVERRIDE #5, `description-metrics.ts` + CLI. The Vision
pre-pass additions ("State only what is visible...", "one alphabet") are quoted in Specification v5. No drive-by
refactor, rename or comment deletion found. Existing tests edited: `task-c.description-bytes.spec.ts` (planned Task C
guard amendment D0) and fixtures `faq-pipeline.ts`, `full-description-inputs.ts`, golden JSON - test-writing/forced-regeneration
artifacts, not production.

## Findings (all non-blocking)

| ID | Finding |
|---|---|
| F1 | FROZEN grant says "this session only"; round-3 master commits are hours later with no re-grant event recorded (section 5). |
| F2 | `tools/measure-description.ts` hard-codes `'uk-UA'` default/usage; could use `MASTER_LOCALE` (section 3). |
| F3 | Section 4 compliance of live model output is unverified; AC-11/AC-12 manual runs T36/T42 not done (section 2). |
| F4 | O2 deviates trivially from the plan text: `locale ?? ''` instead of `locale`. |
| F5 | Commit order relative to the owner's stated intent: validator edits interleaved with task-a commits. |
| F6 | `imageDeixisIssues` match text for the pointer-adverb pattern includes the next letter (CLI printed "Нижче р"); cosmetic detail text. |
| F7 | Cross-family effect accepted by the plan (R22): the master edit changes block 0 of Task C description translation and the optimizer, names `[Operator Notes]` there although their `userContent` never carries it. |

## Which checks were review-only

Rule 2 (no tool checks it), FROZEN approval + same-commit re-baseline (arch-guard checks only the checksum, not approval
or commit), hunk-vs-plan fidelity, prompt-caching block structure (no test pins block counts for the new text),
STORE_REGISTRY literal scan (partly pinned by NFR-6/NFR-8 specs, the CLI default is not), and the section 4 wording
survival. The disarmed `meta-description-currency` rule is pinned by a spec; it was left untouched.
