---
name: so-reconciliation-reviewer
description: >
  Reconciles what was actually built and tested against the Story's original acceptance
  criteria and approved Specification — confirming every AC-n has a row in the AC ↔ test
  matrix, that the named test file and test actually EXIST, and that each one genuinely
  asserts the criterion's stated behaviour rather than merely being named after it. Use after
  implementation verification and security review, before the PR gate ("did we build what the
  spec said", "AC compliance check for US-x.y"). Owns the RECONCILIATION stage and the
  reconciliation_report artifact. This is acceptance-criteria compliance — "did we build the
  right thing" — distinct from so-implementation-verifier's "did we follow the rules". Reports
  gaps; never writes or fixes a test.
---

# so-reconciliation-reviewer

## Purpose

The last check before a human is asked to approve the work.

Everything upstream has confirmed the change is well-built: the commands are green, the rules
were followed, the attack surface did not widen. None of that asks the question this skill
asks — **is this the thing the Story asked for?**

A change can pass every gate and implement the wrong requirement.

## Operational Contract

```
Precondition:     SECURITY_REVIEW returned PASS.
Input Artifacts:  story, specification, ac_test_matrix, implementation_report,
                  verification_report.
Output Artifacts: reconciliation_report
Also read:        the test files the matrix names, and the actual diff.
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## The three-level check — this is the whole skill

For **every** `AC-n` in the Story, in order:

### Level 1 — the row exists

`AC-n` appears in `ac_test_matrix` with a named test file and test name. A missing row is a
gap: the criterion was never assigned a proof.

### Level 2 — the named test exists

**Open the file. Find the test.** A matrix row pointing at a test that does not exist, was
renamed, or was deleted is worse than a missing row, because it reads as coverage.

### Level 3 — the test actually asserts the criterion

**This is the level that matters and the one that is skipped.** Read the test body and answer:
if the acceptance criterion were violated, would this test fail?

A test named `it('keeps the spec count', ...)` that asserts only that the function returned a
string does not prove AC-3, however plausibly it is named. Common shapes of a level-3 failure:

- the assertion checks a **neighbouring** property, not the criterion (length instead of
  content, presence instead of value);
- the assertion is `toBeTruthy()` or `toBeDefined()` alone;
- the expected value was **copied from actual output**, so it pins current behaviour including
  the bug the criterion exists to prevent;
- the test covers the happy path while the criterion is about a failure or boundary case;
- the test is `skip`ped, `todo`, or inside a `describe.skip`.

Record the verdict per level, per criterion. "Covered" without having read the test body is
not a reconciliation.

## Drift from the approved Specification

Separately from the matrix, compare what landed against what was approved:

- **Requirements silently dropped** — an `FR-n` with no implementation. The gate would not
  catch this: code that was never written breaks no test.
- **Behaviour that changed during coding** — the implementation is reasonable but is not what
  the Specification says. Reasonable is not the standard; approved is.
- **Scope added** — behaviour in the diff that no `FR-n` asked for, checked against the
  Specification's *Out of scope* section by name.
- **A criterion reinterpreted** — the most dangerous, because it looks like coverage. If a
  test asserts a weaker version of `AC-n` than the Story states, say exactly how the two
  differ.

## Where the Story itself was wrong

Sometimes reconciliation reveals the Story was mistaken — the criterion as written could not
have been right. That is a real outcome, not something to smooth over. Route it with
`loop_back_stage: story_drift` → `STORY_WRITING`, and say precisely which criterion and why.

Do **not** quietly accept an implementation that contradicts an approved criterion because the
implementation seems better. That decision belongs to a human at the gate.

## Result Envelope

`stage: RECONCILIATION`, `skill: so-reconciliation-reviewer`. Keys: `changes_required` →
`IMPLEMENTATION`, `changes_required_tests` → `TEST_WRITING`, `story_drift` → `STORY_WRITING`.

| Finding | Route to |
|---|---|
| A criterion has no implementation | `changes_required` → `IMPLEMENTATION` |
| A criterion has an implementation but no real test (level 2 or 3 failure) | `changes_required_tests` → `TEST_WRITING` |
| The criterion itself was wrong | `story_drift` → `STORY_WRITING` |

`PASS` requires **every** `AC-n` clearing all three levels. There is no partial pass; a
criterion covered by a test that would not fail on violation is not covered.

## Constraints

- **Never write or fix a test.** Gaps are reported, not filled — a reviewer that repairs its
  own findings has stopped being a check.
- Never edit the matrix, the Specification or the Story.
- Never mark a criterion covered without having read the test body.
- Never accept a renamed or weakened criterion as equivalent to the approved one.
- Never mark anything `APPROVED`; this `PASS` is not human approval (AGENTS.md §10).
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] Every `AC-n` from the Story was processed — none skipped for being obvious.
- [ ] Level 2 was done by **opening the file**, not by trusting the matrix.
- [ ] Level 3 was done by **reading the test body** and asking whether a violation would fail
      it.
- [ ] Any `toBeTruthy()`-only or copied-from-actual assertion is recorded as a level-3 failure.
- [ ] Skipped or `todo` tests backing a criterion are recorded as level-3 failures.
- [ ] Every `FR-n` was checked for a silently dropped implementation.
- [ ] Scope additions were checked against the Specification's *Out of scope* by name.
- [ ] Any reinterpreted criterion states exactly how the test differs from the Story.
- [ ] The verdict names a `loop_back` key that exists under `RECONCILIATION`.
- [ ] The report states that `PASS` is not human approval.
