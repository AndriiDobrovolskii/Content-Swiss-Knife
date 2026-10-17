---
artifact: delivery_summary
story: US-8.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-17T14:25:34Z
updated_at: 2026-10-17T14:25:34Z
supersedes: null
---

# US-8.1 delivery summary — one master FAQ in uk-UA, translated per store language, `<b>` markup, and a standalone FAQ Generator

## What was delivered
The FAQ is generated once in uk-UA (the master) and translated into every other language of the selected store, so a store
gets one FAQ in N languages instead of N independently generated, mutually different FAQs.

- **Master + translation pipeline.** One uk-UA master call, then one translation call per other store language (Task C with a
  FAQ input). Languages come from `STORE_REGISTRY` only. A store without uk-UA / with a single language is handled (OD-20).
- **`<b>`, not `<strong>`.** The FAQ prompt lists `<b>`; any `<strong>` the model returns is converted to `<b>` before storage
  (`src/utils/faq-html.ts`).
- **Gates.** Every stored FAQ passes a fail-closed well-formedness / shape gate (`faq-html.ts`, `faq-gate.ts`: unclosed or
  mismatched tags, disallowed elements, attributes, comments / PI / CDATA are rejected) and a structural-parity check against the
  master (`structural-parity.ts`: h3 / p / ul / li counts). At most 3 attempts per language (master and each translation,
  independent of `maxRepairs`); a language that still fails is skipped, not stored.
- **Standalone FAQ Generator mode.** A new mode produces only the FAQ (no description, SEO or slugs) through the same
  master-then-translate path (`generateFaqOnly`), with its own form gate (`faq-form.ts`: Product Name, Supplemental Content and
  Store required; Original Description / Tech Specs optional), a history entry and FAQ-only version tabs (`tab-descriptors`).
- **UA Description / Generator** now also produce the translated FAQs; their description prompts are byte-identical to before
  (96-case SHA-256 golden committed before the first `task-c.ts` edit).
- **Layout (Story v3, AC-21..AC-26).** In the FAQ Generator: no "no content yet" placeholder (one extra conjunct in the
  `app.component.html` empty-state condition), the Supplemental Content input sits directly under Product Name, and its label
  binds a new `supplementalContentRequired` key reading "Supplemental Content (Required)" with `*` (uk: "Додатковий контент
  (Обов'язково)"). Other modes are untouched.
- FROZEN `src/prompts/task-c.ts` edited in exactly two commits (`da59195`, `8c89bce`), each with the
  `.arch-guard-checksums` re-baseline in the same commit under a recorded AGENTS.md section 9 grant (see `pipeline_status`).
  No other frozen file changed. `tools/feedback-form/create-form.gs` gained one dropdown entry (T9, flagged in the plan, no test).

Delivered by PR #140 (`feat/US-8.1-single-master-faq`), merged into `main` as merge commit `ce0bbcc` on 2026-10-17; delivery
tip `8fafbe8`. Plan tasks T1..T17, one commit per task, four loop-back fixes as separate commits. Track: angular.

## Acceptance criteria and how each was proven
Matrix: `docs/tests/US-8.1-ac-test-matrix.md` (its "State now" column is a stale pre-implementation snapshot; every row is green at
the delivery tip). Reconciliation v3 checked row, existence and assertion for all 26 ACs; 16 mutation probes were killed.

| AC | Proof |
|---|---|
| AC-1, AC-2 one uk-UA master, one translation per other language | `content-orchestrator.faq-pipeline.spec.ts`, `.simplified.spec.ts`, `.faq-standalone.spec.ts` |
| AC-3 structural parity with the master | pipeline, `faq-gate.spec.ts`, `structural-parity.faq.spec.ts` |
| AC-4 every store language present | pipeline, simplified, `tab-descriptors.spec.ts` (7 stores) |
| AC-5 no Supplemental Content, no FAQ call | pipeline, simplified (42 guard tests) |
| AC-6 prompt lists `<b>` not `<strong>` | `task-faq.spec.ts` |
| AC-7, AC-8 `<strong>` converted, bold lead kept | pipeline, standalone, `faq-html.spec.ts` |
| AC-9 well-formed HTML, invalid never stored | pipeline, standalone, faq-gate, faq-html |
| AC-10 FAQ Generator mode button | standalone, `app.component.template-wiring.spec.ts` (source-text pins) |
| AC-11, AC-12 form gate | standalone, `faq-form.spec.ts`, template-wiring |
| AC-13 FAQ-only output shape | standalone, tab-descriptors, template-wiring |
| AC-14, AC-15 same path as a full run; history | pipeline, standalone (history is a stub at the mock boundary) |
| AC-16, AC-17 3-attempt cap, master and per language | pipeline, standalone, faq-gate |
| AC-18 description prompts unchanged | `task-c.description-bytes.spec.ts` (96-case SHA-256 golden), `task-c.faq.spec.ts` |
| AC-19 FAQ input recognised in Task C | `task-c.faq.spec.ts`, structural-parity.faq, pipeline + standalone "AC-19 integration" |
| AC-20 frozen files | `bash arch-guard.sh` exit 0 (mechanical by design) |
| AC-21 no empty-state block | `app.component.faq-layout.spec.ts` (evaluated empty-state condition) |
| AC-22 result directly under the tabs | faq-layout spec for the structural clauses; **geometric clause: manual browser check, NEVER RECORDED** |
| AC-23 field order | faq-layout spec |
| AC-24 label reads Required, with `*` | faq-layout spec (key binding, en / uk values, `[required]`, `*` marker) |
| AC-25 mandatory field | existing `faq-form.spec.ts` and wiring pins |
| AC-26 other modes unchanged | faq-layout spec (48-state oracle over four other modes) |

## Gate results
- Quality gate at HEAD `ac62fe4` (so-gate-enforcer, v5): `npm run lint` clean; `test:logic` 185 files, 6380 passed, 3 skipped
  (pre-existing live probes); `test:components` 2 files, 32 passed; coverage 94.13 / 87.95 / 95.62 / 94.69
  (statements / branches / functions / lines), floors held, no threshold lowered; `npm run build` clean (3 known CommonJS
  warnings); `bash arch-guard.sh` exit 0; `npm run validate:harness` 0 errors.
- Implementation verification v5: PASS (Rule 2, section 4, `STORE_REGISTRY` sole source, caching separation, FROZEN with
  recorded approvals).
- Security review v4: PASS. B-1 (blocking in an earlier cycle: comments / PI / CDATA could pass the shape gate) resolved in
  `1ac82e1`. Non-blocking N-1..N-3 and O-1..O-4 are under Follow-ups.
- Reconciliation v3: PASS, AC-1..AC-26.
- Human gates: spec v3, plan v2 / task breakdown v4 approved (HUMAN_PLAN_APPROVAL 2026-10-15); HUMAN_PR_APPROVAL approved
  2026-10-17 with **no approver comment**; READY_FOR_PR approved; COMPLETED approved after the merge was verified against the
  repository (`git merge-base --is-ancestor 8fafbe8 origin/main` succeeded; `gh pr view 140` reported MERGED, `ce0bbcc`).

## Process notes
- The Story went to v3: v1 / v2 covered AC-1..AC-20; AC-21..AC-26 (layout) came from the operator's review and re-entered the
  pipeline as a v4 delta (spec v3, plan v2, task breakdown v4, T14..T17).
- Pipeline artifacts were overwritten in place with a `supersedes` pointer; prior revisions live in git history only.
- At drafting time the branch looked stacked on the unmerged US-7.1 work; US-7.1 merged first, so PR #140 carried only US-8.1
  commits. `pr_summary` still contains that outdated note outside its Body block.
- PR #140 was merged at `8fafbe8` before the bookkeeping commit `dcdc70b` (pull_request artifact, workflow state) was pushed,
  so `dcdc70b` exists only on the feature branch, not in the merged PR.

## Open Decisions
Resolved by the operator or the Specification (recorded defaults encoded in tests): OD-1 (3 attempts replace, not add to, the
repair budget), OD-2 (the `<strong>` ban is FAQ-scoped), OD-3, OD-4, OD-5, OD-7, OD-9, OD-10, OD-11, OD-14, OD-18.
Accepted default still awaiting explicit human confirmation: **OD-13** (uk label "Додатковий контент (Обов'язково)").
Deferred or accepted with a known consequence: **OD-12 / OD-16** (validation and repair panels stay above the result, so AC-22
holds only vacuously on runs that show one; a run that stores no FAQ leaves a blank central area), **OD-17** (the Generate-guard
alert still lists Original Description as mandatory), OD-6, OD-8, OD-19, OD-20 (no AC depends on them).
**OD-15:** the AC-22 geometric clause was assigned to a manual operator check at HUMAN_PR_APPROVAL and was not recorded there.

## Follow-ups
- **The AC-22 manual browser check was never recorded** (panel top edge 32 px / `p-8` below the tab bar, not vertically
  centred, plus the AC-21 / AC-23 / AC-24 / AC-26 visual items in the PR test plan). Nothing in `stage-map.yaml` enforces it,
  and the stage that owns it is named inconsistently across upstream artifacts (HUMAN_PR_APPROVAL vs QUALITY_GATE).
- AC-10, AC-21..AC-24 and AC-26 are source-text / evaluated-condition pins, not rendered DOM; `test:components` still runs only
  the 2 pre-existing component specs. No live-model run was made by any gate; every model call in the suites is stubbed.
- Security, non-blocking: N-1 a poisoned master FAQ fans out to the translation calls (markup is gated fail-closed, wording is
  not); N-2 pasted FAQ fields are interpolated into the prompt without a fence or length cap; N-3 `PERMITTED_TAG` uses `\s`, so
  a Unicode-padded `<b >` is accepted (functional gap only); a raw `<` in FAQ prose is a hard shape-gate rejection.
  Observations: O-1 open `cors()`; O-2 the localStorage history restore skips the FAQ gate; O-3 the single
  `bypassSecurityTrustHtml`; O-4 `.arch-guard-checksums` re-baselines for FROZEN `task-c.ts`.
- `docs/tests/US-8.1-ac-test-matrix.md` v4 "State now" column still reads RED for T14..T17 (stale text).
- `tab-descriptors.spec.ts` hard-codes a per-store language table, guarded by two registry-equality tests.
