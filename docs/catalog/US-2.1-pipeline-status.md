---
artifact: pipeline_status
story: US-2.1
version: 1
status: CHANGES_REQUIRED
owner: so-builder
stage: IMPLEMENTATION
loop_back: changes_required_tests
loop_back_stage: TEST_WRITING
created_at: 2026-09-20T22:10:00Z
updated_at: 2026-09-20T22:45:00Z
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
    version: 1
  - key: ac_test_matrix
    version: 1
---

# Pipeline Status — US-2.1: Migrate product descriptions to the v4.0 UA content schema

**All thirteen tasks are implemented and committed.** The verdict is `CHANGES_REQUIRED` with
loop-back `changes_required_tests` for **two test-side defects that no implementation can
resolve** (F3, F4) — not for missing or incomplete work.

Execution followed the order the HUMAN_PLAN_APPROVAL decision mandates:
**T1, T2, T3, T4, T5, T13, T6, T7, T8, T9, T10, T11, T12** — not ascending id order.

---

## Measured baseline at HEAD 0622de6

Re-measured by `so-builder` as its first action. The figures quoted in the dispatch
(213 failed / 2581 passed) did **not** reproduce, and the delta is explained rather than chased:

| Command | Measured at baseline |
|---|---|
| `npx vitest run` (`test:logic`) | **179 failed \| 2615 passed \| 3 skipped (2797)**; 14 failed / 108 passed files (122) |
| `npm run lint` (`tsc --noEmit`) | **8 errors**, all in the two hook-pattern spec files |

**Why it differs.** The working tree already carried the ~140 uncommitted lines of T2-shaped work
in `src/prompt-core/constants.ts`, which turns part of the V7 block green. Nothing was reverted to
reproduce 213; the quoted number describes a tree state that no longer exists.

The 8 lint errors were: 2 × `Cannot find module './hook-pattern'` (**T6** creates it) and 6 ×
`buildPromptADoc` called with 3 arguments, `Expected 1-2` (**T7** adds the optional parameter).
Under the mandated order, `npm run lint` was therefore necessarily red at T2, T3, T4, T5 and T13
— for reasons those tasks neither cause nor can cure — and went clean at **T8**. This was recorded
once rather than rediscovered per commit, and was explicitly **not** treated as grounds to reorder:
the human gate mandates the order in those words. It is the same class as the breakdown's own
carried finding 7.

---

## Final measured state (code complete at `8b34852`)

| Check | Result |
|---|---|
| `npx vitest run` (**`test:logic`**) | **2 failed \| 2810 passed \| 3 skipped (2815)**; 2 failed / 120 passed files (122) |
| `npm run test:components` (**`ng test`**) | **4 passed (4)**, 1 file, **exit 0** — re-run at final HEAD |
| `npm run lint` (`tsc --noEmit`) | **CLEAN — 0 errors** (was 8) |
| `bash arch-guard.sh` | **✅ ALL CHECKS PASSED** |

**177 of the 179 baseline failures are resolved.** The suite total rose from 2797 to 2815 because
two spec files previously failed to *load* — their tests were never counted — and now run.

**The 2 remaining failures are exactly findings F3 and F4**, one per file:

- `src/prompt-core/hook-pattern.spec.ts` — *"contains no Math.random, no Date and no mutable
  module-level binding"* (**F3**)
- `src/prompts/task-a-doc.spec.ts` — *"pins the schema version the validator expects"* (**F4**)

No test file, fixture, `vitest.config.ts` setting or coverage threshold was modified by this stage.

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
| T6 — hook-pattern selector | prompt | **DONE** (12/13; F3) | `a2e973a` |
| T7 — `TASK_A_DOC_INSTRUCTION` v4 contract | prompt | **DONE** (F4) | `3bd1873` |
| T8 — orchestrator wiring | angular | **DONE** | `53b80a5` |
| T9 — `NUMBER_FORMAT_RULES` | prompt | **DONE** | `b656dce` |
| T10 — `number-format-fixer` | angular | **DONE** | `d993fee` |
| T11 — FAQ prompt numbers | prompt | **DONE** | `33adf2a` + `8b34852` (F5) |
| T12 — `master-system-prompt.ts` [§9 GATE] | prompt | **DONE** | `85ebaa3` |

Every task ended in one commit, with the single exception of T11, whose §8/§9 correction (F5) is a
second commit for the reason recorded there. No commit touched a path outside its task's Files list.

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

`git diff --stat src/prompts/task-c.ts` is **empty**. The §9 surface for this Story is exactly what
the human granted: **`src/prompt-core/master-system-prompt.ts` alone**.

## FROZEN-file discipline

`bash arch-guard.sh` flagged **only** `master-system-prompt.ts`, confirming `task-a.ts`,
`task-b.ts`, `task-c.ts` and `output-validator.ts` are byte-unchanged. `--rebaseline` ran and
`.arch-guard-checksums` landed **in T12's own commit**; its diff is exactly **one line**.

The negative acceptance checks both hold: `git diff --stat src/prompts/task-a.ts` empty (T7 check 3)
and `git diff --stat src/utils/output-validator.ts` empty (T5 check 6).

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

### F1 — T1's C-1 baseline evidence is unobtainable (evidentiary, not behavioural)

`test/fixtures/v4-docs.ts` was committed by `so-test-writer` at 0622de6 carrying **both** families
— the six `'3.0'` builders *and* the `'4.0'` family. T1's remaining work was nil, and two checks
are unsatisfiable as written: T1 check 3 (grep must return no `'4.0'` literal) returns 4 hits, and
T3 check 5 (additive diff) is moot because T3's diff on that file is empty.

That one-commit authoring is the merge C-1 and R10 were written to prevent. The value lost is
**evidence**, not correctness: a `'3.0'` fixture authored beside the rule it dodges is shaped by
that rule. The breakdown pre-authorizes this reading in its carried finding 7.

**Disposition: a finding, not a blocker, and not a thing to repair.** Stripping the `'4.0'`
builders would mean editing a fixture to satisfy a checklist — the exact §7.7 move this pipeline
exists to prevent.

**What was salvageable was salvaged.** V15's `'3.0'` half — capturable only before the renderer
moved — was run against the **unmodified** renderer and passes:

```
npx vitest run src/render/render-description.v4.spec.ts -t "renders the package-contents list as a <ul>"
  ✓ V15 … > `3.0` — renders the package-contents list as a <ul>
  Test Files 1 passed (1)   Tests 1 passed | 13 skipped (14)
```

Measured at a commit where `git diff --stat src/render/` was empty, so the evidence D17 needs
exists in this report even though it does not exist as a T1 commit.

### F2 — `optimizer.spec.ts` was red at baseline, and it was T12's

The breakdown names `optimizer.spec.ts` as a file that "must stay green unmodified"; it was red
(5 failed / 6 passed). This is the **same staleness** the dispatch flags in T12's "approval
UNGRANTED": the HUMAN_PLAN_APPROVAL decision postdates breakdown v2 and extends T12 to semantically
rewrite `optimizer.ts` for v4. **Closed at T12** — all 11 now pass.

### F3 — `hook-pattern.spec.ts` purity test cannot pass under the configured test environment

> `src/prompt-core/hook-pattern.spec.ts:200` — *"contains no Math.random, no Date and no mutable
> module-level binding"* → `TypeError: The URL must be of scheme file` (`ERR_INVALID_URL_SCHEME`)

**Root cause, measured not inferred.** `vitest.config.ts` sets `environment: 'happy-dom'` globally.
Under happy-dom the global `URL` is happy-dom's, and it resolves against the document base
`http://localhost:3000/` **ignoring the `file://` base passed as its second argument**. Probed
directly:

```
import.meta.url  = file:///C:/Work/Content-Swiss-Knife/src/prompt-core/zzprobe.spec.ts
new URL('./hook-pattern.ts', import.meta.url).href      = http://localhost:3000/src/prompt-core/hook-pattern.ts
new URL('./hook-pattern.ts', import.meta.url).protocol  = "http:"
```

`fileURLToPath` then throws **before `readFileSync` is ever reached**, so the module's source text
is never examined. **No content of `hook-pattern.ts` can affect this outcome** — the failure is
implementation-independent by construction.

**The module genuinely satisfies the property being asserted**:
`grep -nE "^\s*let\s|Math\.random|new Date|Date\.now" src/prompt-core/hook-pattern.ts` returns
nothing, and the other **12 of 13** V5 assertions — including every distribution property — pass.

**The repository already has the fix, in the test layer**: `beautify-round-trip.spec.ts:13` imports
`URL as NodeURL` from `node:url` for exactly this reason, and `render-description.node.spec.ts:1`
uses `// @vitest-environment node`. Either would resolve it.

**This is a test file. It is not mine to edit** (AGENTS.md §7.7; the skill's "you do not own the
test files"), so it is reported → `changes_required_tests`.

### F4 — `task-a-doc.spec.ts` and `task-a-doc.v4.spec.ts` are mutually unsatisfiable

> `src/prompts/task-a-doc.spec.ts:82` — `expect(TASK_A_DOC_INSTRUCTION).toContain('"schemaVersion": "3.0"')`
> `src/prompts/task-a-doc.v4.spec.ts:50` — `expect(TASK_A_DOC_INSTRUCTION).not.toContain('"3.0"')`

One requires the literal present, the other requires it absent, in the same string. **No
implementation can satisfy both.** FR-15 and the approved Specification settle which is correct:
every new generation emits `'4.0'`, and FR-30/D16 forbid a downgrade path — so the v4 assertion is
the live contract and `:82` pins a superseded one.

`task-a-doc.v4.spec.ts`'s own header states that *"`so-builder` updates the `"3.0"` assertion in
that file as part of T7"*. **That delegation was not accepted.** A comment inside a test file is not
authorization to edit tests; the skill's rule is categorical, and a stage that edits the suite it is
being measured against is the failure mode this pipeline exists to prevent. The contradiction is
reported instead → `changes_required_tests`.

**Scope note, so the fix is not over-applied:** exactly **one** assertion is affected. The
neighbouring `killerSpecs[].value` test was initially red too and is now **green** — not by editing
it, but because under v4 that value genuinely *is* "always a plain string, never an array", so the
prompt was worded accurately rather than the test relaxed. `bullets 3–8`, the prose/plain-text field
lists, the figure-ref and depth-cap pins and the paragraph escape hatch all survived unchanged.

### F5 — the breakdown and the master prompt disagree on the FAQ's section number; the prompt won

The breakdown's T11 is titled *"Carry the v4 §9 numbers into the FAQ prompt"* and calls the FAQ
"v4 §9" throughout. But `master-system-prompt.ts`'s own in-band section map — which **T12 edited
under the §9 approval** — reserves §9 for `§9 COMMERCIAL CLOSING / CTA` and states
`§8 FAQ/HowTo belongs to dedicated artifacts`.

Labelling the FAQ artifact "Schema v4.0 §9" would therefore have made that string name **the CTA in
one cached prompt and the FAQ in another**. `task-faq.ts` follows the master prompt and reads
**`Schema v4.0 §8`**; the numbers themselves (3–5 pairs, 2–4 sentences, 150–400 words) are exactly
what T11 specified and are unaffected.

`task-faq.v4.spec.ts` asserts only `not.toContain('Schema v3.0')`, so both numberings satisfy it —
this is a judgment call recorded rather than a test-driven one. Corrected in `8b34852` rather than
by amending `33adf2a`, because the sanctioned US-1.1 rollback is **staged** in the working tree and
a rebase to amend a non-HEAD commit would have put it at risk.

### F6 — the coverage gate cannot be evaluated while F3 and F4 stand

`npm run test:coverage` exits 1, and **no coverage report is produced at all** — no table, no
`coverage/` directory — because vitest skips report generation when the run has failing tests.
Confirmed by forcing the text reporter (`npx vitest run --coverage --coverage.reporter=text`),
which also printed nothing. The exit code is driven **solely** by F3 and F4; the thresholds in
`vitest.config.ts` are never reached, so neither a pass nor a breach can be claimed.

This matters because this stage added **defensive branches that no current fixture reaches**, and
`src/render/**` is held at branches ≥ 90 and `src/prompt-core/**` at ≥ 85:

| Branch | File |
|---|---|
| `?? V4_SECTION_HEADINGS['en-gb']` unlisted-locale fallback | `src/render/render-description.ts` (`renderKeyBenefitsV4`) |
| the `: []` arm of the `kind === 'bullets'` flatMap ternary | `src/render/render-description.ts` (`renderKeyBenefitsV4`) |
| the `if (!headings) throw` arm | `src/prompt-core/store-render-rules.ts` (`ctaHeading`) |
| the `!headings` arm of the FR-6 membership check | `src/domain/description-doc.schema.ts` |

Every v4 fixture uses a registry locale with a table entry and bullets-only `keyBenefits`, so none
of the four is exercised. They were **not** removed to flatter an unmeasured number: each is a real
guard, and the `throw` in particular is the module's established behaviour (`renderContextFor`
refuses an empty `imageBaseUrl` the same way).

**Disposition.** The mechanical §6 gate is `so-gate-enforcer`'s stage, not this one. Once F3 and F4
are resolved at TEST_WRITING, coverage runs and the thresholds are checked for the first time. If a
branch floor is then breached, the loop-back is **not** `changes_required_tests` in this skill's
sense — `so-builder` cannot add tests — and the choice is between TEST_WRITING covering these four
paths and a deliberate decision to drop a guard.

---

## Working-tree hygiene

The sanctioned **US-1.1 rollback was not touched**: its staged deletions and unstaged
`server/index.js` / `.env.example` edits remain exactly as handed over. Every commit used an
explicit pathspec (`git commit -m … -- <paths>`), never `git add -A`, `git add .` or `git commit -a`,
and each was verified with `git show --stat HEAD`. Because the rollback's deletions were already
**staged**, a bare `git commit` would have swept them in — the pathspec form is what prevented it.

`docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were **not written**; they
remain the orchestrator's. No branch was pushed and no Pull Request was opened or merged.
