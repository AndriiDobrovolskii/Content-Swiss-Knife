---
artifact: pipeline_status
story: US-2.1
version: 4
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-20T22:10:00Z
updated_at: 2026-09-22T12:40:00Z
supersedes: docs/catalog/US-2.1-pipeline-status.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 1
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
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-2.1: Migrate product descriptions to the v4.0 UA content schema

**Verdict at v4: `BLOCKED`.** IMPLEMENTATION attempt 2 of 3. Every item the human's 2026-09-22
decision authorised was **executed and committed** — this is not a repeat of v3's "no code written"
stop. It is `BLOCKED` for **one new finding, B2**: a *second* clause in the same FROZEN file states
the same reversed opening form that B1 was about, and it is outside the §9 grant just answered.
Under the dispatch's own instruction — *"If you find another clause needing change, STOP and raise
it as a further request rather than folding it in"* — it was not edited. §6 is the request.

This revision supersedes v3, whose `BLOCKED` verdict and `B1-APPROVAL` request were answered.

**Three commits landed, all with explicit pathspecs:**

| Commit | What |
|---|---|
| `270caa7` | B1 — `master-system-prompt.ts:217` under the new §9 grant, + FR-14 `HOOK_PATTERNS` realignment, + `.arch-guard-checksums` rebaseline in the same commit |
| `7c32265` | N2/O4 — five of seven `fixNumberFormatting` call sites now pass the locale |
| `50ead2a` | NB-2 — the FR-1 invariant-start rejection rule, **implemented**, not taken as a residual |

`git diff --stat 5ee05c7..HEAD -- src/ test/` touches **five source files and zero test files**.

---

## 1. Per-item disposition

| Item | Disposition | Where |
|---|---|---|
| **B1** — `:217` invariant start | **DONE**, under the new grant. Rebaseline rode the same commit. | `270caa7` |
| **FR-14** — `HOOK_PATTERNS` | **DONE**. All five realigned; none now instructs away from the start. | `270caa7` |
| **N2/O4** — seven call sites | **5 of 7 DONE. 2 reported, not forced.** See §3 — per site, with evidence. | `7c32265` |
| **NB-2** — hook-start validation | **IMPLEMENTED.** The approver's fallback was available and was **not** taken; the precondition discharged cleanly and coverage held. See §4. | `50ead2a` |
| **§7.8 / PR_PREPARATION** | Confirmed. The US-1.1 rollback is untouched; see §7. | — |
| **B2** — `:146-148`, NEW | **NOT DONE — outside the grant.** §6 is the request. | — |

---

## 2. B1 and FR-14 — what actually changed

**H1, the frozen line.** `:217` read `Open with: "[Product] is a [Category] designed for
[use-case], featuring [key specs]."`. It now states v4 §1's «Незмінний старт» in the exact words the
approver reviewed in v3 §5 — verbatim, including `featuring [key specs]`, so no content element was
quietly dropped inside a frozen file. The em dash in the quoted shape is **U+2014**, verified by
codepoint rather than by eye.

**The four things v3 promised the reviewer would not have to check, re-verified on this pass:**
`occurrences('40–75')` is still `0` and `occurrences('40–85')` is `3` (`>= 2` required) — the NI-1
assertions are untouched. `contentStructureClause(n)` slices on `^\d+\. ` at line start; every added
line is indented, so the clause parser is unaffected. No assertion anywhere in the suite references
`Open with`, `[Category]`, `designed for` or `featuring [key specs]`. The sweep was widened per
review to **every** file reading `MASTER_SYSTEM_PROMPT` — `constants.spec.ts`,
`master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`, `task-a.spec.ts`,
`optimizer.spec.ts` — checking for occurrence-counting or purity assertions the **new** text could
trip. None does.

**The rebaseline is scoped, and this is shown rather than asserted.** `bash arch-guard.sh
--rebaseline` rewrites every entry, and this repository's baseline has a history of lagging
legitimate commits. `git diff -- .arch-guard-checksums` is **one line changed**:
`master-system-prompt.ts` only. `task-a.ts`, `task-b.ts`, `task-c.ts` and `output-validator.ts` are
byte-identical. No unrelated drift was laundered through a blanket rebaseline under a one-file grant.

**H2, `HOOK_PATTERNS`.** All five instructions are rewritten as rules about the clause **after** the
invariant start; the start itself is *referred to* («exactly as [CONTENT STRUCTURE] defines it»)
rather than restated. That is deliberate and is the module's own doctrine at `:44-46` — restating a
tag or a dash here would create the two-authorities problem the file was written against, and would
have contradicted the argument H1 rests on. `selectHookPattern`, the pattern count (5) and every
`id` are unchanged, so `hook-pattern.spec.ts` — which pins a count floor, reachability,
distribution, the AC-9 window and a source-purity scan, and pins no instruction text — is green by
construction and was confirmed green by running it.

---

## 3. N2/O4 — five sites done, two reported per site

The approver's principle was *"the code must not carry a non-functional signature."* Five sites make
it functional. Two are left locale-blind, and the dispatch's instruction for that case was explicit:
*say so per site and leave it* rather than ship a plausible-looking wrong argument.

| # | Site | Locale passed | Disposition |
|---|---|---|---|
| 1 | `content-orchestrator.service.ts:370` | `'uk-UA'` | **DONE** |
| 2 | `content-orchestrator.service.ts:1103` | `locale` | **DONE** |
| 3 | `content-orchestrator.service.ts:1195` | `isoCode` | **DONE** |
| 4 | `content-orchestrator.service.ts:1511` | `UA_ISO` | **DONE** |
| 5 | `utils/seo-number-format.ts:60` | `item.language` | **DONE** |
| 6 | `render/doc-prose-transforms.ts:156` | `locale` — **in scope** | **NOT DONE — reddens a test** |
| 7 | `render/consumables-prose-transforms.ts:97` | `locale` — **in scope** | **NOT DONE — reddens a test** |

**Sites 6 and 7 are not missing a locale.** `locale` is a parameter of the enclosing function and is
already passed to the four transforms beside `fixNumberFormatting` on the same line. The omission is
a *behaviour* decision, not an absent value, and it is the case the dispatch told me to check for.

Passing it turns **three green tests red**, measured, not predicted:

```
× src/render/doc-prose-transforms.spec.ts > strips a thousands separator and localizes the decimal for uk-UA
    AssertionError: expected 'Швидкість 20 000 мм/хв за 1,75 мм.' not to contain '20 000'
× src/render/doc-prose-transforms.spec.ts > applies to every text field, not just the hook
    AssertionError: expected 'Швидкість 20 000 мм/хв.' not to contain '20 000'
× src/render/consumables-prose-transforms.spec.ts > applies to every text field, not just the hook
    AssertionError: expected 'Швидкість друку 20 000 мм/хв.' not to contain '20 000'
```

**The conflict is real and substantive, not a fixture detail.** `processTextNode` with no locale
strips *every* thousands separator; with a group-1 or group-2 locale it strips *none*. FR-16 makes
`uk-UA` a **group-2** locale whose grouping must be preserved — `number-format-fixer.ts:56-61` says
so in the file's own words. These three assertions require the opposite. Both cannot be true.

**Whose tests they are decides what happens next, so it was checked.** Neither file was touched by
this Story: `doc-prose-transforms.spec.ts` was last modified at `021f467`, and
`consumables-prose-transforms.spec.ts` at `2747ad8`, both **before** TEST_WRITING's `0622de6`.
`git log 0622de6~1..HEAD --` on both files is empty. They are **pre-existing tests encoding the
legacy locale-blind behaviour**, not US-2.1's tests. AGENTS.md §7.7 forbids weakening them, and
`so-builder` does not own them either way. This is reported as finding **N9** for the orchestrator to
route; it is **not** returned as `changes_required_tests`, because this is a requirement conflict for
a human or `so-planner` to settle, not a test TEST_WRITING merely forgot to write.

**One consequence stated rather than hidden.** `doc-prose-transforms.ts`'s header says its chain
order is copied from the orchestrator's HTML chain *"so the two pipelines cannot diverge while both
exist."* Site 1 (HTML master, uk-UA) is now locale-aware while site 6 (Doc path, same artifact) is
not, so for a uk-UA master description the two pipelines **now group thousands differently**. That
divergence is a direct consequence of the conflict above, not an independent choice, and it is
carried as finding **N10**.

**A stale comment was corrected in the same hunk**, and it is named because it looks like a
drive-by and is not. `:371` justified the transform order with *"fixNumberFormatting … has already
stripped thousands separators."* Once a locale is passed that sentence is **false**, and leaving a
false justification next to the line that falsified it is worse than the edit. The ordering still
holds for a real reason, now stated: `MEASURED_DECIMAL_RE` excludes a 3-digit group itself
(`\d+\.(?!\d{3}(?!\d))`), so `fixDecimalSeparator` never depended on the stripping. This was
verified against `decimal-separator.ts:104-110` before the comment was rewritten — the suspected
corruption path (`"20.000 мм"` → `"20,000 мм"` in uk-UA) **does not exist**, because that regex
guards it independently.

---

## 4. NB-2 — implemented, and why the fallback was declined

The approver granted an explicit fallback: *"if it is technically unsound at this stage, leave the
validation to the prompt and record it as an ACCEPTED RESIDUAL rather than forcing it."* **It was
not needed.** Both of the conditions that would have made it unsound were tested and neither holds.

**Precondition 1 — the sweep, run BEFORE the rule was written, exactly as v3 required of itself.**
The question was not "do the three hooks in `v4-docs.ts` conform" but "which documents does the
*whole suite* parse as `'4.0'`". Answer, from a repository-wide sweep of `schemaVersion` in `src/`
and `test/`: **only `test/fixtures/v4-docs.ts` produces one**, through `asSchemaVersion4()` (`:219`)
and `bumpVersion()` (`:413`). Both spread over a base document, and the only three hooks reachable —
`v3BaseDoc`, `v4ConformanceDoc`, `v4LongHookDoc` — all open with the invariant start on a **U+2014**
em dash, confirmed by codepoint. No other `'4.0'` literal in the suite constructs a document;
`test/doc-generation-live.spec.ts` is the only consumer that could parse model output and is skipped
without `LIVE_DOC_TEST`. **The full suite run after the change confirms the sweep: 2812 passed, 0
failed, identical to baseline.** No test was edited and the rule was not weakened to pass a fixture.

**Precondition 2 — coverage, which was the real risk.** `vitest.config.ts` floors `src/domain/**` at
95/95/90/95, and the new `addIssue` branch is **unreachable by the suite** (that is what the sweep
just proved), so it adds uncovered lines to a floored directory — and `so-builder` may not write the
test that would reach it. Measured before and after rather than assumed:

| `src/domain` | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| Floor | 95 | 90 | 95 | 95 |
| Before (`5ee05c7`) | 100 | 95.45 | 100 | 100 |
| **After** | **98.95** | **93.47** | **100** | **98.8** |

All four clear the floor with 3.4–4.0 points of headroom, and `npm run test:coverage` exits **0**.
No threshold was lowered and no coverage `include` was narrowed. The fallback's trigger condition is
therefore not met, so taking it would have been a choice, not a finding.

**A third worry was checked and dismissed on evidence.** `path: ['hook']` was used per this file's
own rule about root-path issues degrading into full regeneration — but `'doc-schema'` has **no entry
in `REPAIR_STRATEGIES`**, so `resolveLadder` returns `['full-regen']` for *every* schema issue,
including the five FR rules already in this refinement. The new rule is therefore **no costlier than
its neighbours**, and the FR-30 budget argument that would have favoured the residual does not apply.
The path still names the field in the repair prompt's detail line, which is why it is spelled out.

**Because no test can reach it, the rule was verified directly** — the honest substitute for the
coverage `so-builder` is not allowed to create. It accepts all three fixture hooks and a hook that
bolds a spec *later* in the sentence (the lazy `.*?` makes the **first** `</b>` close the name), and
rejects the reversed copula form, a missing `<b>`, a U+2013 en dash and a missing space before the
dash. That verification is recorded here because it is evidence, not a substitute for a test:
**AC-1's opening form still has no assertion in the suite** — see finding **NB-1**, unchanged.

**One judgment is named rather than buried.** The rule requires `<b>`, not `<strong>`. `Prose` admits
both and `[FORMAT]` tells the model to use `<strong>` for brands and model names, so
`<strong>Name</strong> — …` is a plausible generation that this rule **rejects**. FR-1, AC-1 and v4
§1's own five patterns all name `<b>` specifically, so the rule follows the requirement rather than
widening it on `so-builder`'s initiative — but a reviewer should decide whether that is intended.
Carried as finding **N11**.

---

## 5. Why this is `BLOCKED` — B2, the second reversed clause

While sweeping `MASTER_SYSTEM_PROMPT` for text the *new* `:217` could collide with, a second clause
turned up stating the **same reversed opening form** B1 was about:

```
[STYLE & GEO]
- Open with a featured-snippet fact: the first sentence is a "What is / Best for" statement.
  Substitute every fluff opener ("In the modern world…", "cutting-edge", "perfect choice",
  "game-changer") with the factual formula "[Product] is a [Category] designed for [use-case]".
```

`master-system-prompt.ts:146-148`. **It was not edited.** The grant answers `B1-APPROVAL` and names
line `:217`; `[STYLE & GEO]` is a different block, and borrowing a one-line grant for a second clause
nobody reviewed is precisely the move AGENTS.md §9 exists to stop — and precisely what the dispatch
forbade in advance.

**Why it blocks rather than being filed as a nice-to-have.** `MASTER_SYSTEM_PROMPT` is
`systemBlocks[0]` on every Doc generation and every translation. After `270caa7`, block 0 states the
invariant start in its §1 clause and the copula formula in `[STYLE & GEO]`, **in the same cached
block, about the same sentence.** That is the two-authorities failure this Story has already paid for
once, and it means B1 cannot honestly be reported as closed: the contradiction AC-1 is about is still
shipped on every generation, just from a different line. Reporting `PASS` here would be claiming a
fix that the same file still argues against.

**This is the second instance of NB-3's blind spot, and that is now a measured pattern rather than a
prediction.** v3 recorded that the plan's three-sweep method cannot see *"a clause stating a reversed
rule in prose carrying no numeral, no named construct and no `§n` cross-reference"*, and warned the
same gap could hide another clause. `:146-148` is exactly that shape: no numeral, no construct, no
`§n`. It is in **neither** the plan's §9 request (NI-1..NI-5, tier 2's six lines) **nor** its
*"Explicitly NOT in this request"* table of eight cleared clauses — verified by reading
`implementation_plan:628-700`. It was never swept, never cleared, and never seen.

---

## 6. THE REQUEST — a further AGENTS.md §9 per-file approval (`B2-APPROVAL`)

> **Edit `src/prompt-core/master-system-prompt.ts`, lines 146–148, so `[STYLE & GEO]`'s opening-form
> formula agrees with the §1 invariant start now stated at `:217`.**

**Current text:**

```
- Open with a featured-snippet fact: the first sentence is a "What is / Best for" statement.
  Substitute every fluff opener ("In the modern world…", "cutting-edge", "perfect choice",
  "game-changer") with the factual formula "[Product] is a [Category] designed for [use-case]".
  Keep such wording only when it is a literally verifiable fact from the input.
```

**Proposed replacement** — the dash is **U+2014**, matching `:217` and AC-2:

```
- Open with a featured-snippet fact: the description's FIRST sentence states what the product is
  and what it is best for. Substitute every fluff opener ("In the modern world…",
  "cutting-edge", "perfect choice", "game-changer") with a plain factual statement wherever one
  appears. Keep such wording only when it is a literally verifiable fact from the input.
  For §1's opening sentence ONLY, that factual statement is the INVARIANT START defined in
  [CONTENT STRUCTURE] clause 1 — never a copula formula. Later sections are governed by
  HEADING FORM above and still never open by restating the product name.
```

**THE TWO SCOPES ARE SPLIT DELIBERATELY, and a first draft of this request got it wrong.** The
current clause fuses a *document-level* rule ("the first sentence is a featured-snippet fact",
i.e. §1) with a *global* one ("substitute **every** fluff opener", which applies wherever one
appears, including §3 and §4 section openings). A replacement that simply swaps the copula formula
for the invariant start inherits that fusion and tells the model to open **every** section with a
bolded product name and an em dash. That would collide head-on with two rules a few lines above —
`:137` *"NO `<h3>` EVER CONTAINS THE PRODUCT NAME"* and `:140-143` *"Do not restate the full product
name at the start of each section"* — and would leave block 0 in a worse state than it is today. So
the ban stays global and unformulaic, and the invariant start is scoped to §1 explicitly, with a
closing sentence that defers to `:140-143` rather than silently overriding it.

**Checked so the reviewer does not have to:**

1. **It deletes no rule.** The featured-snippet intent, the fluff-opener ban, the four banned
   phrases and the verifiability proviso all survive. Only the *formula* changes, and it changes to
   a cross-reference rather than a restatement — so `[CONTENT STRUCTURE]` §1 stays the single
   authority and this does not recreate the two-authorities problem from the other side.
2. **No test pins the text being replaced.** Swept across `src/**` and `test/**` for
   `featured-snippet`, `What is / Best for`, `fluff`, `designed for` and all four banned phrases.
   **One hit, and it is not an assertion about this prompt:** `language-consistency.spec.ts:98`
   builds an HTML *input* fixture containing *"The xTool F2 is a compact laser system designed
   for …"*. That file does not import `MASTER_SYSTEM_PROMPT` and asserts nothing about it.
   `occurrences('40–75')`/`('40–85')` are untouched — `:146-148` carries no numeral, which is
   exactly why the numeral sweep missed it. **`B2` therefore carries no `changes_required_tests`
   dependency**, which the approver should know before granting.
3. **`bash arch-guard.sh --rebaseline` must ride in the same commit**, per §9 and the standing
   terms. It will, and the checksum diff will be shown to be one line as it was for B1.
4. **Blast radius is the same as B1's** and needs no separate analysis: the same cached block 0, the
   same Doc path, the same FROZEN `task-c.ts:87` translation path for all nine non-master locales,
   the same `optimizer.ts`. No other file is edited by this request.

**A fourth sweep is recommended with the grant, and is the durable fix.** Two clauses of this exact
shape have now been missed by the same method. Reading the `[STYLE & GEO]`, `[BRAND / NAMING]` and
`[FORMAT]` blocks as *units* — the way `:26-38` and the `[CONTENT STRUCTURE]` clauses were read —
would close NB-3 rather than discovering its next instance at the next reconciliation. **If the
approval is granted without that sweep, a third clause of this shape remains possible**, and this
Story would learn it the same way it learned the first two.

**If the approval is refused**, B1 stays half-closed by construction, and the honest route is back to
ARCHITECTURE_PLANNING to decide how AC-1's invariant start survives a block 0 that contradicts it —
not a narrower builder fix.

---

## 7. Measured state — every number re-run on this pass, after the changes

| Check | Result | vs. baseline |
|---|---|---|
| `npx vitest run` (`test:logic`) | **122 files passed (122)**; **2812 passed \| 3 skipped (2815)**, 0 failed | identical |
| `npm run test:components` (`ng test`) | **1 file, 4 passed (4)**, exit 0 | identical |
| `npm run lint` (`tsc --noEmit`) | **CLEAN — exit 0, no output** | identical |
| `bash arch-guard.sh` (no flag) | **✅ ALL CHECKS PASSED** — Rules 1, 3, 4 and *"All frozen files unchanged"* | restored after the approved edit + rebaseline |
| `npm run test:coverage` | **exit 0**, all thresholds met | see below |

Coverage matters this pass because source was added to a floored directory and call sites changed.
Global: **91.94 % stmts / 85.79 % branch / 94.12 % funcs / 92.54 % lines** (baseline
91.96/85.83/94.12/92.56 — the ~0.02 pt global movement is the new uncovered branch). Per-directory
against floors:

| Directory | Floor (S/B/F/L) | Measured | Verdict |
|---|---|---|---|
| `src/domain/**` | 95/90/95/95 | **98.95 / 93.47 / 100 / 98.8** | pass |
| `src/render/**` | 95/90/95/95 | **99.39 / 91.75 / 100 / 100** | pass, unchanged |
| `src/prompt-core/**` | 95/85/95/95 | **98.12 / 88.96 / 100 / 99.09** | pass, unchanged |

`src/domain` is the only directory that moved, and only from the one deliberately uncovered branch
in §4. `hook-pattern.ts` stays **100 / 50 / 100 / 100** — its branch figure is the pre-existing `??`
fallback in `fnv1a`, untouched by the instruction rewrite.

---

## 8. Task status

All thirteen tasks remain **DONE** at the commits v2 records. This pass added three commits
(`270caa7`, `7c32265`, `50ead2a`) that belong to **no** breakdown task: B1, FR-14's realignment,
N2/O4 and NB-2 are reconciliation and review findings, not tasks that were skipped. `B2` likewise
names no task — it is a clause the plan's §9 enumeration never reached (§5).

---

## 9. Findings

| # | Finding | Disposition |
|---|---|---|
| **B2** | `master-system-prompt.ts:146-148` states the same reversed copula formula B1 was about, in the same cached block 0, outside the grant just answered. | **BLOCKING.** §6 is the `B2-APPROVAL` request. Not edited. |
| **N9** | `doc-prose-transforms.spec.ts` and `consumables-prose-transforms.spec.ts` assert that a uk-UA thousands separator is **stripped**; FR-16 makes uk-UA group-2 and requires it **preserved**. Both files predate this Story. | Requirement conflict for a human or `so-planner`. **Not** `changes_required_tests`. Sites 6 and 7 left locale-blind. |
| **N10** | Consequence of N9: the uk-UA HTML path (site 1) and the uk-UA Doc path (site 6) now group thousands differently, which `doc-prose-transforms.ts`'s header exists to prevent. | Resolves automatically once N9 is settled either way. |
| **N11** | The new hook rule requires `<b>` and rejects `<strong>`, which `Prose` admits and `[FORMAT]` recommends for model names. | Follows FR-1/AC-1 as written. Flagged for a reviewer to confirm the narrowness is intended. |
| **NB-1** | AC-1's opening form has **still** no row in `ac_test_matrix` v2 and no assertion in the suite — now also true of the schema rule in `50ead2a`, whose reject branch no test reaches. | Unchanged from v3. For RECONCILIATION to route now that the implementation exists. `so-builder` may not write it (§7.7). |
| **NB-2** | FR-1's structural rejection path. | **CLOSED — implemented** at `50ead2a`. Not taken as a residual; §4 gives the evidence. |
| **NB-3** | The plan's three-sweep method cannot see a reversed rule in prose with no numeral, construct or `§n`. | **Confirmed by a second instance** (`:146-148`). A fourth sweep is requested alongside B2 in §6. |
| **N1 … N8** | RECONCILIATION's other non-blocking findings. | Out of scope for this loop, untouched, carried forward — **except N2**, which is now 5-of-7 done (§3). |
| **F1 … F6** | v2's six findings. | Unchanged; F2, F3, F4, F6 closed, F1 and F5 standing. |

---

## 10. Working-tree hygiene

The sanctioned **US-1.1 rollback was not touched**, and this required active care rather than
restraint: its deletions were already **staged in the index** when this pass began, so a bare
`git commit` would have swept all 27 entries into a US-2.1 commit. Every one of the three commits
used `git commit -F <file> -- <explicit paths>`, and `git show --stat` was run on each to confirm
what landed: `270caa7` carries exactly three files, `7c32265` exactly two, `50ead2a` exactly one.
`git add -A`, `git add .` and `git commit -a` were **never** run. The five untracked upstream stage
reports are untouched.

`git diff --stat 5ee05c7..HEAD -- src/ test/` lists **five source files and zero test files**. No
test, fixture, `vitest.config.ts` threshold or coverage `include` was modified anywhere on this pass.

`docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were **not written**; they
remain the orchestrator's. No branch was pushed and no Pull Request was opened, updated or merged.
