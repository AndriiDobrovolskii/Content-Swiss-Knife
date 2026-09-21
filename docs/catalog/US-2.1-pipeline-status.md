---
artifact: pipeline_status
story: US-2.1
version: 3
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-20T22:10:00Z
updated_at: 2026-09-22T09:20:00Z
supersedes: docs/catalog/US-2.1-pipeline-status.md#2
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

**Verdict at v3: `BLOCKED`.** This is a RECONCILIATION loop-back, attempt 1 of 3, opened for exactly
one blocking finding — **B1**, AC-1's «Незмінний старт» opening form. **No code was written on this
pass, and the working tree is byte-identical to `5ee05c7` apart from this file.**

This revision supersedes v2, whose `PASS` verdict was spent when RECONCILIATION returned
`CHANGES_REQUIRED` / `changes_required` against the tree v2 described. The thirteen tasks, the suite,
the lint result and the FROZEN trail recorded at v2 all still hold and are re-confirmed below; they
are not restated in full, because nothing about them changed.

**The reason this is `BLOCKED` and not a delivered fix:** B1 cannot be honestly closed without
editing `src/prompt-core/master-system-prompt.ts:217`, which is FROZEN and **outside** the AGENTS.md
§9 per-file approval granted at HUMAN_PLAN_APPROVAL. That approval was granted *for T12, to implement
NI-1..NI-5 and the tier-2 repairs*, and §4 below shows from the approved plan's own text that
`:217` is in neither list. A **new** §9 per-file approval is requested in §5, written so it can be
answered without re-deriving anything.

---

## 1. What B1 is, re-derived rather than inherited

Every point RECONCILIATION made was re-derived against the files on this pass. All of them hold.

| Claim | Re-derived how | Result |
|---|---|---|
| AC-1 requires the hook to start `<b>{product name}</b> —` | `docs/stories/US-2.1-migrate-descriptions-to-v4-schemas.md:47` | confirmed, verbatim |
| FR-1 repeats it and gives it a failure path | `docs/specifications/US-2.1-spec.md:89-97` | confirmed — *"is a structural defect and the generation is rejected by structural validation"* |
| The primary source agrees | `Knowledge/Schemas/product_description_schemas_v4_ua.md:210`, and all five v4 §1 patterns read below | confirmed — **all five** open `<b>[Назва]</b> — [категорія/клас/тип]`; the «Антиконвеєр» rotation varies what follows the em dash, never the start |
| `master-system-prompt.ts:217` states a different form | read at line, and `git diff 0622de6..HEAD` on the file | confirmed — `Open with: "[Product] is a [Category] designed for [use-case], featuring [key specs]."`, a **context line** in the diff, sandwiched between two `+` lines |
| `TASK_A_DOC_INSTRUCTION` does not supply it | `src/prompts/task-a-doc.ts:155` | confirmed — the entire §1 content is `- §1 hook: 40–85 words.` |
| No validator or renderer enforces it | `output-validator.ts` byte-unchanged; `render-description.ts:353` | confirmed — `<p>${prose(doc.hook)}</p>`, nothing inspected |
| Four of five `HOOK_PATTERNS` instruct the model away from it | `src/prompt-core/hook-pattern.ts:48-81` | confirmed — `problem-first` *"only then name the product"*, `spec-anchor` *"Lead with that value, not with the product category"*, `scenario` *"let the product enter the sentence"*, `contrast` and `outcome` opening on a comparison and an outcome |
| That text reaches the model on every Doc generation | `src/prompts/task-a-doc.ts:189-191` | confirmed — appended to `userContent` as `[§1 HOOK PATTERN]` |

The diff hunk is the sharpest single piece of evidence, so it is quoted rather than described:

```diff
-1. WRITE THE HOOK (40–75 words TOTAL, plain <p>, zero attributes):
+1. WRITE THE HOOK (40–85 words TOTAL, plain <p>, zero attributes):
    Open with: "[Product] is a [Category] designed for [use-case], featuring [key specs]."
-   Use-case = a workflow, not a user type. Split the 40–75 words across exactly 2–4
+   Use-case = a workflow, not a user type. Split the 40–85 words across exactly 2–4
```

`:217` is the unchanged middle line. It was **read past, not unreached** — §4 explains why the plan's
three sweeps could not see it.

---

## 2. The approach decision, stated plainly

Two fix paths were on the table. The narrow one was taken seriously and **rejected on the evidence**,
not waved off to justify a stop.

### Path A — unfrozen only: state the invariant start in `task-a-doc.ts`, repair `hook-pattern.ts`

This is the path RECONCILIATION noted *exists* (it prescribed none). It would leave `:217` in place
and override it from `systemBlocks[1]`.

**It does not work, and the two files say so themselves.** The Doc instruction's override authority
is *scoped to serialization*, by both ends of the contract:

- `master-system-prompt.ts:456-458`, `[FORMAT]`:
  > SERIALIZATION IS SET BY THE ACTIVE [TASK] BLOCK. When that block specifies a different
  > output format (for example a JSON document model), its contract wins over this section,
  > **and the rules below then describe only WHAT to express — not how to serialize it.**

- `task-a-doc.ts:44`:
  > **Every [CONTENT STRUCTURE] rule about WHAT each section contains still applies;** only
  > the serialization changes.

The hook's opening form is a **WHAT** rule. An em dash after a bolded name versus a copula
(`is a`) is a difference in what the sentence says, not in how the document is serialized — the
JSON `hook` field admits `<b>` either way. So both files designate the frozen master as the authority
on this rule, and the master currently states the wrong one.

**Restating v4's form in `task-a-doc.ts` would therefore be a contradiction, not a restatement** —
and this repository already names that failure mode in the very file the fix would touch:

> Those belong to the task instruction (`task-a-doc.ts`) and the master prompt, and restating them
> here would give the model **two authorities for the same rule that could later disagree**.
> — `hook-pattern.ts:44-46`

**The asymmetry that settles it.** `task-a-doc.ts` *does* already diverge from the master in several
places — §2's heading is discarded, §9's `cta.heading` is discarded, §6's heading is fixed per locale.
Every one of those is about **who supplies a value**, code or model. Not one of them contradicts what
the master says a section's prose must *say*. There is no precedent in this file for overruling a
WHAT rule, and inventing one here would leave the cached block 0 — read on every generation, on the
Doc path and the translation path alike — positively instructing the model to open the hook the wrong
way. That is the paper-over, not the fix.

**The approved plan reaches the same conclusion, in its own words**, in the §9 request's *"Why the
edit cannot be avoided"* paragraph (`implementation_plan:691-696`):

> `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` on the Doc path and is cached; `TASK_A_DOC_INSTRUCTION`
> explicitly says *"Every [CONTENT STRUCTURE] rule about WHAT each section contains still applies"* …
> Every clause above is exactly such a rule. That sentence is also why the invariant list must be
> complete: it imports **all** of block 0's content rules into the Doc path, so **any one left stating
> a v3 rule contradicts block 1 and the schema at once.**

The plan wrote that to justify granting the approval it got. It applies to `:217` word for word.
(The plan cites that sentence as `task-a-doc.ts:41`; it sits at **`:44`** in the tree today, because
T7 grew the file above it. Same sentence, verified byte-for-byte.)

### Path B — the frozen edit, under a new approval

Taken as the correct path, and **not executed**, because the existing approval does not cover it.
§5 is the request.

### What was deliberately NOT done

- **`:217` was not edited under the old approval.** The grant names its surface; borrowing it for a
  sixth invariant nobody reviewed is the move AGENTS.md §9 exists to stop.
- **No partial commit was landed.** Repairing `hook-pattern.ts` alone would be a checkpoint, not a
  complete change (AGENTS.md §13) — and worse, the patterns' *content* depends on how `:217`
  resolves. If the invariant start lands in the master, the five patterns mirror v4's and vary only
  what follows the em dash. If it does not, they would each have to carry the start themselves — the
  two-authorities problem again, written five times. Writing them now risks writing them twice.
- **No test was written, weakened or touched.** AC-1's opening form still has no assertion anywhere;
  see finding **NB-1**, which is a routing matter for RECONCILIATION, not grounds for a
  `changes_required_tests` loop — there is nothing for TEST_WRITING to assert against until the
  implementation exists.

---

## 3. What the complete fix is, so the approval can be judged against the whole of it

Both halves are required. Neither closes B1 alone.

| Half | File | Frozen? | What changes |
|---|---|---|---|
| **H1** | `src/prompt-core/master-system-prompt.ts:217` | **YES — §5 requests it** | The §1 opening-form sentence is replaced with v4's «Незмінний старт». One line. |
| **H2** | `src/prompt-core/hook-pattern.ts:48-81` | no | `HOOK_PATTERNS` is realigned so **every** pattern preserves the invariant start and varies only what follows the em dash, as v4 §1's own five do. This removes the four positively-shipped instructions that contradict AC-1, and closes FR-14's recorded drift (*"naming which of the v4 §1 patterns to use"*) at the same time. |

H2 is unfrozen and needs no approval — it is held back only because it is half a change.

**H2 keeps `hook-pattern.spec.ts` green by construction, checked before proposing it.** That file
asserts a *count floor* (≥ 4), reachability of every element, the distribution properties, and a
source-purity scan. It pins no `id` and no `instruction` text. Rewriting the five `instruction`
strings and keeping five elements touches none of its assertions, and the selector function is not
changed at all.

### Not folded into the fix — recorded for routing instead

**FR-1's failure path has no mechanism anywhere, frozen or unfrozen.** The spec says a hook that does
not open with the bolded name and em dash *"is rejected by structural validation"*. H1 + H2 make the
model produce the form; neither **rejects** a generation that does not. The plausible home is a
version-guarded `superRefine` on the `'4.0'` branch of `src/domain/description-doc.schema.ts`
(unfrozen, and already carrying this Story's other version-guarded rules). It was **not** taken here,
for two reasons, both of which are the point of the stage boundary:

1. It is an architecture decision. Plan D12's enumerated §1 contract has eleven items and the opening
   form is not among them; adding a twelfth rejection rule decides where structural validation lives,
   which is `so-planner`'s call, not `so-builder`'s.
2. Its precondition is unmet. Every doc that the suite parses as `'4.0'` would have to be swept first.
   The three v4 fixture hooks conform — `test/fixtures/v4-docs.ts:58`, `:297`, `:397` all read
   `<b>…</b> — …` — but that is the fixture module alone, not the whole suite, and a rejection rule
   that reddens a test `so-builder` may not edit is worse than no rule.

Carried as finding **NB-2**.

---

## 4. Why `:217` is outside the existing approval — from the plan's own text

The grant (`history.jsonl`, HUMAN_PLAN_APPROVAL, 2026-09-21) reads:

> AGENTS.md SECTION 9 PER-FILE APPROVAL GRANTED for `src/prompt-core/master-system-prompt.ts`, **for
> T12, to implement NI-1..NI-5 and the tier-2 repairs**

Both lists are enumerated in `implementation_plan` v2's §9 request, and `:217` is in neither.

**NI-1 is the one invariant that touches this clause, and it is a word range only**
(`implementation_plan:632-634`):

> **NI-1 (FR-1).** No clause states a §1 hook word range other than **40–85**.
> *Evidence:* `:27` (section map), `:216` (clause head), `:218` (**inside the `:216` clause** — the
> instance that proves a claimed range was not read to its end).

The evidence cites `:216` and `:218` — the two lines carrying `40–75` — and skips `:217` between them.
NI-2..NI-5 govern §2, §3, §9 and §6 respectively and do not reach §1 at all.

**Tier 2 is a closed table of exactly six lines** (`implementation_plan:662-674`): `:42`, `:103`,
`:153-154`, `:221`, `:270-272`, `:309`. It is not an open-ended "anything that contradicts v4" clause
— its own preamble scopes it to clauses that *"reference a construct the edit removes or renames"*,
and it is introduced *"so the human can see that one approval covers two severities"*. `:217` states
a reversed rule, which is the tier-1 severity, and it is absent from both tiers.

**`:217` is also absent from the plan's *"Explicitly NOT in this request"* table** — the eight clauses
"swept, read, and confirmed to agree with v4". So it was neither requested nor cleared: it fell
through all three sweeps, and it is mechanical why. The numeral sweep matched `40–75`, `90–200`,
`150–2,000`, `80–150` — `:217` carries no numeral. The construct sweep matched `table`, the §6 `<ul>`
and the CTA template — `:217` carries none. The cross-reference sweep matched `§2`, `§3`, `§6` and the
image-placement block — `:217` names no section. A clause stating a *reversed rule in prose with no
numeral, no construct and no cross-reference* is invisible to all three methods. That is the gap, and
it is worth recording because the same gap could hide another clause.

**This is a judgment call and it is named as one:** a reader could argue that "tier-2 repairs" was
meant as a spirit rather than a list, and that a sixth invariant is what the approver would have
granted had the sweep found it. That reading is plausible. It is not taken, because the plan went to
unusual lengths to make the surface *enumerated rather than sampled* — that enumeration was
plan-review finding 1's whole remedy — and treating an enumerated grant as open-ended would undo
exactly the property the human approved.

---

## 5. THE REQUEST — a new AGENTS.md §9 per-file approval

> **Edit `src/prompt-core/master-system-prompt.ts`, line 217 — one line — so that the §1 clause
> states v4's invariant start.**

**Current text** (`:217`, a single line inside the `:216` clause):

```
   Open with: "[Product] is a [Category] designed for [use-case], featuring [key specs]."
```

**Proposed replacement** (the dash in the quoted shape is a literal **U+2014** em dash, matching the
U+2014 already pinned by AC-2's rendered killer-spec form — not U+2013):

```
   Open with the INVARIANT START (v4 §1 «Незмінний старт»), which never varies: the product
   name wrapped in <b>…</b>, then a space, an em dash, a space, and then the product type or
   category, its use-case and its key specs. The shape is exactly
   "<b>[Product]</b> — [Category] for [use-case], featuring [key specs]."
   The §1 patterns vary what follows the em dash; none of them varies the start.
```

**This deletes no content element — it repairs the opening form only.** The current `:217` carries
three things: the opening form, that the hook names the category and use-case, and that it names the
key specs. The replacement keeps all three and changes only the first. That is deliberate: a
one-line opening-form repair is what is being asked for, and quietly dropping `featuring [key specs]`
inside a frozen file would turn it into an unannounced content deletion. (`:220-222` separately
governs *how* numbers may appear in the hook, and FR-2's "2–4 technical values" is declared
unenforced prose by the Specification, so the key-specs element could arguably go — but not on this
approval, and not without saying so.)

**Four things the reviewer should not have to check, checked here:**

1. **`<b>` does not breach the same clause's "plain `<p>`, zero attributes."** That phrase governs
   *attributes*, and `<b>` is an attribute-free inline tag. `[FORMAT]` already instructs
   `use <b> for inline spec scannability`, and the Doc path's `hook` is a prose field that
   `task-a-doc.ts:93-95` declares admits `<b>` and `<strong>`.
2. **`[OUTPUT CONTRACT]` at `:20` still holds** — *"The first character of your output is the opening
   `<` of the §1 hook paragraph"* is true of `<p><b>Name</b> — …`.
3. **`bash arch-guard.sh --rebaseline` must ride in the same commit as the edit**, per the original
   grant's own terms and AGENTS.md §9. It will.
4. **No test pins the sentence being replaced, so H1 needs no test change.** Checked directly rather
   than by keyword grep: `master-system-prompt.v4.spec.ts`'s NI-1 block (`:51-62`) contains exactly
   two assertions about §1 — `occurrences('40–75')` is `0` and `occurrences('40–85') >= 2`. The
   replacement introduces no `40–75` and touches neither `40–85` occurrence (they live at `:216` and
   `:218`, which this request does not alter). No assertion anywhere in the suite references
   `Open with`, `[Category]`, `designed for` or `featuring [key specs]` in the prompt — swept across
   `src/**` and `test/**`. **H1 therefore carries no `changes_required_tests` dependency**, which
   matters because the approver should know before granting whether saying yes also commits the
   pipeline to a TEST_WRITING loop. It does not.

**Blast radius, stated with the request.** `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` on the Doc
path, and is also imported by FROZEN `src/prompts/task-c.ts:87` (the translation path, all nine
non-master locales) and by `src/prompts/optimizer.ts`. The change therefore applies the invariant
start to translated descriptions too, which is what FR-1 asks for — v4 **structure** applies to every
locale in `STORE_REGISTRY`, and only the word volumes are `uk-UA`-only (OD-5). `task-c.ts` and
`optimizer.ts` are not edited by this request. `master-system-prompt.v4.spec.ts` pins no text on
`:217`; the one-line change was checked against it before being proposed.

**If the approval is refused**, B1 cannot be closed as written and the honest route is back to
ARCHITECTURE_PLANNING to decide how AC-1's invariant start is delivered without block 0 — not a
narrower builder fix.

---

## 6. Measured state — confirmation that the tree is unchanged, not a post-change measurement

Nothing was modified on this pass, so these figures are presented as **confirmation that `5ee05c7`
is intact**, and are not offered as evidence about any fix. Every one was run this session.

| Check | Result | Same as v2? |
|---|---|---|
| `npx vitest run` (**`test:logic`**) | **122 files passed (122)**; **2812 passed \| 3 skipped (2815)**, 0 failed | yes |
| `npm run test:components` (**`ng test`**) | **1 file, 4 passed (4)**, exit 0 | yes |
| `npm run lint` (`tsc --noEmit`) | **CLEAN — exit 0, no output** | yes |
| `bash arch-guard.sh` (no `--rebaseline`) | **✅ ALL CHECKS PASSED** — Rules 1, 3, 4 and *"All frozen files unchanged"* | yes |

`npm run test:coverage` was **not re-run** and no coverage claim is made on this pass: no source file
changed, so v2's measured floors stand unaltered and re-asserting them would be reporting a figure
this pass did not establish.

The arch-guard FROZEN result is the load-bearing one here: it confirms `master-system-prompt.ts` is
still exactly what T12's approved edit left, and that **no unapproved frozen edit was made while
deciding not to make one**.

---

## 7. Task status — unchanged from v2

All thirteen tasks remain **DONE** at the commits v2 records
(`T1` discharged by TEST_WRITING at `0622de6`; `T2` `761c371`, `T3` `3c91582`, `T4` `f30e85a`,
`T5` `33a2a66`, `T13` `38e0b04`, `T6` `a2e973a`, `T7` `3bd1873`, `T8` `53b80a5`, `T9` `b656dce`,
`T10` `d993fee`, `T11` `33adf2a` + `8b34852`, `T12` `85ebaa3`). This pass added no commit to that
range and changed no task's state.

**B1 is not a task that was skipped.** It is a requirement clause the plan's traceability table mapped
to D12 and NI-1, neither of which delivers it (`reconciliation_report` §3). No breakdown task named
it, so no task's acceptance check could have caught it.

---

## 8. Findings

| # | Finding | Disposition |
|---|---|---|
| **NB-1** | AC-1's opening form has no row in `ac_test_matrix` v2 and no assertion anywhere in the suite. After H1 + H2 it still will not — `so-builder` may not write tests (AGENTS.md §7.7). | **Not** a `changes_required_tests` loop: there is nothing to assert against until the implementation lands. Recorded for the next RECONCILIATION pass to route, after the fix exists. |
| **NB-2** | FR-1's stated failure path — *"rejected by structural validation"* — has **no mechanism in any file, frozen or unfrozen.** H1 + H2 instruct; they do not reject. | Architecture decision (`so-planner`). Candidate home: a version-guarded `superRefine` on the `'4.0'` branch of `src/domain/description-doc.schema.ts` (unfrozen). Precondition before proposing it: a sweep of **every** doc the suite parses as `'4.0'`, not just `test/fixtures/v4-docs.ts`. See §3. |
| **NB-3** | The plan's three-sweep method for enumerating the §9 surface cannot see a clause that states a reversed rule in prose carrying no numeral, no named construct and no `§n` cross-reference. `:217` is exactly that shape. | Recorded because the same blind spot could be hiding another clause in the same file. A fourth sweep — read the `[CONTENT STRUCTURE]` numbered clauses as units, as `:26-38` was — would close it. |
| **N1 … N8** | RECONCILIATION's eight non-blocking findings. | **Explicitly out of scope for this loop** and untouched, per the dispatch. Carried forward unchanged. |
| **F1 … F6** | v2's six findings. | Unchanged; F2, F3, F4 and F6 remain closed, F1 and F5 remain standing. |

---

## 9. Working-tree hygiene

The sanctioned **US-1.1 rollback was not touched.** Its staged deletions (`docs/**/US-1.1-*`,
`server/cors-policy.js`, `test/cors-policy.spec.ts`) and its unstaged `server/index.js` and
`.env.example` edits remain exactly as handed over, as do the five untracked upstream stage reports.
The single commit on this pass used an explicit pathspec and carries
`docs/catalog/US-2.1-pipeline-status.md` alone — verified with `git show --stat HEAD`. Neither
`git add -A`, `git add .` nor `git commit -a` was run.

`docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were **not written**; they
remain the orchestrator's. No branch was pushed and no Pull Request was opened, updated or merged.
