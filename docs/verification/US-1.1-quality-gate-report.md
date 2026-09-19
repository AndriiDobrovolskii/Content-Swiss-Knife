---
artifact: quality_gate_report
story: US-1.1
version: 2
status: APPROVED
owner: so-gate-enforcer
created_at: 2026-09-18T08:45:00Z
updated_at: 2026-09-18T20:00:00Z
supersedes: docs/verification/US-1.1-quality-gate-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: pipeline_status
    version: 2
open_decisions_blocking: false
---

# Quality Gate Report — US-1.1 (track `server`, version 2)

Branch `feat/US-1.1-proxy-cors-allowlist`. Commits under gate: `dc29f40`, `540a676`, `68dea71`,
`7b117e2`, `f981732` — **five**, one more than version 1 carried.

Every command below was executed **in this pass**, in this order, on this working tree. The
output pasted is the real output of this run, trimmed only where explicitly noted, never
paraphrased and never carried over from version 1.

## Why this version exists

Version 1 recorded every input at `version: 1` and was stale from two directions:

1. `RECONCILIATION` returned `story_drift`; the Story was amended and the whole upstream chain
   was re-issued at v2. v1's `inputs_consumed` no longer describes the artifacts this stage is
   answerable to.
2. `so-test-writer` then **added two assertions** to `test/cors-policy.spec.ts` — 35 insertions,
   0 deletions, 24 → 26 tests — committed by `so-builder` at `f981732`. v1's recorded counts
   (2381 passed, 24 in the spec file) are therefore no longer the true state.

This is a full re-execution, not a re-record. All six gate items were re-decided from commands
run in this pass; no table, checksum, coverage figure or build output was lifted from v1.

**No production file changed** between the two runs — `server/cors-policy.js`, `server/index.js`
and `.env.example` are byte-identical at `f981732` and at `7b117e2`. The only delta in the change
set is test code.

**Working tree note.** The tree is not clean: nine `docs/` files are modified and eight are
untracked. Those are this Story's in-flight v2 workflow artifacts and `so-orchestrator` run
state. This stage touched none of them, committed nothing, stashed nothing, reverted nothing.
See §7.

## Gate summary

| # | Command | Exit | Verdict |
|---|---|---|---|
| 1 | `npm run lint` | 0 | PASS |
| 2 | `npm test` | 0 | PASS |
| 3 | `npm run test:coverage` | 0 | PASS |
| 4 | `npm run build` | 0 | PASS |
| 5 | `bash arch-guard.sh` | 0 | PASS |
| 6 | `npm run validate:harness` | — | **NOT RUN — not applicable**, decided in §6 |

**Gate verdict: PASS.** Five applicable commands, all green, all with recorded output from this
pass.

---

## 1. `npm run lint` — PASS

`npm run lint` is `tsc --noEmit`. It is a type-check, not a linter; this repository has no
ESLint.

```
$ npm run lint

> 02-05-2026-seo-content-generator@0.0.0 lint
> tsc --noEmit

EXIT=0
```

Zero errors, zero diagnostics, no output beyond the npm banner.

---

## 2. `npm test` — PASS

The composite script (`npm run test:logic && npm run test:components`). Both runners were run
through this one command; `test:logic` alone was **not** substituted for it.

Logic runner (`vitest run`), final block verbatim:

```
 Test Files  109 passed (109)
      Tests  2383 passed | 3 skipped (2386)
   Start at  16:46:47
   Duration  20.84s (transform 7.21s, setup 0ms, import 18.92s, tests 6.01s, environment 77.37s)
```

Component runner (`ng test`), final block verbatim (ANSI colour codes stripped):

```
 RUN  v4.1.10 C:/Work/Content-Swiss-Knife

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  16:47:17
   Duration  1.22s (transform 121ms, setup 325ms, import 260ms, tests 151ms, environment 322ms)
```

Exit status of the composite command: `EXIT=0`.

### Counts against the previous gate run — the deletion check

| Runner | Gate v1 | **This run** | Delta | Reads as |
|---|---|---|---|---|
| `test:logic` files | 109 passed (109) | **109 passed (109)** | 0 | no spec file gained or lost |
| `test:logic` passed | 2381 | **2383** | **+2** | exactly the two added assertions |
| `test:logic` skipped | 3 | **3** | **0** | **no test was skipped to go green** |
| `test:logic` total | 2384 | **2386** | +2 | +2 passed, +0 skipped |
| `test:components` | 1 file, 4 passed | **1 file, 4 passed** | 0 | unchanged |

The `+2` is fully accounted for: `f981732` is a **35-insertion / 0-deletion** diff to
`test/cors-policy.spec.ts` and nothing else in the test tree (§6 stat). **The skip count did not
move** — 3 before, 3 after. A test quietly converted to `.skip` to dodge a failure would show as
passed↓/skipped↑; that did not happen.

The 3 skipped are the pre-existing opt-in live probe in `test/doc-generation-live.spec.ts`
(`LIVE_DOC_TEST=1`), unrelated to this Story and skipped at baseline as well. Its stderr notice
prints on every run and is not a failure — verbatim from this run:

```
stderr | test/doc-generation-live.spec.ts > live doc probe — status > reports whether the model-side of the pipeline has been exercised

[live] SKIPPED — the model half of the Doc pipeline is UNVERIFIED.
  Run: npm run dev, then LIVE_DOC_TEST=1 npx vitest run test/doc-generation-live.spec.ts
  Until this passes, switching production to renderDescription() rests on an untested assumption.

 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > reaches the proxy and returns JSON
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > validates against ProductDescriptionDocSchema
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > renders, and the rendered HTML has zero validator errors
```

Those are the three `↓` lines — all in the one pre-existing file, none in this Story's spec.

### The Story's own spec file — all 26, by name

Run additionally so the 26 tests `ac_test_matrix` v2 names are visible individually rather than
folded into a total. Blank lines stripped by the pipe; nothing else trimmed.

```
$ npx vitest run test/cors-policy.spec.ts

 RUN  v4.1.10 C:/Work/Content-Swiss-Knife
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-4: defaults to http://localhost:3000 alone when ALLOWED_ORIGINS is unset 10ms
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-4: falls back to that same single default for an empty or entry-less value 3ms
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-4: never returns a value the cors package would read as "allow every origin" 4ms
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-1: splits a comma-separated value and ignores whitespace around each entry 2ms
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-1: discards empty entries instead of admitting an empty origin 2ms
 ✓ test/cors-policy.spec.ts > resolveAllowedOrigins — the allow-list comes from configuration > AC-1: a configured trailing slash still matches the origin a browser actually sends 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-1: allows an origin that appears in the list 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-2: refuses an origin that does not appear in the list, by omission 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-2: refusal never produces an error, which would abort the request instead of omitting the header 3ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-3: allows a request that carries no Origin header at all 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-2: an Origin header that is present but empty is not in the list, so it is refused 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-2: matching is exact — a different port, scheme, case or host is a different origin 2ms
 ✓ test/cors-policy.spec.ts > corsOriginPolicy — the decision the cors package asks for > AC-1: an allow-list with several entries admits each of them 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-1: a listed origin receives Access-Control-Allow-Origin echoing that exact origin 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-2: an unlisted origin receives no Access-Control-Allow-Origin header 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-2: an unlisted origin is not rejected — the request is processed, the browser blocks the response 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-3: a request with no Origin header is handed on untouched, so /health still answers 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-4: with ALLOWED_ORIGINS unset, localhost:3000 is admitted and every other origin is not 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-4: an empty ALLOWED_ORIGINS does not reopen the wildcard 7ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-1: a preflight from a listed origin is answered with that origin echoed back 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-2: a preflight from an unlisted origin receives no Access-Control-Allow-Origin header either 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-2: an unlisted origin preflight is handed on, never answered by the middleware 2ms
 ✓ test/cors-policy.spec.ts > the composed policy, through the real cors middleware > does not enable credentialed CORS 2ms
 ✓ test/cors-policy.spec.ts > .env.example documents ALLOWED_ORIGINS > AC-5: names the variable and explains the comma-separated format 1ms
 ✓ test/cors-policy.spec.ts > .env.example documents ALLOWED_ORIGINS > AC-5: carries a placeholder only — no real deployed URL enters the repository 1ms
 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  16:47:27
   Duration  622ms (transform 60ms, setup 0ms, import 63ms, tests 69ms, environment 330ms)
PIPESTATUS=0
```

26 of 26, matching the 26 rows in `ac_test_matrix` v2 exactly. The **two tests new at v2** are
both present and green, at positions 22 and 23 in the composed-middleware block:

- `FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on`
- `AC-2: an unlisted origin preflight is handed on, never answered by the middleware`

All 24 tests recorded at v1 are still present, under the **same names**, in the **same `describe`
blocks**. Nothing was renamed, skipped or `.only`-ed — an `.only` would have collapsed the file
to a single test, and the count is 26.

---

## 3. `npm run test:coverage` — PASS

`vitest run --coverage`, exit `EXIT=0`. Vitest fails the run itself when any threshold in
`vitest.config.ts` is unmet, so a zero exit is the threshold verdict; the numbers are also
checked by hand against every floor below.

Report tail from this run, verbatim (the `utils` per-file rows are collapsed to the directory
total for length — `utils` has no per-directory floor; every row that bears on a floor is
reproduced in full):

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   91.83 |    85.75 |    93.9 |   92.45 |
 domain            |     100 |    95.83 |     100 |     100 |
  ...doc.schema.ts |     100 |    94.44 |     100 |     100 | 146
 prompt-core       |   98.38 |    89.72 |     100 |    99.5 |
  constants.ts     |    99.1 |    93.44 |     100 |   98.94 | 262
  model-catalog.ts |    91.3 |    78.57 |     100 |     100 | 66-67,76
  ...-name-core.ts |     100 |       96 |     100 |     100 | 132
  slug-utils.ts    |   98.36 |    79.41 |     100 |     100 | ...50-151,158-159
 render            |   99.34 |    92.94 |     100 |     100 |
  ...ema-issues.ts |   96.87 |    86.48 |     100 |     100 | 59,118-122,170
  ...escription.ts |     100 |    96.87 |     100 |     100 | 201
 utils             |   90.61 |    84.95 |    92.2 |   91.21 |
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 91.83% ( 2937/3198 )
Branches     : 85.75% ( 1746/2036 )
Functions    : 93.9% ( 616/656 )
Lines        : 92.45% ( 2498/2702 )
================================================================================
```

### Every floor in `vitest.config.ts`, re-read this run and checked

The floors below were read from `vitest.config.ts:75-83` in this pass, not copied from version 1.

| Scope | Floor (lines / funcs / branches / stmts) | Measured | Holds |
|---|---|---|---|
| global | 80 / 80 / 75 / 80 | 92.45 / 93.9 / 85.75 / 91.83 | yes |
| `src/domain/**` | 95 / 95 / 90 / 95 | 100 / 100 / 95.83 / 100 | yes |
| `src/render/**` | 95 / 95 / 90 / 95 | 100 / 100 / 92.94 / 99.34 | yes |
| `src/prompt-core/**` | 95 / 95 / 85 / 95 | 99.5 / 100 / 89.72 / 98.38 | yes |

The figures are identical to those recorded at gate v1. That is the expected result and is itself
a check that passed, not a copy: the only change since v1 is test code in `test/`, and `server/`
is outside `coverage.include` either way, so a **moved** number would have needed explaining.

No threshold was lowered, no `include` narrowed, no `exclude` added. `vitest.config.ts` appears in
**none** of the five commits under gate (§6 stat lists every path touched), so AGENTS.md §7.7 is
not engaged.

**Scope note, not an excuse.** `coverage.include` is `src/utils`, `src/prompt-core`, `src/render`,
`src/domain` (`vitest.config.ts:55-60`). This Story's production code is `server/cors-policy.js`
and `server/index.js`, both outside that scope. The coverage numbers are therefore **not evidence
about the new module** and this report does not present them as such. The evidence for the new
module is the 26 tests in §2.

---

## 4. `npm run build` — PASS

`ng build`, exit `EXIT=0`. ANSI colour codes stripped; nothing else altered.

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

❯ Building...
✔ Building...
Initial chunk files  | Names                 | Raw size  | Estimated transfer size
main-7X4HFRQS.js     | main                  | 963.63 kB |              242.76 kB
chunk-YWHTIYQ6.js    | -                     | 171.89 kB |               51.45 kB
styles-KY2DT4WL.css  | styles                |   3.29 kB |              835 bytes
                     | Initial total         |   1.14 MB |              295.04 kB

Lazy chunk files     | Names                 | Raw size  | Estimated transfer size
chunk-7EHUHIPJ.js    | html-editor-component |   1.07 MB |              282.81 kB

Application bundle generation complete. [7.068 seconds] - 2026-09-18T13:48:15.439Z

▲ [WARNING] Module 'file-saver' used by 'src/app/app.component.ts' is not ESM

  CommonJS or AMD dependencies can cause optimization bailouts.
  For more information see: https://angular.dev/tools/cli/build#configuring-commonjs-dependencies

▲ [WARNING] Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM

  CommonJS or AMD dependencies can cause optimization bailouts.
  For more information see: https://angular.dev/tools/cli/build#configuring-commonjs-dependencies

▲ [WARNING] Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM

  CommonJS or AMD dependencies can cause optimization bailouts.
  For more information see: https://angular.dev/tools/cli/build#configuring-commonjs-dependencies

Output location: C:\Work\Content-Swiss-Knife\dist
```

Three warnings — exactly the three known pre-existing CommonJS-interop warnings for `file-saver`,
`js-beautify` and `jszip`, which the skill names as not failures. None of those three files is in
the change set. **Zero errors.** Bundle sizes are byte-identical to gate v1, as expected: this
Story changes no frontend source at all, and the only delta since v1 is test code, which `ng build`
does not compile.

---

## 5. `bash arch-guard.sh` — PASS (exit 0)

ANSI colour codes stripped; nothing else altered.

```
╔══════════════════════════════════════════════════════╗
║   Content Swiss Knife — Architecture Guard v1.0     ║
╚══════════════════════════════════════════════════════╝

[Rule #1] Checking for direct SDK calls outside providers/...
  ✓ OK

[Rule #3] Checking for hard-coded LLM prompts in services (not orchestrator)...
  ✓ OK

[Rule #4] Checking for API keys in frontend source...
  ✓ OK

[FROZEN] Checking frozen prompt files for unauthorized changes...
  ✓ All frozen files unchanged

══════════════════════════════════════════════════════
  ✅  ALL CHECKS PASSED
══════════════════════════════════════════════════════

EXIT=0
```

**arch-guard came back green**, so this repository's known stale-baseline history is not engaged
and no `git diff --stat` reconciliation is needed: there is no named path to reconcile. Nothing
was regenerated, re-baselined or edited.

### The five frozen checksums

`arch-guard.sh` prints only the aggregate line `✓ All frozen files unchanged`; it does not emit
per-file checksums. Rather than synthesise five lines it never printed, the baseline file and the
live checksums were read directly in this pass (read-only; nothing written, `--rebaseline`
**not** run):

```
$ cat .arch-guard-checksums
e48b44bd8da7cd21d8969ee3564752a07539d720436aeaf2f219746373d623b7  src/prompts/task-a.ts
cee44396e5961d0c94afee50769e1c1c4cd5c928b65c68e934b69d0a27e998d7  src/prompts/task-b.ts
0995b746f5f557704d96d456a1929771cea75d23f8db3316bdcbad10f0a9915e  src/prompts/task-c.ts
ae868de57035cb0ee1911aeb0e352045eb637644f03ad8c1c828aa3ed65253d3  src/prompt-core/master-system-prompt.ts
06f4dae9ded7cb78aa457a9a9d2158f50f46b2ed9b1bded88a345c476a985443  src/utils/output-validator.ts

$ sha256sum src/prompts/task-a.ts src/prompts/task-b.ts src/prompts/task-c.ts src/prompt-core/master-system-prompt.ts src/utils/output-validator.ts
e48b44bd8da7cd21d8969ee3564752a07539d720436aeaf2f219746373d623b7 *src/prompts/task-a.ts
cee44396e5961d0c94afee50769e1c1c4cd5c928b65c68e934b69d0a27e998d7 *src/prompts/task-b.ts
0995b746f5f557704d96d456a1929771cea75d23f8db3316bdcbad10f0a9915e *src/prompts/task-c.ts
ae868de57035cb0ee1911aeb0e352045eb637644f03ad8c1c828aa3ed65253d3 *src/prompt-core/master-system-prompt.ts
06f4dae9ded7cb78aa457a9a9d2158f50f46b2ed9b1bded88a345c476a985443 *src/utils/output-validator.ts
```

All five match byte for byte, baseline against live. They are also identical to the five recorded
at gate v1 — consistent with the change set, which touches no `src/prompts/`, no
`src/prompt-core/` and no `src/utils/` path (§6). **No FROZEN file changed**, so the AGENTS.md §9
approval question does not arise for this Story. `.arch-guard-checksums` is itself unmodified in
the working tree (`git status --porcelain .arch-guard-checksums` returned empty).

### What a green arch-guard does **not** prove

- **Architecture Rule 2 — retrieval separate from generation — is not checked by this script at
  all.** It checks Rule 1, Rule 3, Rule 4 and the five FROZEN checksums. A green arch-guard is
  **not** evidence that Rule 2 holds. That is `so-implementation-verifier`'s, by reading the diff.
- arch-guard does not run the tests, the type-check or the build. It is one of six commands, not
  the gate.

---

## 6. `npm run validate:harness` — NOT RUN, not applicable

**The decision, and why.** The skill's rule is: run it **only when `docs/workflow/` or a `so-*`
skill was touched**. I decided **not applicable**, from the change set of the five commits under
gate — verified from the stat below, not assumed.

```
$ git show --stat --oneline dc29f40 540a676 68dea71 7b117e2 f981732
dc29f40 feat(US-1.1): T1 — pure CORS allow-list policy module
 docs/catalog/US-1.1-pipeline-status.md | 105 +++++++++++++++++++++++++++++++++
 server/cors-policy.js                  |  70 ++++++++++++++++++++++
 2 files changed, 175 insertions(+)
540a676 feat(US-1.1): T2 — wire the CORS allow-list into the proxy
 docs/catalog/US-1.1-pipeline-status.md | 47 ++++++++++++++++++++++++++++++++--
 server/index.js                        |  3 ++-
 2 files changed, 47 insertions(+), 3 deletions(-)
68dea71 feat(US-1.1): T3 — document ALLOWED_ORIGINS in .env.example
 .env.example                           |  9 ++++++
 docs/catalog/US-1.1-pipeline-status.md | 53 ++++++++++++++++++++++++++++++++--
 2 files changed, 60 insertions(+), 2 deletions(-)
7b117e2 test(US-1.1): commit the CORS spec, handed over untracked
 docs/catalog/US-1.1-pipeline-status.md |  30 ++-
 test/cors-policy.spec.ts               | 424 +++++++++++++++++++++++++++++++++
 2 files changed, 450 insertions(+), 4 deletions(-)
f981732 test(US-1.1): commit so-test-writer's two preflight assertions
 docs/catalog/US-1.1-pipeline-status.md | 269 ++++++++++++++++-----------------
 test/cors-policy.spec.ts               |  35 +++++
 2 files changed, 169 insertions(+), 135 deletions(-)
```

(Blank separator lines between commits removed by the pipe; nothing else trimmed.)

The complete set of paths touched by those five commits, de-duplicated:

```
$ git show --pretty=format: --name-only dc29f40 540a676 68dea71 7b117e2 f981732 | sort -u
.env.example
docs/catalog/US-1.1-pipeline-status.md
server/cors-policy.js
server/index.js
test/cors-policy.spec.ts

$ git show --pretty=format: --name-only <the five> | grep -E "docs/workflow/|\.claude/skills/so-"
NONE
```

**Five paths, and not one of them is under `docs/workflow/` or `.claude/skills/so-*`.** The
condition is not met, so the command was **not** run and is **not** reported as passing.

`docs/workflow/history.jsonl` and `docs/workflow/workflow-state.yaml` are modified in the working
tree, but they are `so-orchestrator`'s uncommitted run state **for this very pipeline** — not
harness definitions (`stage-map.yaml`, `artifact-paths.yaml`, `artifact-lifecycle.md`, the skill
files), and in no commit under gate. They do not make the harness "touched" by this Story.
Running the command anyway would return a verdict about another stage's in-flight state file,
which is not this gate's business.

This is the same decision gate v1 reached, on the same rule, and the rule's inputs have not
changed: the one commit added since v1 (`f981732`) touches `test/cors-policy.spec.ts` and
`docs/catalog/`, neither of which is a harness path. Re-deciding it the other way with no change
in the inputs would be inconsistency for its own sake.

---

## 7. The gate changed nothing it does not own

`git status --short` taken after the last gate command is **byte-identical** to the status taken
before the first:

```
$ git status --short
 M docs/decisions/US-1.1-open-decisions.md
 M docs/evidence/US-1.1-clarification-report.md
 M docs/impact-analysis/US-1.1-impact-analysis.md
 M docs/plans/US-1.1-implementation-plan.md
 M docs/plans/US-1.1-task-breakdown.md
 M docs/reviews/plans/US-1.1-plan-review.md
 M docs/reviews/specifications/US-1.1-spec-review.md
 M docs/specifications/US-1.1-spec.md
 M docs/stories/US-1.1-proxy-cors-allowlist.md
 M docs/workflow/history.jsonl
 M docs/workflow/workflow-state.yaml
?? docs/reconciliation/US-1.1-reconciliation-report.md
?? docs/reviews/security/US-1.1-security-review.md
?? docs/tests/US-1.1-ac-test-matrix.md
?? docs/tests/US-1.1-test-generation-report.md
?? docs/tests/US-1.1-test-strategy.md
?? docs/verification/US-1.1-implementation-report.md
?? docs/verification/US-1.1-quality-gate-report.md
?? docs/verification/US-1.1-verification-report.md
```

**Note the difference from gate v1's §7:** there, the two artifacts this stage owns appeared as
two *new* `??` entries at the end. Here they are **already** in the opening status, because their
version-1 files exist untracked from the previous run. This stage overwrites them in place, so a
correct run ends with the status **unchanged**, not with two additions. Nineteen entries before,
nineteen after, same paths.

The seventeen entries this stage does not own — `so-orchestrator`'s workflow state, and the
Story's v2 artifacts belonging to `so-story-writer`, `so-clarifier`, `so-spec-writer`,
`so-spec-reviewer`, `so-impact-analyzer`, `so-planner`, `so-implementation-planner`,
`so-plan-reviewer`, `so-test-writer`, `so-implementation-verifier`, `so-security-reviewer` and
`so-reconciliation-reviewer` — were left exactly as found. Nothing was committed, stashed or
reverted.

`ng build` wrote `dist/`, which is gitignored and so does not appear. `.arch-guard-checksums` is
unmodified.

No code, test, fixture or config file was edited by this stage. No `--rebaseline`, no
`--no-verify`, no `SKIP=`, no narrowed `tsc`, no `git push`, no Pull Request.

---

## What this green gate does not cover

Stated explicitly so a PASS here is not mistaken for full compliance:

1. **Architecture Rule 2** (retrieval separate from generation) — not checked by arch-guard, nor
   by any other command in this gate. `so-implementation-verifier`'s.
2. **AGENTS.md §6.6 runtime rules** — not this skill's job and not checked here at all.
   `so-implementation-verifier` owns them.
3. **The `server/index.js` wiring line** (line 34 after the added import) — has no automated test,
   by plan decision D1: `app.listen()` at module scope makes the file unimportable, and
   `supertest` was rejected as an AGENTS.md §7.8 dependency proposal. Implementation plan v2
   Risk 1, `plan_review` finding 1 and the security review's Finding 1 all name this line as the
   Story's untested surface. `so-builder` recorded a manual boot-and-curl smoke check in
   `pipeline_status` **v1**; that evidence belongs to the v1 pass, this stage did **not** re-run
   it, and this report does not vouch for it. Diff review is its real coverage.
4. **AC-3's literal `200`** — the two AC-3 tests assert the policy's decision and that the
   middleware hands the request on untouched, not an HTTP status code, for the same root cause.
   Recorded by `so-test-writer` as NBF-1; still a limitation after a green gate.
5. **NBF-D9-LEG**, carried forward from `pipeline_status` v2 and not adjudicated here. D9's
   approved wording asks for `statusCode === 204` on an **unlisted** origin's preflight; the
   `cors` package cannot produce that (a refusal calls `next()` and never reaches the code that
   reads `optionsSuccessStatus`). The assertions were delivered on the **listed** leg plus a
   separate "unlisted is handed on" assertion — which is what the two new tests in §2 do, and both
   are green. Three APPROVED artifacts (`implementation_plan`, `task_breakdown`, `plan_review`)
   still carry the incorrect leg attribution in their prose. That is a documentation
   inconsistency in artifacts this stage does not own and cannot edit; it is recorded so it
   survives this stage boundary. **It blocks nothing** — no test asserts the incorrect wording,
   and the delivered behaviour is correct.
