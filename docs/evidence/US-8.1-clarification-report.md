---
artifact: clarification_report
story: US-8.1
version: 1
status: DRAFT
owner: so-clarifier
created_at: 2026-10-14T14:00:00Z
updated_at: 2026-10-14T14:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# US-8.1 - Clarification Report (v1)

**Verdict: Ready for Specification.** No Open Decision is `blocking: true`. Nine are recorded as non-blocking in
`docs/decisions/US-8.1-open-decisions.md` (v1); each carries a default a specification may state and the human may overturn at
HUMAN_SPEC_APPROVAL. Two of the nine (OD-1, OD-2) are the Story's own open questions Q1 and Q2.

## What is clear

- **Actor, trigger and value.** A content operator; the FAQ is one artifact per run instead of N independent ones; `<b>` replaces
  `<strong>` in FAQ HTML; a FAQ-only tool exists. The Story is a mixed bug and feature with Observed, Expected and Reproduction.
- **Acceptance criteria.** AC-1 to AC-20 are observable and stub-checkable; operator decisions on v1 Q1 to Q4 are folded in
  (Context, "Human decisions"). Weak spots are mechanism gaps, not falsifiability gaps (OD-3, OD-4).
- **Store scope.** All seven `STORE_REGISTRY` keys in the Story (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`,
  `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`) match the registry exactly. Every store lists `uk-UA` in `languages`, and the
  smallest store (`Drukarka 3D`: `pl-PL`, `uk-UA`) still has N = 2, so AC-1's "N >= 2" holds for every store. The reproduction
  store `EXPERT3D` has `en-ES, es-ES, pt-PT, uk-UA` as the Story states. No currency or locale in the Story conflicts with the
  registry; no currency is named, and the FAQ prompt already takes `currencySymbol` from the registry.
- **uk-UA fan-out.** Examined explicitly. The Story declares uk-UA the master (as for descriptions, AGENTS.md section 3 pipeline) and
  every other locale a translation of it, so a master-FAQ change reaches every language by design. This matches the project rule that uk-UA
  is generated natively, not translated into. Per-language SEO and slug generation is explicitly out of scope and unchanged.
- **Generated-HTML impact.** The FAQ artifact only (`h3`, `p`, `b`, `ul`, `li`). AGENTS.md section 4 criteria in play: unit spacing
  (`1.75 mm`), no anglicisms in non-EN output, HTML only (no Markdown, no `<br>` spacing), and no `FAQPage` itemtype in the artifact
  (the Journal module emits it; `validateGeneratedHtml` flags it). Not in play: `schema.org/Product`, spec-count parity, figure and
  figcaption rules, video survival, SEO length limits. The Story states description criteria are not changed.
- **Prompt impact and FROZEN status.** `task-faq.ts` is not FROZEN. `task-c.ts` IS FROZEN and the Story records the operator's
  explicit "modify `src/prompts/task-c.ts`" permission (2026-10-14), `--rebaseline` and `.arch-guard-checksums` in the same commit
  (AC-20); no other FROZEN file is authorised and the Story says a need for one is a new section 9 stop. `bash arch-guard.sh`
  currently passes with all five checksums unchanged, so AC-20 starts from a clean baseline. `output-validator.ts` stays unedited,
  which pushes any new FAQ validation into a sibling module (OD-4).
- **Generation invariants.** Spec-count, figure and video invariants are not reachable from a FAQ. Structural isomorphism between
  master and translation is the invariant at risk here (AC-3, AC-17); its tag set is unsettled (OD-3).
- **Dependencies.** US-6.2 (`<b>`/`<strong>` for descriptions) is related and archived; nothing here depends on it. US-7.1 (protected
  product names) interacts with the FAQ translation call (OD-6). `test/render-reconciliation.report.md` concerns the
  `ProductDescriptionDoc` renderer; FAQ is not in that pipeline, so nothing in its section 3 or 5 blocks this Story.
- **Track.** The front matter says `angular`. The work also edits a prompt (`task-faq.ts`, FROZEN `task-c.ts`) and a service. The
  task breakdown must assign a per-task track and the prompt-track FROZEN stop applies to the `task-c.ts` task.

## What remains ambiguous (non-blocking Open Decisions)

| id | Topic |
|---|---|
| OD-1 | "3 attempts" vs the repair gate budget; dropped master; AC-1 "exactly one call" vs retries (Story Q1) |
| OD-2 | FAQ-only vs product-wide `<strong>` ban (Story Q2) |
| OD-3 | Parity tags: Story says `h3`/`ul`/`li` in Scope and `h3`/`p`/`li` in AC-3; `h3` and `li` are already counted, `p` and `ul` are not; FAQ-scoped or global |
| OD-4 | Definition of "valid HTML"; empty master response (allowed by the prompt, an error to the validator); enforcer for AC-9 |
| OD-5 | Task C FAQ recognition and which description-only blocks (closing H2, delivery, H1 LOCK, spec labels) are dropped |
| OD-6 | FAQ translation model tier, normalizers, validators, protected-name block |
| OD-7 | Bold placement policy, `<b>` preservation in translations, `<strong>` conversion ordering and attributes |
| OD-8 | Operator-visible report of a skipped language or dropped FAQ |
| OD-9 | Standalone tool inputs, tabs, state reset, history restore |

## Findings for the Story author (not Open Decisions; the Story is not edited by this stage)

- The Scope and Context sentence "extended to cover `h3`, `ul` and `li`" and AC-3/AC-19 ("`h3`, `p`, `li`") disagree; `h3` and `li`
  are already in `COUNTED_TAGS`. Consider aligning the wording when convenient (OD-3 holds the question either way).
- AC-1 and AC-14 say "exactly one call" while AC-16 allows up to 3; the AC text is correct only for a first-valid-response case.
- The Story's `Reproduction` section says the es-ES and pt-PT FAQs contain `<strong>`; AC-7 tests the stub-model case only. No
  recorded live-model run is required; a manual run would be release evidence, as in US-6.2.
- The Story is large (bug fix, new mode, FROZEN edit). It is cohesive (one artifact, one pipeline) and was not judged to be several
  unrelated changes, so it is not treated as needing amendment.

## Previous-run items

None: there was no earlier clarification for US-8.1.
