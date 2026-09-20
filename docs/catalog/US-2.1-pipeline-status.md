---
artifact: pipeline_status
story: US-2.1
version: 2
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-20T22:10:00Z
updated_at: 2026-09-21T19:00:00Z
supersedes: docs/catalog/US-2.1-pipeline-status.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: test_strategy
    version: 2
  - key: ac_test_matrix
    version: 2
open_decisions_blocking: false
---

# Pipeline Status — US-2.1: Migrate product descriptions to the v4.0 UA content schema

**All thirteen tasks are implemented and committed, and the suite is green.** The verdict at v2 is
**`PASS`**.

This revision supersedes v1, whose `CHANGES_REQUIRED` / `changes_required_tests` verdict was raised
for **two test-side defects that no implementation could resolve** (F3, F4). `so-test-writer` closed
both in `cf839ad` and re-recorded its three artifacts at v2 in `0e826ca`. v1's verdict is therefore
spent, and this artifact — `QUALITY_GATE`'s input — is re-recorded to say so.

**No implementation code was written on this pass.** Every re-verification below was re-derived from
the tree at `0e826ca`, not copied forward from v1, and no task's acceptance check was found unmet.

Execution followed the order the HUMAN_PLAN_APPROVAL decision mandates:
**T1, T2, T3, T4, T5, T13, T6, T7, T8, T9, T10, T11, T12** — not ascending id order.

---

## Measured state at HEAD `0e826ca`

Every figure below was re-measured on this pass.

| Check | Result |
|---|---|
| `npx vitest run` (**`test:logic`**) | **122 files passed (122)**; **2812 passed \| 3 skipped (2815)**, **0 failed** |
| `npm run test:components` (**`ng test`**) | **1 file, 4 passed (4)**, **exit 0** |
| `npm run lint` (`tsc --noEmit`) | **CLEAN — exit 0, no output** |
| `bash arch-guard.sh` | **✅ ALL CHECKS PASSED** (Rules 1, 3, 4 + FROZEN) |
| `npm run test:coverage` | **exit 0** — report emitted, **every floor met** |

### Coverage, re-derived (F6's answer)

Global summary, and the three directories carrying raised floors:

| Scope | Statements | Branches | Functions | Lines | Floor (`vitest.config.ts:75-83`) |
|---|---|---|---|---|---|
| **All files** | 91.96% (2999/3261) | 85.83% (1787/2082) | 94.12% (641/681) | 92.56% (2554/2759) | 80 / 75 / 80 / 80 — **met** |
| `src/domain/**` | 100 | **95.45** | 100 | 100 | branches ≥ 90 — **met** |
| `src/prompt-core/**` | 98.12 | **88.96** | 100 | 99.09 | branches ≥ 85 — **met** |
| `src/render/**` | 99.39 | **91.75** | 100 | 100 | branches ≥ 90 — **met** |

These agree to the digit with `so-test-writer`'s independently measured §8.4 table. No threshold was
lowered and no `include` was narrowed — `vitest.config.ts` is unchanged for the whole Story.

### Baseline, for the record

At `0622de6` the suite measured **179 failed / 2615 passed / 3 skipped (2797)**, 14 failed files, and
`npm run lint` had **8 errors** — 2 × `Cannot find module './hook-pattern'` (**T6** creates it) and
6 × `buildPromptADoc` called with 3 arguments (**T7** adds the optional parameter). Under the
mandated order, lint was therefore necessarily red at T2, T3, T4, T5 and T13 for reasons those tasks
neither cause nor cure, and went clean at **T8**. The dispatch's quoted 213/2581 did not reproduce:
the working tree already carried ~140 uncommitted lines of T2-shaped work in
`src/prompt-core/constants.ts`. Nothing was reverted to chase a tree state that no longer exists.

The suite total rose from 2797 to 2815 because two spec files previously failed to *load* — their
tests were never counted — and now run.

---

## Provenance of the green suite — re-derived

The question `QUALITY_GATE` and `RECONCILIATION` will ask is whether the suite went green because
the code got right or because the tests got easier. Three diffs answer it:

| Claim | Command | Result |
|---|---|---|
| `so-test-writer` changed **no implementation** to make a test pass | `git diff --stat 8e57d26..HEAD -- src/ ':!*.spec.ts'` | **empty** |
| `so-builder`'s 15 commits touched **no test** | `git diff --stat 0622de6..8e57d26 -- '*.spec.ts' 'test/**'` | **empty** |
| The only test change in the whole range is `cf839ad`'s two files | `git diff --stat 0622de6..HEAD -- '*.spec.ts' 'test/**'` | `hook-pattern.spec.ts` (+25/−11), `task-a-doc.spec.ts` (+10/−1) — and `git log` over those two paths lists **`cf839ad` alone** |

No fixture and no coverage setting appears in any of those diffs.

---

## Task status

| Task | Track | Status | Commit |
|---|---|---|---|
| T1 — `'3.0'` fixture baseline | angular | **DISCHARGED BY TEST_WRITING** (F1) | 0622de6, not a builder commit |
| T2 — v4 heading table in `constants.ts` | prompt | **DONE** | `761c371` |
| T3 — widen `schemaVersion` + version-guarded refinement | angular | **DONE** | `3c91582` |
| T4 — CTA heading resolver | prompt | **DONE** | `f30e85a` |
| T5 — renderer §2 / §9 branch | angular | **DONE** | `33a2a66` |
| T13 — §6 `<ol>` | angular | **DONE** | `38e0b04` |
| T6 — hook-pattern selector | prompt | **DONE** — 13/13 since `cf839ad` (F3) | `a2e973a` |
| T7 — `TASK_A_DOC_INSTRUCTION` v4 contract | prompt | **DONE** — green since `cf839ad` (F4) | `3bd1873` |
| T8 — orchestrator wiring | angular | **DONE** | `53b80a5` |
| T9 — `NUMBER_FORMAT_RULES` | prompt | **DONE** | `b656dce` |
| T10 — `number-format-fixer` | angular | **DONE** | `d993fee` |
| T11 — FAQ prompt numbers | prompt | **DONE** | `33adf2a` + `8b34852` (F5) |
| T12 — `master-system-prompt.ts` [§9 GATE] | prompt | **DONE** | `85ebaa3` |

Every task ended in one commit, with the single exception of T11, whose §8/§9 correction (F5) is a
second commit for the reason recorded there.

**One commit touched a path outside its task's breakdown-v2 Files list, and it was authorized.**
`85ebaa3` (T12) also modified `src/prompts/optimizer.ts`. Breakdown v2 names that file only as a
consumer whose spec "must stay green unmodified"; the **HUMAN_PLAN_APPROVAL decision postdates
breakdown v2** and extends T12 explicitly — *"T12 also updates `src/prompts/optimizer.ts` (NOT
frozen) — its instruction at lines 21, 40, 49-53, 61 is SEMANTICALLY rewritten for v4"* — to close
plan-review v2's first non-blocking finding. See F2. No other commit left its task's Files list.

---

## T12 precondition 1 — the FROZEN `task-c.ts` inspection (R6): **no second §9 request**

Performed at the **start** of IMPLEMENTATION rather than when T12 came up, as T12's preconditions
and C-4 require, so the approval surface was known complete while the other tasks proceeded.

**R6 does not materialize.** The risk was that `task-c.ts`'s §7 `<h3>` preservation count would be
invalidated by the §2 change. It is not, because of a scoping regex:

```js
const section = html.match(/<section\s+class="specs"[\s\S]*?<\/section>/i);
if (!section) return 0;
return (section[0].match(/<h3\b/gi) ?? []).length;
```

The count is taken **only inside `<section class="specs">`** — §7 — after that section is isolated.
Every §2 change in this Story happens **outside** that element, and the interpolated instruction
speaks only of "`<h3>`+`<table>` category block(s) under `<section class="specs">`".

`git diff --stat 0622de6..HEAD -- src/prompts/task-c.ts` is **empty**, re-verified at `0e826ca`. The
§9 surface for this Story is exactly what the human granted: **`src/prompt-core/master-system-prompt.ts`
alone.**

## FROZEN-file discipline — re-verified at `0e826ca`

`bash arch-guard.sh` reports **✅ All frozen files unchanged**. Re-derived per file against the
TEST_WRITING baseline `0622de6`:

| FROZEN file | `git diff --stat 0622de6..HEAD` |
|---|---|
| `src/prompts/task-a.ts` | **empty** |
| `src/prompts/task-b.ts` | **empty** |
| `src/prompts/task-c.ts` | **empty** |
| `src/utils/output-validator.ts` | **empty** |
| `src/prompt-core/master-system-prompt.ts` | 43 insertions, 51 deletions — **the one approved surface** |

`--rebaseline` ran and `.arch-guard-checksums` landed **in T12's own commit `85ebaa3`**, which is
the only commit in the range touching that file; its diff is exactly **one line**, the
`master-system-prompt.ts` hash. The two negative acceptance checks both hold: `task-a.ts` empty
(T7 check 3) and `output-validator.ts` empty (T5 check 6).

## Test-file name mapping (breakdown → tree)

`TEST_WRITING` wrote sibling `.v4.spec.ts` files rather than adding blocks to the specs the
breakdown names. Recorded so each task's "tests to turn green" resolves:

| Breakdown names | Actual file |
|---|---|
| `description-doc.schema.spec.ts` (V1, V2, V12) | `src/domain/description-doc.schema.v4.spec.ts` |
| `render-description.spec.ts` (V3, V15) | `src/render/render-description.v4.spec.ts` |
| `constants.spec.ts` (V7) | `src/prompt-core/v4-headings.spec.ts` |
| `constants.spec.ts` (V9) | `src/prompt-core/number-format-rules.v4.spec.ts` |
| `task-a-doc.spec.ts` (V6, V10) | `src/prompts/task-a-doc.v4.spec.ts` |
| `task-faq.spec.ts` | `src/prompts/task-faq.v4.spec.ts` |
| `heading-style.spec.ts` (V8) | `src/utils/heading-style.v4.spec.ts` |
| `number-format-fixer.spec.ts` | `src/utils/number-format-fixer.v4.spec.ts` |
| `render-conformance.spec.ts` (V14) | `test/render-conformance.v4.spec.ts` |
| `master-system-prompt.spec.ts` (T12) | `src/prompt-core/master-system-prompt.v4.spec.ts` |
| `content-orchestrator.ua-doc-pipeline.spec.ts` | `src/services/content-orchestrator.hook-pattern.spec.ts` |

**Side effect worth recording:** because the v4 assertions live in *new* files, the breakdown's
"unchanged file" evidence checks — T7 check 3 and T12 check 7 — are satisfied by construction.

---

## Findings

### F1 — T1's C-1 baseline evidence is unobtainable (evidentiary, not behavioural) — **STANDS**

`test/fixtures/v4-docs.ts` was committed by `so-test-writer` at 0622de6 carrying **both** families
— the six `'3.0'` builders *and* the `'4.0'` family. T1's remaining work was nil, and two checks
are unsatisfiable as written: T1 check 3 (grep must return no `'4.0'` literal) returns 4 hits, and
T3 check 5 (additive diff) is moot because T3's diff on that file is empty.

That one-commit authoring is the merge C-1 and R10 were written to prevent. The value lost is
**evidence**, not correctness: a `'3.0'` fixture authored beside the rule it dodges is shaped by
that rule. The breakdown pre-authorizes this reading in its carried finding 7.

**Disposition: a finding, not a blocker, and not a thing to repair.** Stripping the `'4.0'`
builders would mean editing a fixture to satisfy a checklist — the exact §7.7 move this pipeline
exists to prevent. **It stands for RECONCILIATION**, unchanged at v2.

**What was salvageable was salvaged.** V15's `'3.0'` half — capturable only before the renderer
moved — was run against the **unmodified** renderer and passes:

```
npx vitest run src/render/render-description.v4.spec.ts -t "renders the package-contents list as a <ul>"
  ✓ V15 … > `3.0` — renders the package-contents list as a <ul>
  Test Files 1 passed (1)   Tests 1 passed | 13 skipped (14)
```

Measured at a commit where `git diff --stat src/render/` was empty, so the evidence D17 needs
exists in this report even though it does not exist as a T1 commit.

### F2 — `optimizer.spec.ts` was red at baseline, and it was T12's — **CLOSED**

The breakdown names `optimizer.spec.ts` as a file that "must stay green unmodified"; it was red
(5 failed / 6 passed) at `0622de6`. This is the **same staleness** as T12's "approval UNGRANTED":
the HUMAN_PLAN_APPROVAL decision postdates breakdown v2 and extends T12 to semantically rewrite
`optimizer.ts` for v4. **Closed at T12** — all 11 pass, and `optimizer.spec.ts` itself was never
edited.

### F3 — `hook-pattern.spec.ts` purity scan could not run — **RESOLVED at `cf839ad` by TEST_WRITING**

The original test did `fileURLToPath(new URL('./hook-pattern.ts', import.meta.url))` under
`vitest.config.ts`'s global `environment: 'happy-dom'`, whose `URL` resolves against
`http://localhost:3000/` and **ignores the `file://` base**, throwing `ERR_INVALID_URL_SCHEME`
before `readFileSync` was reached. The module's source was never read, so **no content of
`hook-pattern.ts` could affect the outcome** — implementation-independent by construction, which is
why it was returned rather than built against.

`so-test-writer`'s fix imports `URL as NodeURL` from `node:url` — the precedent
`beautify-round-trip.spec.ts:13` already sets — and **adds** an anti-vacuity guard
(`expect(source).toContain('export function selectHookPattern')`) before the three negatives, since
three negatives over an empty string all pass.

**The fix is strictly stronger than what it replaced.** The three original assertions are
byte-unchanged, one assertion was added, `vitest.config.ts` was not touched, and no
`@vitest-environment` pragma was applied that would have changed the environment of the twelve
behavioural tests in the same file. T6's implementation needed no change and got none: all 13 of V5
now pass.

### F4 — the two `task-a-doc` specs were mutually unsatisfiable — **RESOLVED at `cf839ad` by TEST_WRITING, and it was a contract substitution**

`task-a-doc.spec.ts:82` required `'"schemaVersion": "3.0"'` **present** in
`TASK_A_DOC_INSTRUCTION` while `task-a-doc.v4.spec.ts:50` required `'"3.0"'` **absent** from the
same string. No implementation can satisfy both.

`so-test-writer` resolved it by **changing `:82` to pin `"schemaVersion": "4.0"`**. Recorded plainly,
because it is the one place in this Story where a red test was made green by editing a test:

- **What changed:** one `toContain` argument, `"3.0"` → `"4.0"`. The assertion remains a **positive,
  exact-string version pin** — not a deletion, not a `skip`, not a relaxation to a regex or a
  substring, and no coverage setting moved.
- **Why it is a contract change and not a weakening:** FR-15 requires every new generation to emit
  `schemaVersion: '4.0'`; FR-30 and plan D16 forbid a downgrade path. `'3.0'` tolerance is scoped to
  **parse and render**, for already-cached documents — which is `description-doc.schema.spec.ts`'s
  and `render-description.spec.ts`'s subject, not this one. The prompt is what produces a *new*
  generation, so the v3 pin was superseded by the approved Specification.
- **Who made it:** `so-test-writer`, at TEST_WRITING, after `so-builder` **declined** the delegation
  written into `task-a-doc.v4.spec.ts`'s own header (*"`so-builder` updates the `"3.0"` assertion in
  that file as part of T7"*). A comment inside a test file is not authorization to edit tests, and a
  stage that edits the suite it is measured against is the failure mode this pipeline exists to
  prevent. That refusal is why the change is auditable here rather than buried in a feature commit.

**Scope note, so the fix is not read as broader than it is:** exactly **one** assertion changed. The
neighbouring `killerSpecs[].value` test was red at baseline and went green **without being edited** —
under v4 that value genuinely *is* "always a plain string, never an array", so the prompt was worded
accurately rather than the test relaxed. `bullets 3–8`, the prose/plain-text field lists, the
figure-ref and depth-cap pins and the paragraph escape hatch all survived unchanged.

### F5 — the breakdown and the master prompt disagree on the FAQ's section number; the prompt won — **STANDS, and the test cannot discriminate**

The breakdown's T11 is titled *"Carry the v4 §9 numbers into the FAQ prompt"* and calls the FAQ
"v4 §9". But `master-system-prompt.ts`'s own in-band section map — which **T12 edited under the §9
approval** — reserves §9 for `§9 COMMERCIAL CLOSING / CTA` and states
`§8 FAQ/HowTo belongs to dedicated artifacts`.

Labelling the FAQ artifact "Schema v4.0 §9" would have made that string name **the CTA in one cached
prompt and the FAQ in another**. `task-faq.ts` follows the master prompt and reads **`Schema v4.0 §8`**
(`task-faq.ts:10, :49, :50`); the numbers themselves (3–5 pairs, 2–4 sentences, 150–400 words) are
exactly what T11 specified and are unaffected.

**The test does not discriminate between the two numberings, and RECONCILIATION should know that.**
`task-faq.v4.spec.ts:48-49` asserts only:

```ts
it('no longer labels the artifact Schema v3.0', () => {
  expect(payload().userContent).not.toContain('Schema v3.0');
});
```

Both `§8` and `§9` satisfy it. `so-test-writer` confirms this at v2. **This is therefore a
`so-builder` judgment call recorded as such, not a test-driven outcome** — the one substantive
decision in this Story that no assertion pins. Corrected in `8b34852` rather than by amending
`33adf2a`, because the sanctioned US-1.1 rollback is **staged** in the working tree and a rebase to
amend a non-HEAD commit would have put it at risk.

### F6 — the coverage gate could not be evaluated while F3 and F4 stood — **ANSWERED**

v1 recorded that `npm run test:coverage` exited 1 and produced **no report at all**, because vitest
skips report generation when the run has failing tests, so the thresholds were never reached and
neither a pass nor a breach could be claimed. The concern was concrete: this stage added four
defensive branches that no current fixture reaches, under raised per-directory floors.

**Re-measured at `0e826ca`: `npm run test:coverage` exits 0, emits the full report, and every
floor is met** — see the coverage table above. The open question is closed in the affirmative.

`so-test-writer` measured the four branches individually (test-generation-report v2 §8.4) and
reports the same three directory numbers this stage re-derived:

| Branch | Where | Floor | Measured |
|---|---|---|---|
| `?? V4_SECTION_HEADINGS['en-gb']` unlisted-locale fallback | `render-description.ts:277` | `src/render/**` branches ≥ 90 | **91.75** |
| the non-`bullets` arm of `renderKeyBenefitsV4`'s `flatMap` | `render-description.ts:283-284` | same | same |
| the `if (!headings) throw` arm | `store-render-rules.ts:98` | `src/prompt-core/**` branches ≥ 85 | **88.96** |
| the `!headings` arm of the FR-6 membership check | `description-doc.schema.ts:348` | `src/domain/**` branches ≥ 90 | **95.45** |

**`so-test-writer`'s NB-4, carried forward deliberately:** no test was added for any of the four,
and that is a recorded refusal rather than an oversight. All four are unreachable-by-construction
guards over data the schema and `V4_SECTION_HEADINGS` already make total; a test for one would have
to manufacture a state the system cannot be in, and would be written **from the implementation**
rather than from an acceptance criterion — the one thing TEST_WRITING may not do (AGENTS.md §5).
They were likewise **not removed** to flatter the number: each is a real guard, and the `throw` in
particular is the module's established behaviour (`renderContextFor` refuses an empty
`imageBaseUrl` the same way). Recorded so that if a later change trips a floor on them, the next
writer knows they were seen and left.

---

## Working-tree hygiene

The sanctioned **US-1.1 rollback was not touched** on either pass: its staged deletions
(`docs/**/US-1.1-*`, `server/cors-policy.js`, `test/cors-policy.spec.ts`) and unstaged
`server/index.js` / `.env.example` edits remain exactly as handed over. Every commit used an
explicit pathspec (`git commit -m … -- <paths>`), never `git add -A`, `git add .` or `git commit -a`,
and each was verified with `git show --stat HEAD`. Because the rollback's deletions were already
**staged**, a bare `git commit` would have swept them in — the pathspec form is what prevented it.

`docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were **not written**; they
remain the orchestrator's. No branch was pushed and no Pull Request was opened or merged.
