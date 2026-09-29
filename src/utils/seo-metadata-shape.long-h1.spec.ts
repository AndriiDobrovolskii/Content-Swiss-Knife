/**
 * seo-metadata-shape.long-h1.spec.ts
 *
 * US-3.1 T15 (FR-8(b), AC-4; Implementation Plan D15, §2.4/§2.4.1). Kept as a SEPARATE sibling file
 * from `seo-metadata-shape.spec.ts` rather than an extension of it — a deliberate `so-test-writer`
 * placement decision, not the literal "(extended)" the Task Breakdown names. `normalizeLongH1MetaTitle`
 * does not exist yet on `src/utils/seo-metadata-shape.ts`; importing an as-yet-unexported name into
 * the EXISTING 24-test green file risks taking its whole module load down with it (a "cannot resolve
 * import" failure, not a clean assertion mismatch) and would put those 24 already-passing tests at
 * risk of a false regression report. Isolating the new, red T15 coverage in its own file means the
 * existing file's own green suite is provably unaffected by this round, and this file's own red state
 * is unambiguously about T15's still-unimplemented exports, not an accidental collateral break.
 *
 * `isH1Unreachable`, `computeLongH1MetaTitle` and `DASH_TAIL` are module-private per Implementation
 * Plan §4.1's own design — every case below is expressed through the module's two EXPORTED entry
 * points, `normalizeLongH1MetaTitle` and `validateSeoMetadataShape` (plus, for the ceiling-drift
 * characterization, the existing FROZEN, already-exported `validateSeoMetadata`). No `export` is
 * added to any private symbol to make a test easier to write — Task Breakdown T15's own explicit
 * constraint.
 *
 * A guard assertion (`expect(typeof normalizeLongH1MetaTitle).toBe('function')`) opens the first
 * test in each new describe block, mirroring this Story's own established `toBeDefined()`-style
 * first-assertion-guard precedent (`repair-strategy.spec.ts`'s `'is error severity by
 * construction'` test) — if the export is missing, every test fails on a clean, readable assertion
 * ("expected undefined to be 'function'") rather than a `TypeError: X is not a function` buried
 * inside the test body.
 *
 * Naming/boundary discipline, per Plan Review v9 §4's own explicit instruction to TEST_WRITING:
 * `FR-8(b)`'s prose says the word-boundary search happens "within its first 50 code points of h1",
 * but the live design's `SAFE_CORE_LENGTH` is 49 (49 + 1-code-point mark = 50 total). Plan Review v9
 * independently proved (worked arithmetic, §4.1) that no h1 exists for which this costs a genuinely
 * available, ≤50-total-compliant boundary cut — the imprecision is in the Specification's own prose,
 * not in the code. Nothing below asserts a literal "50-code-point window"; every assertion is the
 * OUTCOME FR-8(b) itself requires: ≤50 total length, ends in "·", the core is a genuine, unmodified
 * PREFIX of h1, and — via the closed-form sweep — no h1Len is left without a validator-accepted value.
 */
import { describe, it, expect } from 'vitest';
import { validateSeoMetadataShape } from './seo-metadata-shape';
import * as seoMetadataShapeModule from './seo-metadata-shape';
import { validateSeoMetadata } from './output-validator';
import type { SeoResponse } from '../app/types';

/**
 * T15's own not-yet-existing export (`normalizeLongH1MetaTitle`). A static named import
 * (`import { normalizeLongH1MetaTitle } from './seo-metadata-shape'`) would fail `npm run lint`
 * AND break `npm run test:components`'s full-program Angular build for EVERY file in the suite,
 * not merely this one (confirmed empirically this round) — a far more severe collateral break than
 * this file's own, intentionally red, `test:logic` state. Accessed instead via a runtime property
 * lookup on the module namespace, narrowed to the real, exact signature the Task Breakdown's own
 * Files table specifies — the same `as unknown as <narrow interface>` idiom this Story's own
 * `content-orchestrator.doc-gate.spec.ts` (`asDocGate()`) already uses to reach a not-yet-public
 * surface. This is NOT an `any` escape: every call site below is fully typed against
 * `NormalizeLongH1MetaTitle`, and the runtime behaviour (`undefined` until so-builder adds the real
 * export) is identical to what a static import would have produced.
 */
type NormalizeLongH1MetaTitle = (h1: string, currentMetaTitle: string) => string;
const normalizeLongH1MetaTitle: NormalizeLongH1MetaTitle =
  (seoMetadataShapeModule as unknown as { normalizeLongH1MetaTitle: NormalizeLongH1MetaTitle })
    .normalizeLongH1MetaTitle;

const seoOf = (h1: string, meta_title: string, language = 'en-US'): SeoResponse => ({
  site_name: 'StoreName',
  seo_data: [{ language, h1, meta_title, meta_description: 'd ➔' }],
});

const shapeIssues = (seo: SeoResponse) =>
  validateSeoMetadataShape(seo, 'SEO meta').filter(i => i.rule === 'meta-title-template-shape');

/**
 * Builds an ASCII, word-boundary-friendly h1 of EXACTLY `len` Unicode code points — `.length` and
 * `Array.from(...).length` agree for pure ASCII, so this can be measured either way without risking
 * a surrogate-pair miscount. Spaces recur every 5th character, so a word boundary exists well
 * within the first 49 code points for any `len >= 5`.
 */
function h1OfLength(len: number): string {
  if (len <= 0) return '';
  const chunk = 'AAAA ';
  let s = '';
  while (s.length < len) s += chunk;
  return s.slice(0, len);
}

/** The shape FR-8(b) requires for every h1Len >= 54: a genuine, unmodified prefix of h1, plus
 *  exactly one trailing "·" mark, total length <= 50. */
function expectGenuineH1PrefixShape(h1: string, result: string): void {
  expect(result.endsWith('·')).toBe(true);
  expect(Array.from(result).length).toBeLessThanOrEqual(50);
  const core = result.slice(0, -1);
  expect(core.length).toBeGreaterThan(0);
  expect(h1.startsWith(core)).toBe(true); // a genuine, unmodified PREFIX — never an interior edit
}

describe('normalizeLongH1MetaTitle — boundary arithmetic (T15, FR-8(b))', () => {
  it('exists as an exported function (first-assertion guard — this whole file is red on import until so-builder adds it)', () => {
    expect(typeof normalizeLongH1MetaTitle).toBe('function');
  });

  it('is a no-op for h1Len = 53 — the reachable check\'s own last satisfiable length (D6, unchanged)', () => {
    const h1 = h1OfLength(53);
    expect(normalizeLongH1MetaTitle(h1, 'whatever the model produced')).toBe('whatever the model produced');
  });

  it('activates at h1Len = 54 — the first unreachable length under the widened threshold (the exact gap task_breakdown v8 found)', () => {
    const h1 = h1OfLength(54);
    const result = normalizeLongH1MetaTitle(h1, 'whatever the model produced');
    expect(result).not.toBe('whatever the model produced');
    expectGenuineH1PrefixShape(h1, result);
  });

  it.each([55, 56, 66])('produces a compliant, word-boundary-safe h1 prefix at h1Len = %i', (len) => {
    const h1 = h1OfLength(len);
    const result = normalizeLongH1MetaTitle(h1, 'whatever the model produced');
    expectGenuineH1PrefixShape(h1, result);
  });

  it('is deterministic — the identical h1 always produces the identical meta_title, regardless of the second argument', () => {
    const h1 = h1OfLength(60);
    const a = normalizeLongH1MetaTitle(h1, 'model attempt A');
    const b = normalizeLongH1MetaTitle(h1, 'a completely different model attempt B');
    expect(a).toBe(b);
  });
});

describe('validateSeoMetadataShape — meta-title-template-shape, the h1Len >= 54 regime (T15, FR-8(b))', () => {
  it('accepts exactly the value normalizeLongH1MetaTitle produces for an unreachable h1, and rejects every deviation from it', () => {
    const h1 = h1OfLength(66); // the real uk-UA length from the 2026-09-28 regeneration
    const expected = normalizeLongH1MetaTitle(h1, 'irrelevant — h1Len >= 54 ignores this argument');

    const passing = seoOf(h1, expected);
    expect(shapeIssues(passing)).toEqual([]);

    const deviations: Record<string, string> = {
      'missing the differentiation mark': expected.slice(0, -1),
      'bare h1, unmarked': h1,
      'an interior deletion inside the accepted prefix': expected.slice(0, 10) + expected.slice(15),
      'one code point over the <=50 ceiling': `${expected.slice(0, -1)}X·`,
    };
    for (const [reason, meta_title] of Object.entries(deviations)) {
      expect(shapeIssues(seoOf(h1, meta_title)), reason).toHaveLength(1);
    }
  });

  it('accepts computeLongH1MetaTitle\'s own output when the natural cut point is immediately preceded by trailing punctuation the deterministic cut strips (the h1Len=54 gap\'s sibling defect, closed by the equality-based validator)', () => {
    // "...Cloths, x100..." shaped h1: the word boundary right before "x100" sits right after a
    // comma cutOnWordBoundary's own trailing-strip regex removes. A literal `h1[core.length] === '
    // '` structural check (v8's own design) would have wrongly rejected this; the equality check
    // (v9/v10) accepts whatever the shared computation actually returns.
    const h1 = `${'Optical Cleaning Cloths, '.repeat(3)}x100`;
    expect(Array.from(h1).length).toBeGreaterThanOrEqual(54); // fixture premise
    const expected = normalizeLongH1MetaTitle(h1, 'irrelevant');
    expect(shapeIssues(seoOf(h1, expected))).toEqual([]);
  });

  it('accepts computeLongH1MetaTitle\'s own hard-clip fallback when h1 has no word boundary at all within the search window', () => {
    const h1 = 'X'.repeat(60); // one unbroken token, well past the unreachable threshold
    const expected = normalizeLongH1MetaTitle(h1, 'irrelevant');
    expect(shapeIssues(seoOf(h1, expected))).toEqual([]);
    // A property, not a pinned literal — which internal path truncateAtWordBoundary/
    // cutOnWordBoundary takes for this fixture is an implementation detail the equality-based
    // validator design deliberately no longer depends on.
    expect(Array.from(expected).length).toBeLessThanOrEqual(50);
    expect(expected.endsWith('·')).toBe(true);
  });

  it('[pin] MIN_DASH_TAIL, via the unchanged reachable-case behaviour at h1Len = 53: a 2-code-point dash tail is accepted, a shorter one is not', () => {
    // Exercises only the pre-existing (D6), UNCHANGED dash-tail branch — h1Len = 53 is below T15's
    // own h1Len >= 54 activation domain, so this passes identically before and after T15 lands.
    // Pins the reachable check's real minimum tail length WITHOUT importing the private DASH_TAIL
    // regex or MIN_DASH_TAIL constant directly.
    const h1 = h1OfLength(53);
    expect(shapeIssues(seoOf(h1, `${h1}-x`))).toEqual([]);      // MIN_DASH_TAIL's own minimum match (2)
    expect(shapeIssues(seoOf(h1, `${h1}-`))).toHaveLength(1);   // one code point short
    expect(shapeIssues(seoOf(h1, `${h1}- `))).toHaveLength(1);  // trailing space is not a real tail
  });
});

describe('MIRRORED_MAX_META_TITLE characterization — stays in sync with output-validator.ts\'s own FROZEN ceiling (T15)', () => {
  it('[pin] a 55-code-point meta_title passes the FROZEN meta-title-length check; a 56-code-point one fails it', () => {
    // NO_CURRENCY_CHECK (content-orchestrator.service.ts:99) is '' — the currency check is
    // deliberately disarmed store-wide (AGENTS.md §4); passing '' here matches every real call site.
    const lengthIssues = (seo: SeoResponse) => validateSeoMetadata(seo, '').filter(i => i.rule === 'meta-title-length');
    const seo55 = seoOf('h', 'M'.repeat(55));
    const seo56 = seoOf('h', 'M'.repeat(56));
    expect(lengthIssues(seo55)).toEqual([]);
    expect(lengthIssues(seo56)).toHaveLength(1);
  });
});

describe('normalizeLongH1MetaTitle / validateSeoMetadataShape — closed-form coverage sweep (T15, Implementation Plan §2.4.1)', () => {
  it('for every sampled h1Len, the value normalizeLongH1MetaTitle produces for that h1 passes validateSeoMetadataShape — no h1Len is left unsatisfiable', () => {
    const sample = [0, 1, 10, 30, 52, 53, 54, 55, 56, 60, 66, 70];
    for (const len of sample) {
      const h1 = h1OfLength(len);
      // A reachable-shaped candidate as the second argument, so the no-op branch (h1Len <= 53) is
      // exercised honestly too, not only the unreachable-normalization branch.
      const candidate = h1 ? `${h1}-x` : '';
      const produced = normalizeLongH1MetaTitle(h1, candidate);
      expect(shapeIssues(seoOf(h1, produced)), `h1Len=${len}`).toEqual([]);
    }
  });
});
