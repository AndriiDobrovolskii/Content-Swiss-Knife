---
artifact: impact_analysis
story: US-3.1
version: 6
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-09-22T14:03:55Z
updated_at: 2026-09-29T23:00:00Z
supersedes: docs/impact-analysis/US-3.1-impact-analysis.md#5
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Impact Analysis: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**v6, superseding v5.** v5 recorded `inputs_consumed: specification version 19`; the Specification is now
v20 (`APPROVED`), which adds **FR-14 / AC-7** (`cta.heading`'s non-empty requirement is
`schemaVersion`-conditional). Per `artifact-schema.md`, v5 was stale on approval of v20. `open_decisions`
is still v4 (non-blocking). v1-v5's substance for FR-1..FR-13 is carried forward by reference (this
revision does not re-survey unchanged requirements); where v5 is now factually stale on *implementation
status*, it is corrected below.

## What changed this round

### 1. FR-14 delta: one genuinely new file enters the survey, plus a consumer fan-out to re-verify

Re-verified live (not taken from `pipeline_status` v11 / `implementation_plan` v12 §4c):

- `src/domain/description-doc.schema.ts:216` — `cta: z.object({ heading: NonEmpty, text: Prose })` is the
  single mechanism that rejects an empty `cta.heading` for every `schemaVersion` (`schemaVersion:
  z.enum(['3.0','4.0'])`, line 179, on the same `z.object`; the object is followed by a `superRefine`, so a
  `schemaVersion`-conditional constraint is expressible without a new file). **This is the only file
  FR-14 must change** (matches the Specification's own "no file outside `description-doc.schema.ts`").
  Which Zod mechanism to use is `so-planner`'s decision, not this stage's.
- `src/render/render-description.ts:443-449` — confirmed: `isV4` discards `doc.cta.heading`
  (`getRenderRules(...).ctaHeading(...)`); non-`isV4` branch reads it verbatim (line 449). No change
  needed; it is the evidence, and it is why (b) (`'3.0'` unchanged) matters.
- `src/prompts/task-a-doc.ts:148-150` and `src/prompts/simplified-template-blocks.ts:219` — both tell the
  model the heading is discarded. **Neither is FROZEN** (`task-a-doc.ts` is the sibling of frozen
  `task-a.ts`). Prompt text needs no change; the model is already behaving as designed.
- `src/domain/description-doc.ts:168` — TS type `cta: { heading: string; text: Prose }`. An empty string
  is still a `string`, so **no type change is implied** unless the planner chooses to make `heading`
  optional/absent for `'4.0'` (see Unknown #12).

**Consumers of `doc.cta.heading` that will now see `''` on real v4 Docs** (all re-derived by `grep -rn
"cta\.heading"` over `src test server`); none is a required edit, all are re-verification targets:

| Consumer | What it does with the value | Impact |
|---|---|---|
| `src/utils/heading-style.ts:479` (`collectHeadings`), used by `validateHeadingStyleDoc` (lines ~507-563) | pushes `{text: doc.cta.heading, path:'doc.cta.heading'}`; `blessedClosing` located by that path; text is `.replace(...).trim()`-ed via `?? ''` | An empty CTA heading is a heading with no product name: FR-6 stuffing cannot fire, and FR-7's `heading-brand-core-missing` already reads `doc.localizedName` for `'4.0'` (v10+), so no new finding is expected. Re-verify only. |
| `src/utils/tov-second-person.ts:224` | pushes span `{path:'cta.heading', text}` into the ToV scan | Empty string scans clean; **an absent key (`undefined`) could throw** depending on the scanner. Re-verify. |
| `src/render/doc-prose-transforms.ts:134` | `fn(doc.cta.heading)` maps every prose field | Safe for `''`; **not safe for `undefined`** if `fn` assumes a string. Re-verify. |
| `src/utils/repair-strategy.ts` (comments lines 43-57, 401), `src/utils/repair-gate.ts:155, 264` | document that `doc-schema` and `heading-brand-core-missing` both fired on `doc.cta.heading` and the T13 missing-key rung | FR-14 removes exactly the `'4.0'` `doc-schema` finding on this leaf that T13/T14 were partly built around. Must **not** remove the `'3.0'` finding: the `doc-schema` repair path for `doc.cta.heading` on `'3.0'` must keep the same `path` string (`cta.heading`) so `REPAIR_STRATEGIES` targeting still resolves. |
| `src/render/render-description.ts:443-449` | see above | Unchanged. |
| `src/domain/description-doc.completeness.ts:132-139` | checks the `cta` object exists (§8), not the heading | Unaffected. |
| `test/fixtures/simplified-docs.ts:109,259` | `cta: { heading: 'ignored', ... }` on every `'4.0'` builder | Pass under both old and new schema; not a problem, but not an empty-heading fixture either. |

Not a consumer: `server/**` (no `cta.heading` hit). Store/locale-agnostic (the field is per-`schemaVersion`,
not per-store).

### 2. Tests exercising the FR-14 surface (AC-7)

Files that reference `cta.heading`/`cta: { heading` and therefore need re-run for regression when the
schema changes (logic runner): `src/domain/description-doc.schema.spec.ts`,
`src/domain/description-doc.schema.v4.spec.ts` (the natural home for a `'4.0'` empty-heading case; it
does not itself match the grep but holds v4 schema tests), `src/domain/description-doc.schema.simplified.spec.ts`,
`src/render/doc-schema-issues.spec.ts`, `src/render/doc-repair-recovery.spec.ts`,
`src/render/doc-prose-transforms.spec.ts`, `src/render/render-description.node.spec.ts`,
`src/utils/heading-style.spec.ts`, `src/utils/repair-gate.spec.ts`, `src/utils/repair-strategy.spec.ts`,
`src/utils/tov-second-person.spec.ts`, `src/prompt-core/v4-headings.spec.ts`,
`src/services/content-orchestrator.doc-gate.spec.ts`, `src/services/content-orchestrator.simplified.spec.ts`,
`test/render-conformance.spec.ts`, `test/tools/scaffold-doc.spec.ts` (asserts `doc.cta.heading` equals a
`TODO` scaffold value — `test/tools/scaffold-doc` output must still validate; re-verify), plus the
other `cta.heading`-referencing specs found by the grep (`doc-tier`, `doc-block-repair`, `sentence-length`,
`specs-grounding`, `spec-count-parity`, `spec-category-shape`, `alt-numeric-fidelity`,
`bullet-lead-punctuation`). Any existing test that asserts a `doc-schema` finding **on `cta.heading` for a
`schemaVersion: '4.0'` fixture** (an empty/absent heading) would now be asserting the defect FR-14
removes; `grep -rn "heading: ''" src test` returned no hits, so none was found, but absent-key cases
(`delete doc.cta.heading`) were not exhaustively enumerated (Unknown #13). All new tests land in the
**logic runner**.

### 3. Implementation-status drift in v5 (corrected)

v5 stated `T13`, `T14`, `T15` "unattempted." **This is now false.** `git log` shows `a16ddbd` (T13/T14:
repair-gate missing-field/fresh-regen retries), `4a7f806` (T15: long-h1 `meta_title` fallback), and
status commits through `54e5fa6` (`pipeline_status` v11). Live source confirms: `src/utils/repair-gate.ts`
now has the `missing` branch in `applyTier` (line ~264-273); `isH1Unreachable` matches in
`src/utils/seo-metadata-shape.ts`; `src/utils/seo-metadata-shape.long-h1.spec.ts` exists (untracked).
Working tree also carries uncommitted edits to `content-orchestrator.doc-gate.spec.ts`,
`content-orchestrator.repair-field-wiring.spec.ts`, `repair-gate.spec.ts` (+422 lines). This
revision did not re-run the full suite (v5's 148-file green run predates T13-T15; `pipeline_status` v9
records "full suite green" after them). Consequently v5's "Still outstanding" and "Test files needing a
genuinely new update" sections for T13/T14/T15 are superseded: that work is landed; only FR-14 remains
un-implemented. `src/utils/seo-metadata-shape.spec.ts` gaps v5 listed were addressed by the new
`.long-h1.spec.ts`.

## FROZEN-file impact (AGENTS.md §9)

**FR-14 touches no FROZEN file.** `description-doc.schema.ts` is not frozen. FR-14 reaches none of
`task-{a,b,c}.ts`, `master-system-prompt.ts`, `output-validator.ts`. Prior authorizations (Story D3, OD-3,
OD-7, OD-9 for `master-system-prompt.ts`, `task-a.ts`, `task-b.ts`) are unchanged and their edits are
landed (v5). `output-validator.ts` and `task-c.ts` remain unedited. Not re-run this round:
`bash arch-guard.sh` (v5 recorded clean; no frozen file is in FR-14's footprint).

## Affected files

**Must change (new this round — FR-14/AC-7):** `src/domain/description-doc.schema.ts` (line 216, `cta`
object; `ProductDescriptionDocSchema`, and its `superRefine` if used).

**Must change (already landed, per v5 + above):** `content-orchestrator.service.ts`, `repair-gate.ts`,
`heading-style.ts`, `slug-validator.ts`, `repair-strategy.ts`, `seo-metadata-shape.ts`,
`doc-schema-issues.ts`, `app.component.ts`, `zip-generator.ts`, and the three FROZEN prompt files.

**Needs re-verification:** the consumers table in section 1 (`heading-style.ts`, `tov-second-person.ts`,
`doc-prose-transforms.ts`, `repair-strategy.ts`, `repair-gate.ts`, `description-doc.ts`), and
`src/domain/description-doc.completeness.ts`.

**Tests that cover them:** section 2. Logic runner only; component runner: none identified.

## Hazard table

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | Does not apply to FR-14 (applies indirectly to the rest of the Story, per v5 re-derivation) | Searched: `grep -rl STORE_REGISTRY src server` — consumers: `app.component.ts`, `constants.ts`, `doc-pipeline-flag.ts`, `store-render-rules.ts`, `render-description.ts`, `language-consistency.ts`, `output-validator.ts`, `table-finalize.ts` and specs; `server/` empty. `description-doc.schema.ts` does not reference `STORE_REGISTRY`; FR-14's condition is `schemaVersion`, not store. (The v4 render path does call `getRenderRules(ctx.storeName)`, unchanged.) |
| 2 | uk-UA master vs translation | Applies, both directions, no asymmetry | Schema validation of the Doc runs on the Task-A uk-UA master (`schemaVersion` `'4.0'` Docs are the Doc pipeline's normal output) and on any translated Doc that is re-validated against the same schema. FR-14 relaxes a discarded field for every locale equally; it does not change which locales are generated. Direction: relaxing a master-side constraint affects every locale's downstream Doc. |
| 3 | prompt → schema → renderer → validator chain | Applies: **schema link only** | Schema (`description-doc.schema.ts`) changes; prompt already says the heading is discarded (no change); renderer already discards it (no change); validators (`heading-style.ts`, `tov-second-person.ts`) receive `''` and need re-verification, not editing. This is the one link where prompt/renderer already agree with the intended behaviour and the schema is the lone outlier. |
| 4 | FROZEN files | Does not apply to FR-14 (see loud section; prior FROZEN edits landed) | `git status` shows no frozen file modified; FR-14's footprint is one non-frozen file. |
| 5 | Corpus conformance harness | Applies, no movement | `test/fixtures/corpus/` still two items (Ortur H20 20 W, two stores) per `render-reconciliation.report.md` §5. Both are `schemaVersion '3.0'` (v5 finding) so their non-empty `cta.heading` is exactly the unchanged FR-14(b) case; no fixture moves. **Coverage gap:** the corpus has no `'4.0'` triple, so no corpus fixture exercises FR-14(a); `so-test-writer` needs a synthetic one (v4 builders in `test/fixtures/simplified-docs.ts` are the nearest source, but carry `'ignored'`, not `''`). |
| 6 | Two test runners | Applies; logic runner | All impacted specs are non-`.component.spec.ts`. |
| 7 | Server-side surfaces | Does not apply | Searched `grep -rn "cta.heading" server`: none. FR-14 sits in `src/domain`. |

## Silent-failure risks (no error raised)

1. **Over-relaxing the schema.** If the chosen mechanism loosens `cta.heading` for `'3.0'` (e.g. making
   it globally optional or dropping `NonEmpty`), a real `'3.0'` Doc ships with an empty `<h2>` and no
   validator fires (`heading-style` cannot flag a heading with no product name). This is the AC-7(b)
   silent regression; only a test asserting `'3.0'` empty/missing heading still fails will catch it.
2. **Making `heading` absent rather than empty for `'4.0'`** without checking `tov-second-person.ts:224`
   and `doc-prose-transforms.ts:134`: a downstream throw or `undefined` text, only on the v4 path.
3. **Losing the `cta.heading` finding path** for `'3.0'` such that `REPAIR_STRATEGIES`/T13's missing-key
   rung no longer resolves it (changed `path` string) — the field-scoped repair silently degrades to
   full regeneration.
4. FR-14 changes the *rate* of `doc-schema` findings on v4 real runs (fewer wasted attempts); a test
   that implicitly relied on that attempt being spent (e.g. counting repair calls in
   `content-orchestrator.doc-gate.spec.ts` with an empty v4 heading) could shift without a compile error.
5. Carried forward from v5 and still live for the landed T15: `normalizeLongH1MetaTitle` can mask an
   `h1`-level defect as a valid `meta_title` (scope-correct).

## Fixture and corpus impact

No corpus fixture moves. No fixture currently expresses `'4.0'` + empty `cta.heading`; `so-test-writer`
must build one (and a `'3.0'` empty/missing negative). `test/fixtures/simplified-docs.ts` needs no edit.
`test/tools/scaffold-doc.spec.ts` (TODO-valued `cta.heading`) is re-verify only.

## Blast-radius summary

FR-14 is a one-file schema change (`src/domain/description-doc.schema.ts`, `cta` object) with a
re-verification fan-out onto four validator/transform consumers of `doc.cta.heading`
(`heading-style.ts`, `tov-second-person.ts`, `doc-prose-transforms.ts`, `repair-strategy.ts`/`repair-gate.ts`
comments and path resolution) and about two dozen specs that build a `cta.heading`. It touches no FROZEN
file, no store, no prompt, no renderer, no server code, and no corpus fixture; only the schema link of
the prompt→schema→renderer→validator chain moves. The main planning risk is not reach but direction:
relaxing `'4.0'` without loosening `'3.0'`, and choosing empty-string vs absent-key semantics. The rest of
the Story (T1-T15) is landed; v5's "still outstanding" list is obsolete. All seven hazards were checked;
only hazard 3 (schema link) and hazard 5 (coverage gap) meaningfully apply to FR-14.

## Unknowns

1. *(v1-v11 unknowns 1-7 resolved per v5; 8, 9 carried forward unchanged: `simplified-docs.ts`
   `localizedName` shape-test coverage; unit-script difference between the two corpus fixtures. Non-blocking.)*
10. Whether any real product beyond the one cited 2026-09-28 regeneration reaches `h1Len >= 54` —
    carried forward from v5; does not block, `FR-8(b)`'s proof is closed-form.
11. *(v5's #11, which spec file hosts the `normalizeLongH1MetaTitle` wiring test, is moot: T15 landed.)*
12. **Empty vs absent `cta.heading` for `'4.0'`**: FR-14(a) says "may be empty (or otherwise absent of
    enforced content)". Whether a *missing key* must also pass validation is not stated. Settles: the
    planner's chosen mechanism; determines whether `tov-second-person.ts`/`doc-prose-transforms.ts`
    need hardening.
13. **Absent-key test cases for `doc.cta.heading` on `'4.0'` fixtures** in the ~20 referencing specs were
    not exhaustively enumerated (only `heading: ''` was grepped). Settles: running the suite after the
    schema change, or a targeted grep at `TEST_WRITING`.
14. **Full suite not re-run this round**; post-T15 green status is taken from `pipeline_status` v9, not
    re-verified here.
