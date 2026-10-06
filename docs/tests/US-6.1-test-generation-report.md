---
artifact: test_generation_report
story: US-6.1
version: 2
status: DRAFT
owner: so-test-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T13:00:00Z
supersedes: docs/tests/US-6.1-test-generation-report.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Test generation report - US-6.1

## Files

| File | Change | Tests |
|---|---|---|
| `src/app/components/html-editor/editor-html-pipeline.spec.ts` | unchanged since v1 | 49 cases |
| `src/app/components/html-editor/extensions/round-trip.spec.ts` | v1 added 8 cases; v2 appended describe `genericBlock - wrapper style is returned verbatim (US-6.1 AC-2, plan v2 D6)` (6 cases). No existing assertion changed | 14 new cases |

No implementation, fixture, frozen file or workflow-state file was edited.

## v2 coverage check against plan v2

| Plan v2 addition | Covered before v2? | Action |
|---|---|---|
| Wrapper `style` verbatim for N = 2 and N = 3 (`margin: 0 auto`) | Yes: `WRAPPER_STYLES[1]` in the N = 1/2/3 test (red for N = 2, 3) | none |
| Same, independent of an iframe | No | added 3 cases: `margin: 0 auto;`, `max-width: 1200px; width: 100%; margin: 0 auto;`, `... margin: 4px auto;` |
| class, id, itemprop, itemtype, itemscope unchanged | Partly (microdata and class existed; `id` and mixed combination did not) | added `keeps class, id, itemprop, itemtype and itemscope unchanged on a div and a section` |
| Null attribute values skipped | No | added `skips null attributes` (bare div has zero attributes) and `skips only the missing attributes` |

## Observed output (real runs, 2026-10-06, after the edits above)

`npx vitest run src/app/components/html-editor`:

```
Test Files  1 failed | 6 passed (7)
     Tests  4 failed | 106 passed (110)
```

Whole logic suite `npx vitest run`:

```
Test Files  1 failed | 163 passed (164)
     Tests  4 failed | 4565 passed | 3 skipped (4572)
```

The 4 failures, all in `round-trip.spec.ts`, all the right reason (style re-serialised by `cssText`):

```
FAIL ... keeps the iframe attributes and the wrapper divs for N = 2 wrappers (and N = 3)
  Expected: "max-width: 1200px; width: 100%; margin: 0 auto;"
  Received: "max-width: 1200px; width: 100%; margin: 0px auto;"
FAIL ... genericBlock - wrapper style is returned verbatim > does not re-serialise the style of a plain wrapper div: margin: 0 auto;
  AssertionError: expected 'margin: 0px auto;' to be 'margin: 0 auto;'
FAIL ... genericBlock - wrapper style is returned verbatim > ... max-width: 1200px; width: 100%; margin: 0 auto;
  Received: "max-width: 1200px; width: 100%; margin: 0px auto;"
```

Green now: all 49 `editor-html-pipeline.spec.ts` cases (T1 and T2 guards, and the T3-labelled parity cases, because
`embed-iframe-node.ts` exists uncommitted in the working tree), the N = 1 case, two chains, edit elsewhere, sibling
text, typing, determinism, the existing figure test, and the 3 non-style genericBlock guards. Happy-dom prints
"Iframe page loading is disabled" DOMException lines to stderr for iframes with off-list or fake hosts; they are
noise from happy-dom, not test failures.

## Notes and gaps

- The "T3 genuinely red" expectation holds only for the `genericBlock` style edit. The `embedIframe` node already
  exists in the working tree (untracked), so its tests are green; the orchestrator should treat that file as
  builder work in progress, not as a test-writer artifact.
- `embedIframe` is located by `type.name === 'embedIframe'` in the FR-13 tests; a rename needs a test-writer loop-back.
- Corpus gap: `test/fixtures/corpus/` has no iframe wrapper case; not needed. No new fixture created.
- Coverage gap: call-site wiring in `html-editor.component.ts` has no automated test (human decision D9).
- `lint` was not run on the specs in this stage.
- Determinism: no sleeps, no network, no randomness.
