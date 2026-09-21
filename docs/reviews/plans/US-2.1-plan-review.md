---
artifact: plan_review
story: US-2.1
version: 2
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-09-20T18:00:00Z
updated_at: 2026-09-21T10:00:00Z
supersedes: docs/reviews/plans/US-2.1-plan-review.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Plan Review: US-2.1 — Migrate product descriptions to the v4.0 UA content schema

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

All three v1 blocking findings are closed, and each was re-verified against primary source rather
than read back from the planner's own account of it. The §9 request is now expressed as five
negative invariants whose completeness method this review **re-ran** — the numeral sweep reproduces
exactly, hit for hit and line for line — so the approval surface is a property of the file rather
than a list that can silently fall short. FR-6's `<ol>` is real work (D17 → T13 → V15) with an
observable check and an honest statement that the reconciliation corpus is blind to it. The T1/T3
fixture split satisfies C-1 in both directions with checks a command can run. One finding travels
with this PASS that neither v1 nor v2 caught: `src/prompts/optimizer.ts` is a live app mode whose
own task instruction depends by name on the §2a table template NI-2 deletes, so the plan's
"they inherit the corrected text" disposition for that consumer is wrong as written. It is
non-blocking — it changes no AC's reachability, no commit's greenness and no FROZEN surface — but
it needs a disposition before T12's edit lands, and nothing automated will catch it.

---

## Re-verification of the v1 blocking findings

### v1 finding 1 — the §9 enumeration method: **CLOSED**

The defect was the **method**, not the count, and the method is what changed.

**The invariant framing is the fix, and it is the right one.** NI-1..NI-5 state what must no longer
be true of the file, one per reversed Specification requirement. The plan and T12 both say, in the
same words, that the clause list is *evidence for the invariant, not the scope of the edit*, and
that an implementer who finds a further clause violating an invariant is **inside** the approved
surface. That inverts the failure mode: under v1, a clause discovered later fell outside an
approval a human had already granted; under v2 it falls inside one. T12's acceptance check moves
with it — from "the six clauses read v4" to one reproducible check per invariant, five of which are
zero-occurrence greps.

**The completeness method is reproducible, and this review reproduced it.** Not "it is well
described" — it was re-run:

| Sweep | Plan's claim | Re-run result | Verdict |
|---|---|---|---|
| Numeral — `40–75` | 3 hits: `:27`, `:216`, `:218` | **exactly 3, at those lines** | reproduces |
| Numeral — `90–200` | 2: `:28`, `:225` | **exactly 2, at those lines** | reproduces |
| Numeral — `150–2,000` | 2: `:29`, `:250` | **exactly 2, at those lines** | reproduces |
| Numeral — `80–150` | 2: `:34`, `:351` | **exactly 2, at those lines** | reproduces |
| Construct — `table` | 20 hits, §7's twelve untouched | 22 matching lines, of which 1 is the substring `byte-stable` (`:5`) and 1 is the unrelated [REGIONAL STRATEGY] table (`:69`) → **21 word-boundary lines** | reproduces; count off by one, triage sound |
| Cross-reference — `§2` | 7 | **7 lines** (`:28`, `:226`, `:270`, `:272`, `:309`, `:460`, `:461`) | reproduces exactly |
| Cross-reference — `§3` | 11 | **12 lines** | reproduces; count off by one, every line triaged below |
| Cross-reference — `§6` | 3 | **1 occurrence** (`:32`) | over-count; hides nothing |

The numeral sweep is the load-bearing one and it is exact. The construct and cross-reference counts
are approximate in the artifact, and both discrepancies are over/under-counts that conceal no
clause: every `§3` line was checked here (`:29` NI-3, `:36`/`:381` video-in-§3 and already correct,
`:42` tier-2, `:133` exclusion list, `:206`/`:209` narrative-fidelity ordering unreversed,
`:253` inside the `:250` clause and already correct, `:292` §5→§3 routing unreversed, `:454`/`:458`
/`:459` image anchors with `:459-461` in NI-2). Recorded as a non-blocking accuracy note, not a
defect — because under the invariant framing the count is bookkeeping and the invariant is scope.

**Every cited evidence clause was read at its line and reads as the plan states.** `:27-34` section
map, `:216`/`:218`, `:225`/`:226-227`, `:228-246` (the three-column template plus the five-locale
column-header table), `:247-248` ("one `<p>` or `<ul><li>` per benefit"), `:250-251`, `:296`
(`<h2>What's in the box</h2> + <ul>`), `:32` (`conditional, 1 <h2> + 1 <ul>`), `:351`, `:356`
(`uk-UA: "Чому купити [Product-short] в [Store]?"`), `:459-461` ("place them in §5 (Compatibility)
or **§2 body text** … weave all figures into §2–§5 prose"). Tier 2: `:42`, `:103`, `:153-154`,
`:221`, `:270-272`, `:309` — all present as quoted.

**The seventh clause the planner's own sweep found is real.** `:153-154` reads
*"Reserve `<ul><li>` for key features / capabilities / 'What's in the box'; route all parameters
into tables"* — verified at those lines. The planner is right that it lands twice (v4 routes §2's
killer-spec parameters into a `<ul>`, and §6 becomes an `<ol>`), and right that the surviving rule
is the §7 one. v1 did not name it; finding it independently of this review is the strongest
available evidence that the new method works rather than merely reads well.

**`:270-272` is required to be relabelled, not deleted — confirmed in both artifacts, twice each.**
Plan v2 D13 tier 2: *"**Relabel to the merged §2 list — do NOT delete.** … Deleting them would
weaken live coverage to tidy a name"*, and the rejected-alternatives table carries
"Deleting `:270-272` … along with the §2b name" as a rejected option on §7.7 grounds. Breakdown T12
tier 2 repeats it in capitals, and **T12 acceptance check 6 makes it a *positive* grep** — "grep for
both rule names must return hits". That is the correct shape: a delete-forbidding instruction with
no positive check is indistinguishable from a hope. The coupling to T5's `bold-label-glue`
clearance argument is carried in both tasks' Notes and in the breakdown's carried-findings list.

**What remains unswept — one class, non-blocking.** `:212` reads
`[CONTENT STRUCTURE — Product Description Schema v3.0]`. It is the header of the block the edit
rewrites, and it names the superseded schema version. No invariant is violated by it (it states no
rule), it is in no tier-2 row, and it is in no exclusion row — and, structurally, **none of the
three sweeps can reach it**: it contains no superseded numeral, no changed construct, and no in-band
§-reference. The same class covers the file header comment at `:6`. `:353`'s "(Schema v3.0 §9)" is
inside NI-4's clause extent and is reachable by the stated reading convention, so only `:212` and
`:6` sit outside. Severity is low — a stale label, not a reversed rule — but the three-sweep method
has exactly one blind class and this is it. Non-blocking finding 2.

**One consequential note on NI-2's deletion, for the implementer.** `:244-246` ("Each 'Why it
matters' cell MUST start with a capital letter … in every output language") sits **inside**
`:228-246`, which NI-2 removes. That content does not disappear from the product — it becomes the
post-em-dash text of the merged §2 `<li>` — and D8 already records that the validator's
`checkLeadInCapitalization` killer-specs branch stops firing there. Both the prompt rule and the
validator rule for that string therefore go at once. The tier-2 relabel of `:270-271` (COLON
CAPITALIZATION, currently scoped to "this section and §2b Key Benefits") is what carries the
obligation forward, and it does cover the relabelled form. Recorded so the relabel is understood as
load-bearing rather than cosmetic. Non-blocking finding 3.

### v1 finding 2 — FR-6 / AC-5's `<ol>`: **CLOSED**

It is real work with an observable check.

- **Requirement re-read.** Specification FR-6: *"the section is an `<ol>` under the heading 'Що в
  коробці?' … or 'Що входить до набору?'"*. Story AC-5 states it in the same words. Both verified.
- **Current behaviour re-verified.** `render-description.ts:336-339` emits
  `<h2>${esc(heading)}</h2>\n<ul>\n${items}\n</ul>` unconditionally.
- **D17 decides it** as the third point of D8's `schemaVersion` branch, and **D8's "Nothing else in
  `renderDescription` changes" sentence is deleted and replaced with an enumeration** of exactly
  three version-conditional points. The breakdown deletes the same v1 claim from T5 by name.
- **T13 implements it** with its own commit, its own file row, and four acceptance checks. Check 1
  is the observable one (`'4.0'` → `<h2>` + `<ol>`, `'3.0'` → `<h2>` + `<ul>`, `<li>` items and
  heading byte-identical on both paths). Check 4 is the better one: it states plainly that
  `render-reconciliation.spec.ts` being green is **not** evidence here.
- **That negative claim is true, and was verified independently.** Neither corpus `.doc.json`
  contains `packageContents` — grep returns zero on both. Reconciliation is byte-for-byte green
  under either choice of element, so V15 genuinely is the only detector in both directions.
- **The version-scoping is correct, not over-cautious.** FR-15's "keeps the previous handling rules
  wherever they differ" is the governing text, and `<ul>` is such a rule for every shipped `'3.0'`
  artifact. The rejected unconditional `<ol>` is rejected on that text, not on taste.
- **V15's split across T1 and T13 is sound.** The `'3.0'` half is `'3.0'`-typed, is unconstrained by
  C-1, and is only evidence when committed against the unmodified renderer — T1 check 2 requires it
  to pass with `git diff --stat src/render/` empty. Binding the category as one unit to T13 would
  have destroyed that, and the plan and breakdown both say so.

### v1 finding 3 — T1 buildability: **CLOSED**

The split satisfies C-1 in both directions, and T1's commit can be lint-green *for the file T1
owns*.

**Direction 1 — no `'4.0'`-typed artifact before the union widens.** Re-verified the three facts the
constraint rests on: `src/domain/description-doc.ts:122` is `schemaVersion: '3.0';` (a literal
type); `tsconfig.json` `include` carries `"test/**/*"` with its own comment explaining why; and
`package.json:11` `"lint": "tsc --noEmit"`. T1 now authors **six `'3.0'` builders only**, and all six
shapes are legal under today's schema — `subsections` optional and unbounded, `keyBenefits:
z.array(RelaxedBlockSchema).min(1)`, the `SpecRow.value` union at `:187`, no combined ceiling
anywhere. T1 acceptance check 3 makes the constraint observable rather than asserted:
`git grep -n "schemaVersion: '4\.0'" -- test/fixtures/v4-docs.ts` returns nothing, and the note
about grepping the quoted literal rather than the bare string `4.0` (because doc-comments
legitimately say "v4.0" in prose) is the difference between a check that runs and one that doesn't.

**Direction 2 — the `'3.0'` baseline is not absorbed into the widening change.** This is the half no
command catches: a merged baseline still goes green and loses only evidence. T3 acceptance check 5
makes it a **diff-shaped** check — the `test/fixtures/v4-docs.ts` diff must be purely additive with
the six `'3.0'` builder bodies byte-unchanged. That is the only correct treatment for a silent
failure mode, and R10 states the reason in the artifact so review can check it by reading.

**The anti-tautology argument survives the split intact.** T1 check 1 still requires the V1 `'3.0'`
block to pass with `git diff --stat src/domain/` empty, which is satisfiable only against the
unmodified schema. That is what T1 is *for*, and the split preserves it; merging T1 into T3 would
have destroyed it, and both artifacts reject the merge by name (C-1, R10, and the rejected-
alternatives row).

**Both v1 consequential notes survived.** T3 check 4 still reads the `description-doc.ts` diff and
expects the `schemaVersion` union to be its only changed line. T5's Notes still route the
`render-conformance.spec.ts:54` `'3.0'`-to-`'4.0'` spec edit to TEST_WRITING and keep it out of T5's
Files list, with check 4 consuming the result rather than producing it.

**The residual is the cross-stage edge — see finding 1 below.** T1 check 3 is scoped to T1's own
file. That is an honest boundary, not a gap this gate can close.

---

## 1. Specification coverage (re-derived, both directions)

Re-derived from the Specification text against each task's **Files** and **Acceptance check**, not
read back from the breakdown's own coverage tables. Only rows with a finding or a non-obvious
mapping are reproduced; every other FR was confirmed reached.

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 hook form, 40–85 | T7 (block 1), T12 (NI-1: `:27`, `:216`, `:218`) | covered — the `:218` restatement is now inside the request, by the stated reading convention |
| FR-4 §2 = one `<h2>` + one `<ul>` ≤ 8, no table | T2, T3, T5, T7, T12 (NI-2, incl. `:247-248` and `:459-461`) | covered in schema, renderer, block 1 **and** cached block 0 — v1's one-directional gap is closed |
| **FR-6 §6 is an `<ol>`** | **T13** (D17, V15) | **covered** — v1's "work that will not happen" is now a task with its own commit and its own detector |
| FR-6 §6 heading code-resident | T2 (table), T3 (membership check), T7 (prompt), T12 (NI-5: `:32`, `:296`) | covered; `:32` is reachable only by the section-map sweep and is named |
| FR-6 §5/§6 conditional emission | standing — `:279`, `:295` already instruct it | covered (standing), correctly unclaimed and correctly in the exclusion list |
| FR-11 CTA 50–100 + template | T2, T4, T5, T7, T12 (NI-4: `:34`, `:351`, **`:356`**) | covered — `:351`'s 80–150 and `:356`'s superseded «Чому купити» template are both inside the request; v1 carried `:356` as a non-blocking note and v2 folds it in, which is the cheaper outcome |
| FR-14 distributing index | T6 (selector), T7 (parameter), T8 (wiring) | covered; distribution is an acceptance check on T6, not only a test name |
| FR-17 combined §2 ceiling | T3 (schema refine carrying `measured` operands) | covered |
| FR-27 §3 no volume limit | T3, T7, T12 (NI-3: `:29`, `:250-251`; tier-2 `:42`) | covered — `:29`'s restatement is inside the request |
| FR-7, FR-12, FR-20, FR-22, FR-26, FR-30 | no task, standing behaviour, each argued | covered — each carries a negative acceptance check or a characterization test (V11, V13, T5 check 6, T7 check 3) |
| FR-20 | standing, V11 | covered — **and R9 is the one property parity cannot see**, judged once below |

**AC-1..AC-11 reachability, re-derived. Every criterion is reachable through at least one task.**

| AC | Reachable | Via |
|---|---|---|
| AC-1 | yes | T7 (prompt form and range), T12 (NI-1 removes the contradicting block-0 range) |
| AC-2 | yes | T5 (the `<b>lead</b> — benefit` item form), T7; the 3–4 bound is already pinned and unmoved |
| AC-3 | yes | T2 (heading), T3 (composition + ceiling), T5 (render), T7 (prompt), T12 (NI-2) |
| AC-4 | yes | T7; bound unchanged at `description-doc.schema.ts:174` |
| **AC-5** | **yes — now in full** | conditional-emission half standing; heading half T2/T3/T7/T12 (NI-5); **`<ol>` half T13**. This is the row v1 marked "partially" |
| AC-6 | yes | T3 (string-only value), T7; `renderSpecs` and `spec-category-shape.ts` standing |
| AC-7 | yes | T2 (template), T4 (resolver), T5 (assembly), T7, T12 (NI-4) |
| AC-8 | yes | T11; no-`<h1>` standing |
| AC-9 | yes | T6, T8 — FR-14's distribution property asserted against the system; the consecutive-pair window correctly routed to TEST_WRITING as fixture curation |
| AC-10 | yes | T5 (first-image-eager in rendered order), T9/T10 (separators), T7 (iframe title path unchanged) |
| AC-11 | yes | T3 (the enum), T7 (the prompt); FR-30's half is D16/V13 |

**FR-27..FR-29 trace to no AC, and that is correct.** The Specification's traceability matrix
declares them under a "(standing)" row alongside FR-20, FR-21, FR-25 and FR-26, with the reason
stated: they carry v4 §3, which is mandatory in v4 and inside the delta OD-1 declared. Not a gap.
One accuracy note, changing no work: **FR-30 is declared AC-less in the "(system-level)" row while
also appearing in the AC-3 and AC-11 rows** of the same matrix. Either reading leaves FR-30 reached
(D16, V13, T3), so this is a cosmetic inconsistency in an APPROVED Specification and explicitly not
a reason to route there.

**Task → plan item (scope creep).** Every task traces to a plan decision or a named plan
requirement. **T13 traces to D17**, which is new and derived from FR-6's own text — the textbook
case of a decision added because a requirement demanded it, not because a task wanted one. T1 and
T3's fixture module still discharges the plan's *Validation strategy* requirement for hand-authored
fixtures on both sides of V1, V2 and V15; the plan names the need but no file, and the breakdown
flags that itself.

Checked against the Specification's **Out of scope** section **by name**: the Consumables Doc
pipeline (`task-a-consumables-doc.ts`, `consumables-doc.schema.ts`, `renderConsumablesDoc`) appears
in no task and is in *Explicitly NOT modified*; the v4 simplified schemas appear nowhere; the FAQ
trigger is explicitly unchanged (T11's acceptance check asserts the diff touches no control flow);
SEO / `task-b.ts` is untouched; `meta-description-currency` stays disarmed by construction because
`output-validator.ts` is not edited; no mass migration and no `'3.0'` → `'4.0'` upcast exists
(D16, V13); the functionality bullets floor is untouched (T3, T7); §7 conditional-omission behaviour
appears nowhere; the Story is not split. **T13 adds no scope** — one ternary in one existing
`if (doc.packageContents)` block. **No scope creep found.**

---

## 2. FROZEN files (AGENTS.md §9)

The FROZEN set is exactly five, read from `.arch-guard-checksums` again this run:
`src/prompts/task-a.ts`, `src/prompts/task-b.ts`, `src/prompts/task-c.ts`,
`src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`.

Every task's **actual file list** was checked against that set, not the task's own FROZEN row.

| Task | Files | Lands on a FROZEN file? | §9 stop present? | Verdict |
|---|---|---|---|---|
| T1 | `test/fixtures/v4-docs.ts` | no | n/a | ok |
| T2, T9 | `src/prompt-core/constants.ts` | no | n/a | ok |
| T3 | `description-doc.schema.ts`, `description-doc.ts`, `test/fixtures/v4-docs.ts` | no | n/a | ok |
| T4 | `src/prompt-core/store-render-rules.ts` | no | n/a | ok |
| T5 | `src/render/render-description.ts` | no | n/a | ok |
| **T13** | `src/render/render-description.ts` | **no** | n/a | **ok — new task, checked, not inherited** |
| T6 | `src/prompt-core/hook-pattern.ts` (create) | no | n/a | ok |
| T7 | `src/prompts/task-a-doc.ts` | no | n/a | ok — and carries the positive check (`git diff --stat src/prompts/task-a.ts` empty, `arch-guard.sh` clean) |
| T8 | `src/services/content-orchestrator.service.ts` | no | n/a | ok |
| T10 | `src/utils/number-format-fixer.ts` | no | n/a | ok |
| T11 | `src/prompts/task-faq.ts` | no | n/a | ok |
| T12 | `src/prompt-core/master-system-prompt.ts`, `.arch-guard-checksums` | **YES** | **yes — STOP, UNGRANTED, preconditions ordered, rebaseline in the same commit** | **ok — and the scope is now correct** |

No task edits a FROZEN file without the stop. The plan does **not** assume approval it does not
have: D13's heading says the plan does not grant the edit; T12's *Depends on* row says the approval
is UNGRANTED; precondition 2 ends in "Then **STOP**"; and both artifacts forbid reaching for the
rejected `[CONTENT STRUCTURE]` override if approval is withheld, by name.

**`arch-guard.sh --rebaseline` in the same commit** is required in three places: D13's request body,
T12's Files table (`.arch-guard-checksums` — "committed **in the same commit**"), and T12 acceptance
check 8 ("one commit, not two"). Correct and redundant in the right way.

**The narrowing from four files to one** was verified in v1 and is not re-litigated. v2 adds one
leg and it was checked: `output-validator.ts` contains **zero** `<ol>` or `<ul>` rule subjects, so
D17 adds no validator work — confirmed independently against the file.

---

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | **Clear.** No task touches `server/**` or any provider |
| **2 — retrieval separate from generation** (no automated check anywhere) | yes, deliberately, by reading what the plan proposes | **Clear.** Re-read every task's *What changes* for a retrieval surface, T13 included: T6's selector is a pure function of `name` + `website` with no network; T8 reads values already present on the orchestrator's input and performs no fetch; T13 changes a list tag. Nothing routes Serper or page-fetch output into a prompt, and no new grounding path exists. R8 correctly records that a green arch-guard is not evidence |
| 3 — prompt text out of services | yes | **Clear.** T8 passes a `HookPattern` **value**; the instruction string is composed inside `task-a-doc.ts` (T7). No prompt literal enters the service |
| 4 — no key in the bundle | yes | **Clear.** No API-key path is touched |
| **5 — no existing feature broken** | yes | **Clear for the Doc and translation paths; one finding on a third consumer.** `'3.0'` parse (T3 check 1), `'3.0'` render byte-for-byte (T5 check 3), `'3.0'` §6 `<ul>` (T13 check 1 + V15's T1 half), `killerSpecsHeaders` explicitly not deleted, the §5 factory untouched. **But `src/prompts/optimizer.ts` — a live `AppMode`, wired through `content-orchestrator.service.ts:60` and `app.component.ts` — carries its own clauses at `:21`, `:40`, `:49-53` and `:61` that depend by name on the §2a Killer Specs table and its localized column headers, which NI-2 deletes from `:228-246`.** See non-blocking finding 1. The v1 finding-3 sequencing defect is closed by the T1/T3 split |
| `STORE_REGISTRY` sole source of locales/currency | yes | **Clear.** T2 derives the table's key set **from the registry** rather than hand-listing and makes a missing entry fail; T4 resolves the store name through `getRenderRules`; the `toHaveLength(7)` tripwire is named and preserved. No new language list anywhere, T13 included |
| `systemBlocks` not collapsed into `userContent` | yes | **Clear.** T7 check 1 asserts `systemBlocks[0]` and the ToV overlay byte-identical, index 1 the Doc instruction with `cache: true`, the pattern in `userContent` only; T8 asserts two different products yield different `userContent` with **identical** `systemBlocks`. That is the observable form of the caching guarantee |

---

## 4. prompt → schema → renderer → validator

- **Links touched:** all four. Prompt — T7, T9, T11, T12 (FROZEN master). Schema — T3. Renderer —
  T5 **and T13**, with T2/T4 supplying contracts. Validator — deliberately **not** touched
  (D7/D13), with `structural-parity` carrying the nine translated locales instead.
- **Stay in agreement: yes, now in both directions.** Schema, renderer and prompt block 1 all state
  bullets-only §2 and the ≤8 ceiling, and **cached block 0 is made to agree by NI-2**, which is
  violated by *any* such clause rather than by six named ones. The §6 link agrees the same way:
  heading by membership check (T3) against the code-resident table (T2), list element by renderer
  branch (T13), block 0's `:32` and `:296` by NI-5. The one remaining disagreement is outside this
  chain and is non-blocking finding 1.
- **Contract-before-consumer ordering holds**, including for the new task. T2 → T3 (membership check
  reads the table) and → T4 → T5; T3 (the widened union) → T5 **and → T13**; T6 → T7 → T8. C-3
  states these as type dependencies, and the breakdown's dependency graph matches its linear order.
  **T13's placement is correct**: its logical dependency is T3, its dependency on T5 is same-file
  sequencing, and the breakdown says so in those words rather than implying a false ordering
  constraint.
- **T5 → T13 as a same-file, same-function edge** is correctly recorded as "cannot run in parallel
  on one working tree", alongside the T2 → T9 edge in `constants.ts`. Two sequencing edges, both
  labelled as sequencing rather than logic. That is the right disclosure.
- **§4 criteria the renderer must keep satisfying, list complete:** **yes, and v1's one gap is
  closed.** D8's table now carries the figure-*placement* row that puts `:459-461` in the §9 request
  — the row whose absence v1 called finding 1's most expensive single instance — and the `<hr>` row
  explicitly extends to D17 ("a list element inside a bare `<h2>` group, not a `<section>`"). T13
  check 3 discharges it observably (`<section>` / `<hr>` counts unchanged, `figurePositions` and
  `forEachBlockInOrder` untouched). D9's "no new collection" remains a negative acceptance check on
  T3's diff and is now asserted a second time on T13's.

---

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | **Pass.** Track, Depends on, FROZEN, What changes, Files, Tests to turn green, Acceptance check, Notes — on all thirteen, T13 included |
| Acceptance checks observable | **Pass, and stronger than v1.** The two new ones are the best in the document: T1 check 3 is a grep of a quoted literal with the false-positive trap called out; T3 check 5 is a diff-shaped check aimed squarely at the one failure mode no command catches. T13 check 4 asserts what is **not** evidence, which is rarer and more useful than another positive |
| Each task could end in one green commit (§13) | **Pass.** v1's T1 failure is closed by the split; every other task was re-checked against its own file list and dependencies |
| No task spans two tracks | **Pass.** Re-verified against `stage-map.yaml` `skills_by_track`. T13 is `angular` (`src/render`), single-track. The three forced splits remain real: T6/T8, T9/T10, T4/T5 |
| Ordered by dependency and risk, riskiest first, rationale stated | **Pass.** "Why T1 is first" is still a genuine risk-first rationale and is not a tautology, and v2 adds a second, independently valid reason (V15's `'3.0'` half is only evidence against the unmodified renderer). "Where the §9 stop sits" argues C-4 rather than asserting it |
| Fixture updates sit with the change that moves them | **Pass — the v1 deviation is corrected in the right direction.** The `'3.0'` family precedes the change it polices because that is its evidentiary value; the `'4.0'` family now lands **with** T3, the change that widens the union and consumes it. The breakdown argues against a separate `'4.0'`-fixture task explicitly, on the grounds that it would leave T3's own acceptance check unverifiable and would be the cleanup task the rule exists to prevent |
| Stale v1 statements removed rather than left | **Pass.** Three are deleted by name: T1's "self-correcting ordering" note, T5's "the §2 branch and the CTA are the whole renderer change", and T12's "the six clauses, and nothing else" |

---

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | **Pass.** All thirteen carry a Runner column, all `test:logic`. The plan states why (`model-settings.component.spec.ts` is the only component spec and nothing reaches `src/app/components/`) |
| Component specs named `*.component.spec.ts` | **Clear, vacuously and correctly.** No task reaches `src/app/components/`; the component runner gains no work and the plan says so |
| Untested tasks justify changing no behaviour | **Pass.** There are none. The exclusions (D9, D14, D16) are discharged as negative acceptance checks or characterization tests rather than prose |
| Failure paths from the FRs are covered | **Pass — v1's one gap is closed.** V1/V2 cover the four leak shapes in both directions at their exact dotted paths; V12 covers FR-18's negative; V13 covers FR-30's exhaustion and the absence of a downgrade path; V5 covers FR-14's distribution, not merely determinism; **V15 now covers FR-6's `<ol>` in both versions**, with the explicit statement that V4 cannot be delegated to for it |
| Nothing relies on weakening/skipping a test (§7.7) | **Pass, and defended in more places than v1.** T12 requires `master-system-prompt.spec.ts`, `constants.spec.ts` and `optimizer.spec.ts` green **without modification** and names weakening a pin as a §7.7 violation; **T13 check 2 requires V15's `'3.0'` half to be still green and still unmodified**, calling a re-authoring "an AGENTS.md §7.7 move, not a fix"; T3 check 5 forbids re-authoring the `'3.0'` builder bodies; T9 keeps the group-2 line byte-identical; T10 forbids editing the `COMMA_DECIMAL_LOCALES` mirrors |

**The leak discipline still closes, and L1–L7 are unchanged by v2.** The corpus acceptance checks
remain real checks on real tasks — T3 check 1 (`safeParse` `success: true` on both `.doc.json`
files, unmodified on disk) and T5 check 3 (`render-reconciliation.spec.ts` byte-for-byte on both).
v2 adds the honest counterpart: for §6 that harness detects **nothing**, verified here by grep.

---

## 7. Impact-analysis fidelity

- **Plan consumed the survey rather than re-deriving it:** yes, unchanged from v1. *Files to create
  / modify* still says "Derived from the impact analysis §1, not re-surveyed"; the leak numbering,
  hazard numbering, corpus measurements and U1–U5 unknowns are consumed as given.
- **The one contradiction is still handled correctly.** The `task-a.ts` supersession of §1.1 row 3
  and Hazard 4 bullet 1 is recorded as a non-blocking finding against the survey rather than a
  loop-back, and was independently confirmed in v1.
- **Files touched but not surveyed:** `src/prompt-core/hook-pattern.ts` and
  `test/fixtures/v4-docs.ts`, both **created** by decisions the survey routed forward. **D17 and T13
  introduce no new file** — `render-description.ts` is already surveyed. No survey gap, no scope
  growth.
- **v1's one open survey item is now disposed.** `test/tools/scaffold-doc.mjs` has a stated
  disposition in *Explicitly NOT modified* ("stays a `'3.0'` instrument", with `:317` and
  `scaffold-doc.spec.ts:241` cited) and is repeated in T1's Notes. Closed.

---

## Verdict rationale

**PASS.** All three v1 blocking findings are closed against primary source, not against the
planner's account of them:

- **Finding 1** is closed by a change of **method**, which is what was asked for. The invariant
  framing makes the surface a property of the file rather than a list, so a clause found later is
  inside the approval instead of outside it; the completeness method was **re-run here** and the
  numeral sweep reproduces exactly; the seventh clause the planner's own sweep found (`:153-154`)
  was independently verified to exist; and `:270-272` is required to be relabelled with a
  *positive* grep as its check. One residual class (`:212`'s version label) sits outside all three
  sweeps and travels as a non-blocking finding.
- **Finding 2** is closed by a real design decision (D17), a real task with its own commit (T13), a
  real validation category (V15), and an explicit statement of what is *not* evidence for it.
- **Finding 3** is closed by a split that satisfies C-1 in both directions, with the silent
  direction given a diff-shaped check because no command catches it.

**Not CHANGES_REQUIRED.** The one new finding — the Optimizer's dependence on the §2a table NI-2
deletes — was weighed against each of the three loop-back keys and belongs to none of them. It
changes no AC's reachability, makes no commit non-green, and expands no FROZEN surface
(`optimizer.ts` is not in `.arch-guard-checksums`, verified). The plan has already **made** the
design call for that consumer ("both are intended to follow v4"); what is missing is the work that
follows from it, in a single non-frozen file. Routing to ARCHITECTURE_PLANNING for a disposition
paragraph would spend loop 2 of 3 on something the §9 human approver — who reads this review before
granting T12's approval — is the right person to settle. It is recorded with the precision needed to
act on it.

**Not `changes_required_tasks`.** NBF-1's cross-stage edge is the only candidate, and no task can
close it: it is a property of the form `TEST_WRITING` gives its `'4.0'`-consuming spec blocks, which
is `so-test-writer`'s decision. A loop-back here would produce a breakdown prescribing another
skill's work.

**Not `changes_required_specification`.** Nothing here is a Specification defect. FR-6 states the
`<ol>` plainly and the plan now reads it; the FR-30 traceability inconsistency changes no work.

**Not BLOCKED.** No input is stale or `SUPERSEDED`; the Specification is APPROVED at v2 and all
eleven Open Decisions remain SETTLED with `blocking: false`; the **UNGRANTED** §9 approval for
`src/prompt-core/master-system-prompt.ts` is correctly a precondition of T12 at IMPLEMENTATION, not
a blocker of this stage.

### The three items the planner asked to be judged rather than taken on trust

**NBF-1 — C-1's cross-stage edge: an honest boundary, with an obligation attached, discharged at
`TEST_WRITING`.** The facts are right: `TEST_WRITING` commits its specs before any task runs;
`npm run lint` is `tsc --noEmit` over `test/**/*`; so a spec block importing a `'4.0'` builder
references an export that does not exist until T3, and a missing export is a red type-check rather
than a red test. It is the right call to state this rather than assume it away, and the right call
not to prescribe the fix — **none of PLAN_REVIEW's three loop-back keys owns `TEST_WRITING`'s file
form.** But the boundary must carry the obligation, so it is named here: a usable form exists, and
it follows from which categories need a *typed* document. **`ProductDescriptionDocSchema.safeParse`
takes `unknown`**, so V2's four `'4.0'` negatives and V12 need no `ProductDescriptionDoc`-typed
value at all. Only **V3, V14 and V15's `'4.0'` half** feed `renderDescription`, which takes the
type — so only those blocks are constrained by C-1, and only they need a form that typechecks
before T3 (or a placement that keeps them out of the tree until it). `so-test-writer` should be held
to producing a lint-green tree at its own commit on that basis.

**NBF-2 — V11's negative half green on arrival: accepted.** `structural-parity.ts` is unchanged by
this Story, so an assertion that a translation swapping `<ol>` for `<ul>` does **not** fail parity
holds from the moment it is written. That makes it a characterization test, not a TDD red→green
one, and the breakdown labels it in exactly those words ("Green on arrival, not turned green here")
and states T13's actual role — supplying the `'4.0'` fixture pair it is stated against. This is the
same precedent as V13 and is the honest treatment of an accepted residual: the test records the gap
rather than hiding it. One cosmetic note: the row sits in a column headed *Tests to turn green*
while the row itself says it is green already. The row's text resolves it; worth tidying, not
worth a loop.

**NBF-3 — stable but non-ascending task ids: accepted.** The trade is real and the choice is
defensible: stable ids mean every finding carried from the v1 review still names the thing it named,
which is worth more across a loop than ascending order. The mitigation is explicit — "ids are
identity, not order", the *Execution order* block is declared authoritative, the linear order is
written out (T1 → T2 → T3 → T4 → T5 → **T13** → T6 → T7 → T8 → T9 → T10 → T11 → T12), and task
sections are written in execution order rather than id order. One forward note: `so-builder`'s
`pipeline_status` should track **execution** order, since a naive ascending walk would run T13 last
and put it after T12's FROZEN gate.

### Accepted residuals — judged, not waved through

- **R9 (the §6 `<ol>` is invisible to structural parity): ACCEPTED, and correctly accepted-not-
  closed.** Verified independently: `COUNTED_TAGS` (`structural-parity.ts:33-43`) holds
  `<section>`, `<h2>`, `<h3>`, `<hr>`, `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`,
  `<li>` — and **neither `<ol>` nor `<ul>`**. So a translated locale that reverts §6 to a `<ul>`
  reproduces every counted tag and passes, while FR-20 asks for v4 structure in every locale. The
  refusal to close it is right for the reason given: adding the two tags would retroactively fail
  every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set with no
  `schemaVersion` to scope against — D7's version-blindness argument applied to parity. It is
  bounded (it can only mis-render one section's list container in a derived locale), it is asserted
  by V11's negative half rather than left implicit, and the route to close it later is named. **Not
  a defect.**
- **R3 and R6: accepted in v1, unchanged in v2, not re-litigated.** R6's handling is now worth
  having, which it was not in v1: the goal T12's precondition 1 serves — one complete approval
  surface asked for once — is achievable now that the request no longer leaks from inside
  `master-system-prompt.ts`.
- **R10 (a decomposition re-merges the fixture families): accepted as newly stated**, and its silent
  direction is correctly given a diff-shaped check rather than a command.

---

## Non-blocking findings

1. **`src/prompts/optimizer.ts` depends by name on the §2a table NI-2 deletes, and the plan's
   disposition for it is wrong as written.** D13's blast-radius paragraph says
   `MASTER_SYSTEM_PROMPT`'s two other consumers "inherit the corrected text" and "gain no new work
   in this Story". For `task-c.ts` that is true. For `optimizer.ts` it is not: the Optimizer is a
   live app mode (`AppMode` includes `'optimizer'`; wired at `content-orchestrator.service.ts:60`
   and through `app.component.ts`), and its **own** task instruction names the §2a table four times
   — `:21` ("Every language-keyed table elsewhere in this prompt (§2a/§7 column headers …)"), `:40`
   ("table cell (in both the §2a highlight table and the full §7 table)"), `:49-53` ("reusing that
   schema's exact section names, heading templates, and table formats — **including the §2a Killer
   Specs highlight table (3–4 rows, Specification / Value / Why it matters, localized headers)**")
   and `:61` ("keep the §2a highlight table additive"). NI-2 removes `:228-246`, which is the only
   source in the prompt for that template **and for its five-locale column headers**. The concrete
   loss: the Optimizer keeps instructing the model to emit a §2a table whose localized headers no
   longer exist anywhere in the payload, so non-English Optimizer output must invent them. Nothing
   automated catches this — `optimizer.spec.ts` asserts only the optimizer's own task instruction,
   as T12's own test-table note says, so it passes either way. **A disposition is required before
   T12's edit lands**: either `optimizer.ts` moves in the same change (it is **not** FROZEN —
   verified against `.arch-guard-checksums`), or the Optimizer staying on the v3 §2 shape is
   recorded as an accepted residual with the header-source loss stated. Raise it with the §9 request
   so the human approving T12 sees the real reach of the edit.
2. **One clause class sits outside all three sweeps: the schema version label.** `:212` reads
   `[CONTENT STRUCTURE — Product Description Schema v3.0]` and `:6` repeats it in the file header
   comment. Neither states a rule, so no negative invariant is violated by them; neither is in a
   tier-2 row or the exclusion list; and structurally none of the three sweeps can reach them — no
   superseded numeral, no changed construct, no in-band §-reference. (`:353`'s "(Schema v3.0 §9)" is
   inside NI-4's clause extent and is reachable by the stated reading convention.) Low severity — a
   stale label on a block that will then state v4 rules — but it is the one blind class the method
   has, and `optimizer.ts:6` cites that label by name.
3. **NI-2's deletion of `:228-246` takes `:244-246` with it**, the rule that each "Why it matters"
   cell must start with a capital letter in the target language's own convention. That content
   survives in the product as the post-em-dash text of the merged §2 `<li>`, and D8 already records
   that the validator's `checkLeadInCapitalization` killer-specs branch stops firing there — so the
   prompt rule and the validator rule for that string go at once. The tier-2 **relabel** of
   `:270-271` (COLON CAPITALIZATION, currently scoped to "this section and §2b Key Benefits") is
   what carries the obligation forward. Recorded so the relabel is understood as load-bearing
   coverage rather than a tidy-up — which reinforces, rather than weakens, the RELABEL-DO-NOT-DELETE
   instruction already in both artifacts.
4. **Two of the three sweep counts in the published artifacts are slightly off.** Re-run here:
   `table` is 22 matching lines (21 at a word boundary, after `byte-stable` at `:5`) against a
   claimed 20; `§3` is 12 lines against a claimed 11; `§6` is **1** occurrence against a claimed 3.
   The numeral sweep — the load-bearing one — is exact (3/2/2/2 at the cited lines). Every extra
   `§3` line was triaged here and none is a reversed rule. Under the invariant framing the counts
   are bookkeeping and the invariants are scope, so nothing is at risk; but a reviewer re-running
   the sweeps should expect the small deltas rather than read them as a discrepancy.
5. **`so-builder` must walk the breakdown in execution order, not id order** (NBF-3 above). A naive
   ascending walk runs T13 last, placing it after T12's FROZEN gate — which would both mis-sequence
   the `<ol>` work and make the §9 stop block a task that does not depend on it.
6. **`TEST_WRITING` carries C-1's cross-stage half** (NBF-1 above), and the constraint is narrower
   than it first looks: `safeParse` takes `unknown`, so V2 and V12 need no typed `'4.0'` document.
   Only V3, V14 and V15's `'4.0'` half feed `renderDescription` and therefore need the type, and
   only they are constrained by C-1.
7. **Specification traceability nit, changing no work.** FR-30 appears in the AC-3 and AC-11 rows of
   the Specification's matrix *and* in a "(system-level) — No AC names it" row. Either reading
   leaves FR-30 reached (D16, V13, T3). Recorded for the Specification's next revision; explicitly
   not a reason to route to `SPECIFICATION`.
8. **Carried from v1 and still true:** the impact analysis's `task-a.ts` rows (§1.1 row 3, Hazard 4
   bullet 1) are wrong and are correctly handled as a non-blocking finding rather than a loop-back;
   `test/fixtures/v4-docs.ts` remains a sound task-level location choice on the coverage-floor
   argument; D8's recorded `checkLeadInCapitalization` coverage change is a finding, not a defect.
   v1's non-blocking items 1 (`:356`) and 2 (`scaffold-doc.mjs`) are both **closed** in v2 — `:356`
   is inside NI-4, and the scaffolder has a stated disposition.
