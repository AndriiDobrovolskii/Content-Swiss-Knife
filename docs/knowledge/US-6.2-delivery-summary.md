---
artifact: delivery_summary
story: US-6.2
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-07T09:30:00Z
updated_at: 2026-10-07T09:30:00Z
supersedes: null
---

# US-6.2 delivery summary — `<b>` and `<strong>` are no longer rewritten; the master prompt uses `<b>` for all emphasis

## What was delivered
Optimizing a description no longer rewrites every `<b>` into `<strong>`, and the generation prompt no longer tells the
model to reserve `<strong>` for brands, models and core USPs. The bold tag that is supplied is the bold tag that comes
out of the cleaner, on both the Optimizer path and the no-LLM Fast path, and the model is told to use `<b>` for all
emphasis.

Concretely:
- `src/utils/html-cleaner.ts`: the unconditional `<b>` → `<strong>` rewrite (it copied `innerHTML` only, dropping
  attributes) is deleted, with no compensating logic. Heading hygiene (bold unwrapped inside `h2`–`h4`) is unchanged.
- `src/prompt-core/master-system-prompt.ts` (**FROZEN**, AGENTS.md §9): the `[FORMAT]` sentence "Reserve <strong> for
  brands / main model / core USPs at a density of 2–3 per 500 characters maximum; use <b> for inline spec scannability."
  is replaced by "Use <b> for all emphasis (brands, models, specifications)." The density cap is dropped; the trailing
  "Emit only tags that wrap content. Keep a high text-to-HTML ratio." is byte-identical. The edit was made under the
  human's explicit §9 permission recorded in Story v3 (2026-10-06), for that one file only.
- `.arch-guard-checksums` re-baselined in the same commit, exactly one changed line (`master-system-prompt.ts`);
  `test/fixtures/golden/full-description-prompts.json` regenerated with exactly 10 one-sentence replacements.
- No override was added to `src/prompts/optimizer.ts` (explicitly rejected by the human on 2026-10-06).

The master prompt is sent by Task A (including the uk-UA master, so every locale), Task C, the Optimizer and the Doc
pipeline via `buildPromptA`; it is a locale-neutral formatting rule. Already-generated masters keep their `<strong>`.

Delivered by PR #136 (`feat/US-6.2-preserve-b-and-strong-tags`), merged into `main` at 2026-10-07T09:19:06Z as merge
commit `6d4e120`; pushed tip `8d059e1` (three commits: `33c4431` T1, `a9ede90` T2, `8d059e1` delivery docs). Track:
angular, with the FROZEN prompt edit as a prompt-track task.

## Acceptance criteria and how each was proven
Matrix: `docs/tests/US-6.2-ac-test-matrix.md`. Tests run under `npm run test:logic`.

| AC | Proof |
|---|---|
| AC-1 `<b>` stays `<b>` through `cleanHtmlStructure` | `html-cleaner.spec.ts` (was red, green after T1) |
| AC-2 `<strong>` stays `<strong>` | `html-cleaner.spec.ts` (guard, green before and after) |
| AC-3 mixed input keeps each tag count outside `h2`–`h4` | `html-cleaner.spec.ts` (4 `<b>`, 5 `<strong>` in the input) |
| AC-4 master prompt no longer reserves `<strong>`, says `<b>` for all emphasis | `master-system-prompt.spec.ts`, two tests against the exported `MASTER_SYSTEM_PROMPT` |
| AC-5 heading hygiene unchanged | `html-cleaner.spec.ts` (guard) |
| AC-6 Fast path keeps both tags | `html-cleaner.spec.ts`: real `finalizeTablesForDisplay(cleanHtmlStructure(...))` composition |
| AC-7 `class` on `<b>`/`<strong>` kept | `html-cleaner.spec.ts`: class checked on both tags, each selected by its own tag name |
| AC-8 minimal FROZEN diff, `optimizer.ts` untouched | in-prompt trailing-bytes test (newline included) plus `git diff`: one hunk (−2/+1), `optimizer.ts` not in the diff |
| AC-9 arch-guard baseline in the same commit | `bash arch-guard.sh` exit 0 after `--rebaseline`; checksum change in `a9ede90`, one line |
| AC-10 existing specs/golden updated, no test weakened | `full-description.golden.spec.ts` 14/14 on the regenerated golden; both spec files have additions only (+29, +67 lines) |

## Gate results
- Quality gate at `a9ede90` (so-gate-enforcer): `npm run lint` clean; `test:logic` 164 files, 4578 passed, 3 skipped
  (the existing `LIVE_DOC_TEST`); `test:components` 2 files, 32 passed; coverage 93.91 / 88.01 / 95.19 / 94.43
  (statements / branches / functions / lines), floors held, `vitest.config.ts` unchanged; `npm run build` clean;
  `bash arch-guard.sh` OK with all five frozen checksums consistent; `npm run validate:harness` 0 errors.
- Implementation verification: PASS (one FROZEN file, §9 permission recorded, re-baseline in the same commit, only the
  emphasis sentence changed, prompt-cache block 0 intact).
- Security review: PASS, one non-blocking finding (NB-1, below). Static review only.
- Reconciliation: PASS, AC-1..AC-10 each have an existing test or proving check that would fail on violation.
- Human gates: spec v2 and plan v2 approved after rework; PR gate approved with the approver's statement that the manual
  run M1 was performed and works (not independently verified; the generated reports still list it pending because they
  predate the approval).

## Process notes
- The Story was rewritten three times. v1 chose a cleaner-only fix; v2 added an Optimizer-prompt override and kept the
  FROZEN master prompt untouched; the human then rejected plan v1 ("do not bloat optimizer.ts with overrides") and
  granted explicit §9 permission to edit the master prompt, which produced Story v3, specification v2 and plan v2.
- Early clarification ran blocked (OD-1, OD-2 were genuine decisions), then passed after Story v2.
- One reviewer run stalled without a Result Envelope and was re-run; the stalled review file was not accepted.

## Open Decisions
Resolved by the human: OD-1 fix layer (cleaner plus FROZEN master prompt edit, override rejected), OD-2 AC-4 as a prompt
contract (later re-pointed at the master prompt), OD-3/OD-4 Fast path in scope with no compensating logic, OD-5
attributes and the AC-3 counting rule, OD-6 AGENTS.md §4 figcaption `<b>` rule.

Deferred (non-blocking, labelled assumptions in specification v2):
- OD-8: `itemprop`/`itemscope`/`itemtype` on a bold tag is still stripped by the cleaner's microdata step
  (`html-cleaner.ts:279-283`); AC-7 covers `class` only.
- OD-9: nothing deterministic enforces a `<b>` lead-in in `<figcaption>` — the Optimizer path never calls the FROZEN
  `output-validator.ts` and the Fast path has no model; a figcaption `<strong>` in raw input passes through.
- OD-10: the density cap is dropped with the old sentence; trailing sentences kept verbatim.
- OD-11: other prompts still restate the old rule — `src/prompts/task-a-doc.ts:96`,
  `src/prompts/simplified-template-blocks.ts:127`, `src/prompt-core/constants.ts:1189-1190` (stale comment) and
  `src/prompts/copywriter.ts:53`. The Doc pipeline therefore carries contradictory emphasis guidance, though output stays
  valid because both tags are now preserved.
- OD-12 (golden fixture) was resolved by T2 itself.

## Follow-ups
- NB-1 (security): `<b>`/`<strong>` attributes (`onclick`, `style`) now pass `cleanHtmlStructure` unsanitised and the
  Fast-path and Optimizer output is rendered through `| safeHtml` (`bypassSecurityTrustHtml`, `app.component.html:1620`).
  Self-XSS class that already existed for `<p>`, `<span>` and `<strong>`; recommend a Story that runs `sanitizeUntrustedHtml`
  on that output.
- A Story to reconcile the emphasis rule in the four prompts listed under OD-11.
- Live-model obedience (the model really emits `<b>`) is proven only by the human's manual run (M1), not by tests.
- One unnamed failure (1 of 4577) in the builder's first full `test:logic` run was not reproduced in three later full
  runs; if it recurs, capture the test name from the first output.
- The PR #136 body still contains a stale "Before the PR can be opened" section about uncommitted docs.
