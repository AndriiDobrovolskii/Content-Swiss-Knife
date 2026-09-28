import { describe, it, expect } from 'vitest';
import {
  REPAIR_STRATEGIES, NON_REGENERABLE_RULES, getAtPath, isLadderCandidate, resolveLadder, setAtPath,
  slugify, truncateAtWordBoundary,
} from './repair-strategy';
import type { ValidationIssue } from './output-validator';

const titleIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
  severity: 'error',
  rule: 'meta-title-length',
  detail: 'meta_title is 57 chars (max 55).',
  context: 'SEO meta (en-GB)',
  path: 'seo_data[0].meta_title',
  measured: { actual: 57, limit: 55, unit: 'chars' },
  ...overrides,
});

describe('resolveLadder', () => {
  it('terminates every registered ladder with full-regen', () => {
    expect(resolveLadder(titleIssue())).toEqual(['field-scoped', 'deterministic', 'full-regen']);
  });

  it('puts field-scoped BEFORE deterministic for meta-title-length', () => {
    // The ordering that makes tier 1 reachable. A global tier-0-first sweep would make the LLM
    // rung unreachable and silently reduce every title repair to truncation.
    const ladder = resolveLadder(titleIssue());
    expect(ladder.indexOf('field-scoped')).toBeLessThan(ladder.indexOf('deterministic'));
  });

  it('gives slug-charset a deterministic-only ladder', () => {
    expect(resolveLadder({
      severity: 'error', rule: 'slug-charset', detail: 'd', context: 'Slug (uk-UA)', path: 'slugs[0].slug',
    })).toEqual(['deterministic', 'full-regen']);
  });

  it('falls through to full-regen for an unregistered rule', () => {
    expect(resolveLadder({ severity: 'error', rule: 'spec-count-mismatch', detail: 'd', context: 'c' }))
      .toEqual(['full-regen']);
  });

  it('falls through to full-regen for a registered rule that carries no path', () => {
    // The additive guarantee: an un-migrated emission site behaves exactly as it did before.
    expect(resolveLadder(titleIssue({ path: undefined }))).toEqual(['full-regen']);
  });
});

describe('path addressing', () => {
  const artifact = {
    site_name: 'Store',
    seo_data: [
      { language: 'en-GB', meta_title: 'A' },
      { language: 'pl-PL', meta_title: 'B' },
    ],
  };

  it('reads arrayProp[i].leafProp', () => {
    expect(getAtPath(artifact, 'seo_data[1].meta_title')).toBe('B');
  });

  it('reads arrayProp[i]', () => {
    expect(getAtPath(artifact, 'seo_data[0]')).toEqual({ language: 'en-GB', meta_title: 'A' });
  });

  it('returns undefined for an out-of-range index rather than throwing', () => {
    expect(getAtPath(artifact, 'seo_data[9].meta_title')).toBeUndefined();
  });

  it('throws on a malformed path instead of silently doing nothing', () => {
    // A silent no-op would let a failed repair look like a successful one.
    expect(() => getAtPath(artifact, 'seo_data.meta_title')).toThrow(/unsupported path/);
    expect(() => setAtPath(artifact, 'nonsense', 'x')).toThrow(/unsupported path/);
  });

  it('throws when the addressed array or index does not exist', () => {
    expect(() => setAtPath(artifact, 'missing[0].x', 'v')).toThrow(/not an array/);
    expect(() => setAtPath(artifact, 'seo_data[9].meta_title', 'v')).toThrow(/out of range/);
  });

  it('throws on an array addressed without an index, in BOTH directions', () => {
    // The dropped-index caller bug. It used to be rejected by the path grammar; now it is rejected
    // by the data, which is what lets genuine object hops (below) through without letting this in.
    // A read must throw too — quietly returning undefined here is the silent no-op the whole
    // loud-failure contract exists to prevent.
    expect(() => getAtPath(artifact, 'seo_data.meta_title')).toThrow(/unsupported path/);
    expect(() => setAtPath(artifact, 'seo_data.meta_title', 'x')).toThrow(/unsupported path/);
  });

  it('replaces exactly one leaf and keeps every sibling by reference', () => {
    // Monotonicity by identity: anything that changed identity was rewritten by something else.
    const next = setAtPath(artifact, 'seo_data[0].meta_title', 'SHORT');
    expect(next.seo_data[0].meta_title).toBe('SHORT');
    expect(next.seo_data[1]).toBe(artifact.seo_data[1]); // untouched sibling, same reference
    expect(next.site_name).toBe(artifact.site_name);
    expect(artifact.seo_data[0].meta_title).toBe('A');    // input not mutated
  });
});

/**
 * runDocGate holds a `{ doc, issues }` wrapper, and heading-style.ts emits SIX Doc heading shapes
 * against it. Before the segment walker only `doc.functionality[i].heading` parsed, so a finding on
 * `doc.cta.heading` threw "unsupported path" and the warning-only heading rule — whose field-scoped
 * rung is its only working instrument on a Doc — could report but never repair. Observed live:
 * the model put the full product name in the §9 CTA heading and the ladder could not reach it.
 */
describe('path addressing — Doc shapes (the doc.cta.heading regression)', () => {
  const docArtifact = {
    doc: {
      functionality: [
        { heading: 'F0', subsections: [{ heading: 'S0' }, { heading: 'S1' }] },
        { heading: 'F1' },
      ],
      specs: { heading: 'Технічні характеристики' },
      cta: { heading: 'Чому купити Ortur H20 20 W Standard Package в EXPERT3D?' },
    },
    issues: [],
  };

  it('reads a plain object hop with no array anywhere', () => {
    expect(getAtPath(docArtifact, 'doc.cta.heading')).toBe(docArtifact.doc.cta.heading);
    expect(getAtPath(docArtifact, 'doc.specs.heading')).toBe('Технічні характеристики');
  });

  it('writes a plain object hop and leaves untouched branches by reference', () => {
    const next = setAtPath(docArtifact, 'doc.cta.heading', 'Чому купити Ortur H20 в EXPERT3D?');
    expect(next.doc.cta.heading).toBe('Чому купити Ortur H20 в EXPERT3D?');
    expect(next.doc.specs).toBe(docArtifact.doc.specs);           // sibling, same reference
    expect(next.doc.functionality).toBe(docArtifact.doc.functionality);
    expect(next.issues).toBe(docArtifact.issues);
    expect(docArtifact.doc.cta.heading).toContain('Standard Package'); // input not mutated
  });

  it('round-trips arbitrary depth with several array hops', () => {
    const path = 'doc.functionality[0].subsections[1].heading';
    expect(getAtPath(docArtifact, path)).toBe('S1');
    const next = setAtPath(docArtifact, path, 'Безпека');
    expect(getAtPath(next, path)).toBe('Безпека');
    expect(next.doc.functionality[1]).toBe(docArtifact.doc.functionality[1]);
    expect(next.doc.functionality[0].subsections[0]).toBe(docArtifact.doc.functionality[0].subsections[0]);
  });

  it('still throws when the array index is dropped from a Doc path', () => {
    // Same caller bug as seo_data.meta_title, one hop deeper — the walker must not have made
    // arbitrary nesting mean "anything goes".
    expect(() => getAtPath(docArtifact, 'doc.functionality.heading')).toThrow(/unsupported path/);
  });

  /**
   * The walk is N hops deep now, so any hop can be missing. A Doc without a `cta` must produce a
   * named error, never `TypeError: Cannot read properties of undefined`.
   */
  it('degrades to undefined on a read through a missing intermediate', () => {
    const noCta = { doc: { functionality: [] }, issues: [] };
    expect(getAtPath(noCta, 'doc.cta.heading')).toBeUndefined();
  });

  it('throws a NAMED error — not a TypeError — on a write through a missing intermediate', () => {
    const noCta = { doc: { functionality: [] }, issues: [] };
    expect(() => setAtPath(noCta, 'doc.cta.heading', 'x')).toThrow(/cannot resolve "cta"/);
    expect(() => setAtPath(noCta, 'doc.cta.heading', 'x')).not.toThrow(TypeError);
  });
});

describe('truncateAtWordBoundary', () => {
  it('returns the input unchanged when it already fits', () => {
    expect(truncateAtWordBoundary('Short title', 55)).toBe('Short title');
  });

  it('cuts on a word boundary, never mid-word', () => {
    const out = truncateAtWordBoundary('alpha beta gamma delta epsilon', 20)!;
    expect(out.length).toBeLessThanOrEqual(20);
    expect('alpha beta gamma delta epsilon'.startsWith(out)).toBe(true);
    expect(out.endsWith('gamma')).toBe(true);
  });

  /**
   * RECALIBRATED for US-3.1 T9 (AGENTS.md §7.7 — an intentional, evidenced expected-value change,
   * not a weakening). This test used to pin `truncateAtWordBoundary`'s `' | '`-detecting/preserving
   * branch, which FR-8 requires removed entirely: once FR-8 ships, no correctly-shaped `meta_title`
   * ever carries a `| {site_name}` suffix to preserve, and preserving one here would actively
   * reintroduce the exact suffix FR-8 exists to remove. Reassigned to TEST_WRITING per Task
   * Breakdown v4/v5 (Plan Review v3 finding 1): `so-builder`'s own governing skill forbids it from
   * touching a test file, so this recalibration lands here, before T9's IMPLEMENTATION starts, and
   * T9 turns it green with no further test-file edit of its own.
   *
   * Asserted by PROPERTY, not by the exact resulting string — the point is "no suffix survives",
   * not "the cut lands at one specific character".
   */
  it('no longer preserves a trailing " | Store" suffix — FR-8 removes the suffix entirely', () => {
    const title = 'Ortur H20 20 W Laser Engraver for Wood and Steel | Center3D';
    const out = truncateAtWordBoundary(title, 55)!;
    expect(Array.from(out).length).toBeLessThanOrEqual(55);
    expect(out).not.toContain(' | ');
    expect(out.endsWith('Center3D')).toBe(false);
    // Still a genuine prefix of the original text, cut on a whole word — only the suffix-keeping
    // behaviour is gone, not the word-boundary discipline itself.
    expect(title.startsWith(out)).toBe(true);
  });

  it('drops the suffix when preserving it would leave no meaningful head', () => {
    const out = truncateAtWordBoundary('Product name here | AVeryLongStoreNameIndeed', 20)!;
    expect(Array.from(out).length).toBeLessThanOrEqual(20);
  });

  it('leaves no dangling separator at the cut', () => {
    expect(truncateAtWordBoundary('alpha - beta gamma', 8)).not.toMatch(/[\s\-|,:;.]$/);
  });

  it('returns null when it cannot produce a non-empty result', () => {
    expect(truncateAtWordBoundary('abcdefghijk', 0)).toBeNull();
  });
});

describe('slugify', () => {
  it('coerces a charset violation into a valid slug', () => {
    expect(slugify('Ortur H20 20 Вт!')).toBe('ortur-h20-20');
  });

  it('collapses repeated and stray hyphens', () => {
    expect(slugify('--foo---bar--')).toBe('foo-bar');
  });

  it('strips diacritics rather than dropping the letter', () => {
    expect(slugify('Impresora 3D Válida')).toBe('impresora-3d-valida');
  });

  it('returns null when nothing slug-able survives', () => {
    expect(slugify('Вт')).toBeNull();
    expect(slugify('!!!')).toBeNull();
  });
});

describe('warnings on the ladder', () => {
  const sentenceIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
    severity: 'warning',
    rule: 'sentence-too-long',
    detail: 'Sentence of 21 words exceeds the uk-UA hard ceiling of 20. Split it into two.',
    context: 'HTML (base)',
    path: 'block[7]',
    measured: { actual: 21, limit: 20, unit: 'words' },
    ...overrides,
  });

  it('gives sentence-too-long TWO block-scoped rungs', () => {
    // One attempt is not enough in practice. The first real run split off an independent tail and
    // left a three-item enumeration intact, so the sentence was still 26 words against a ceiling
    // of 20 — patched, accepted, unresolved. The second attempt sees the already-improved text and
    // a request narrowed to one block instead of eleven; both favour it.
    expect(resolveLadder(sentenceIssue())).toEqual(['block-scoped', 'block-scoped']);
  });

  it('stops at two rungs rather than retrying indefinitely', () => {
    // A third attempt on the same sentence means the instruction cannot break it, and it should
    // reach the report honestly instead of burning calls.
    expect(resolveLadder(sentenceIssue()).filter(t => t === 'block-scoped')).toHaveLength(2);
  });

  it('NEVER terminates a warning ladder with full-regen', () => {
    // The admission argument in full: a block rewrite is safe to spend on a warning because the
    // worst case is that the block is left alone. Regenerating a whole artifact for a stylistic
    // finding is not — it is free to break the fields it was not asked about. No warning, whatever
    // its rule, may reach that instrument.
    expect(resolveLadder(sentenceIssue())).not.toContain('full-regen');
  });

  it('still terminates an ERROR ladder with full-regen', () => {
    expect(resolveLadder(sentenceIssue({ severity: 'error' })))
      .toEqual(['block-scoped', 'block-scoped', 'full-regen']);
  });

  it('admits an error to the ladder unconditionally', () => {
    expect(isLadderCandidate({ severity: 'error', rule: 'spec-count-mismatch', detail: 'd', context: 'c' }))
      .toBe(true);
  });

  it('admits a warning only when it is addressable AND registered', () => {
    expect(isLadderCandidate(sentenceIssue())).toBe(true);
    // No path — nothing to address, so nothing a tier could rewrite.
    expect(isLadderCandidate(sentenceIssue({ path: undefined }))).toBe(false);
    // Registered rules only: a warning with no strategy would occupy a rung that cannot act,
    // and the un-migrated rules in output-validator.ts must keep behaving exactly as before.
    expect(isLadderCandidate(sentenceIssue({ rule: 'br-spacing' }))).toBe(false);
  });
});

describe('registry strategies', () => {
  /**
   * RECALIBRATED for US-3.1 (T1, T7, T11 each add a registered strategy — `doc-schema`,
   * `heading-brand-core-missing`, `slug-name-designator-lost`). The "nothing by analogy" principle
   * this test guards is unchanged; only the intended set has grown, by three separate, individually
   * argued Story requirements (AC-6, AC-3, AC-6 again).
   */
  it('registers exactly the intended rules and nothing by analogy', () => {
    expect([...REPAIR_STRATEGIES.keys()].sort()).toEqual([
      'doc-schema',
      'heading-brand-core-missing',
      'heading-product-name-stuffing',
      'meta-title-length',
      'sentence-too-long',
      'slug-charset',
      'slug-name-designator-lost',
    ]);
  });

  it('does NOT repair spec-row-not-grounded, because the finding itself is unreliable', () => {
    // Registered in an earlier iteration, removed after the output proved the claim false: a §7
    // table with 15 correct rows had one flagged, and WHICH one changed between runs depending on
    // how the grounding translation happened to word the term. Repairing on a false claim means
    // renaming a correctly named row — worse than doing nothing.
    expect(resolveLadder({
      severity: 'error', rule: 'spec-row-not-grounded', detail: 'd',
      context: 'HTML (uk-UA)', path: 'block[12]',
    })).toEqual(['full-regen']);
  });

  it('meta-title tier-1 instruction states the arithmetic from `measured`, not from `detail`', () => {
    const strategy = REPAIR_STRATEGIES.get('meta-title-length')!;
    const text = strategy.fieldInstruction!('x'.repeat(57), titleIssue());
    expect(text).toContain('Current length: 57');
    expect(text).toContain('Limit: 55');
    expect(text).toContain('Remove at least 2');
    expect(text).toMatch(/Return ONLY the corrected title/);
  });

  it('meta-title tier-0 cannot run without a limit, and says so by returning null', () => {
    const strategy = REPAIR_STRATEGIES.get('meta-title-length')!;
    expect(strategy.deterministic!('a'.repeat(80), titleIssue({ measured: undefined }))).toBeNull();
  });

  /** T9 (FR-8) — the suffix-keeping instruction must be gone, not merely joined by new text. */
  it('no longer instructs the field-scoped rung to keep a site suffix', () => {
    const strategy = REPAIR_STRATEGIES.get('meta-title-length')!;
    const text = strategy.fieldInstruction!('x'.repeat(57), titleIssue());
    expect(text).not.toMatch(/store suffix/i);
    expect(text).not.toMatch(/keep the product name and the store suffix/i);
  });

  /**
   * T12 (FR-13(b)/D9) — case (1), this task's own red-to-green obligation. `fieldInstruction`
   * (tried FIRST in the `['field-scoped', 'deterministic']` ladder) must tell the model to keep a
   * trailing single-mark differentiation character while shortening, since an LLM rewrite is more
   * likely to honour an explicit instruction than the deterministic tier's length-blind slice.
   */
  it('instructs the field-scoped rung to preserve a trailing differentiation mark, never dropping it', () => {
    const strategy = REPAIR_STRATEGIES.get('meta-title-length')!;
    const text = strategy.fieldInstruction!('x'.repeat(56) + '·', titleIssue({ measured: { actual: 57, limit: 55, unit: 'chars' } }));
    expect(text).toMatch(/keep that mark/i);
    expect(text).toMatch(/never let the result become identical to the H1/i);
  });
});

/**
 * T4 (FR-2(b), plan D3) — `NON_REGENERABLE_RULES` marks a rule no repair instrument can ever
 * resolve within one run. `specs-grounding-disabled` is exactly that: no rewrite of any field
 * changes whether the specs-translation call succeeded.
 */
describe('NON_REGENERABLE_RULES', () => {
  it('marks specs-grounding-disabled as non-regenerable', () => {
    expect(NON_REGENERABLE_RULES.has('specs-grounding-disabled')).toBe(true);
  });

  it('does not mark an ordinary repairable rule as non-regenerable', () => {
    expect(NON_REGENERABLE_RULES.has('meta-title-length')).toBe(false);
    expect(NON_REGENERABLE_RULES.has('heading-product-name-stuffing')).toBe(false);
  });
});

/**
 * T1 (FR-10, plan D7) — `doc-schema` gets a targeted ladder entry instead of always falling
 * through to full-document regeneration.
 */
describe('registry strategies — doc-schema (T1, FR-10)', () => {
  const docSchemaIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
    severity: 'error',
    rule: 'doc-schema',
    detail: 'doc.functionality[0].heading: Required',
    context: 'Doc (base)',
    path: 'doc.functionality[0].heading',
    ...overrides,
  });

  it('is registered with a non-full-regen-only ladder', () => {
    const strategy = REPAIR_STRATEGIES.get('doc-schema');
    expect(strategy).toBeDefined();
    expect(strategy!.ladder).toContain('field-scoped');
    expect(strategy!.ladder).not.toEqual(['full-regen']);
  });

  it('resolves to a field-scoped rung before full-regen, for an addressed finding', () => {
    expect(resolveLadder(docSchemaIssue())).toEqual(['field-scoped', 'full-regen']);
  });

  it('still falls through to full-regen when the finding carries no path (unparseable response)', () => {
    expect(resolveLadder(docSchemaIssue({ path: undefined }))).toEqual(['full-regen']);
  });

  it('has a field-scoped instruction the repair executor can send', () => {
    const strategy = REPAIR_STRATEGIES.get('doc-schema')!;
    expect(typeof strategy.fieldInstruction).toBe('function');
    const text = strategy.fieldInstruction!('', docSchemaIssue());
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});

/**
 * T7 (FR-7, plan D5) — `heading-brand-core-missing` mirrors `heading-product-name-stuffing`'s own
 * ladder shape: the same dual Doc/HTML-shape handling its sibling/inverse rule on these same two
 * positions already needs.
 */
describe('registry strategies — heading-brand-core-missing (T7, FR-7)', () => {
  const brandCoreIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
    severity: 'error',
    rule: 'heading-brand-core-missing',
    detail: 'The heading at doc.cta.heading ("Cyclone Dust Collector") omits the required brand core "Makera Cyclone Dust Collector".',
    context: 'uk-UA — heading form',
    path: 'doc.cta.heading',
    ...overrides,
  });

  it('mirrors heading-product-name-stuffing\'s ladder shape: field-scoped then block-scoped', () => {
    const strategy = REPAIR_STRATEGIES.get('heading-brand-core-missing');
    expect(strategy).toBeDefined();
    expect(strategy!.ladder).toEqual(['field-scoped', 'block-scoped']);
  });

  it('resolves to field-scoped, block-scoped, full-regen for an addressed error', () => {
    expect(resolveLadder(brandCoreIssue())).toEqual(['field-scoped', 'block-scoped', 'full-regen']);
  });

  it('is error severity by construction — matching AC-3\'s "caught the same way slug drift already is"', () => {
    // First assertion is load-bearing: an UNREGISTERED rule also resolves to ['full-regen']
    // regardless of severity (resolveLadder's own no-strategy fallback), so the 'full-regen'
    // membership check below would pass vacuously against a rule that has never been registered.
    expect(REPAIR_STRATEGIES.has('heading-brand-core-missing')).toBe(true);
    // resolveLadder appends 'full-regen' only for error-severity issues (see resolveLadder's own
    // doc comment) — the ladder above already proves this, this test names WHY explicitly.
    expect(resolveLadder(brandCoreIssue({ severity: 'error' }))).toContain('full-regen');
  });

  /**
   * FR-7 v11/v12 — one registered rule, its `fieldInstruction` dispatched by `issue.path`: a
   * `doc.localizedName`-path issue gets bare-name wording mirroring `slug-name-designator-lost`'s
   * own ("Rewrite this localized product name... Return ONLY the corrected name...") — never the
   * heading-oriented wording, since a heading-oriented instruction applied to this leaf would make
   * the shape requirement fail on that rung near-systematically. The one remaining genuine heading
   * leaf (`doc.cta.heading`) and the HTML closing-heading path (`block[n]`) both keep
   * heading-product-name-stuffing's existing heading-oriented wording, unchanged.
   */
  it('dispatches fieldInstruction by path — bare-name wording for doc.localizedName, heading wording otherwise', () => {
    const strategy = REPAIR_STRATEGIES.get('heading-brand-core-missing');
    expect(strategy).toBeDefined();

    const nameText = strategy!.fieldInstruction!(
      'Cyclone Dust Collector',
      brandCoreIssue({ path: 'doc.localizedName' }),
    );
    expect(nameText).toMatch(/Rewrite this localized product name/);
    expect(nameText).toMatch(/Return ONLY the corrected name/);
    expect(nameText).not.toMatch(/Rewrite this heading/);

    const ctaText = strategy!.fieldInstruction!(
      'Cyclone Dust Collector',
      brandCoreIssue({ path: 'doc.cta.heading' }),
    );
    expect(ctaText).toMatch(/Rewrite this heading/);
    expect(ctaText).not.toMatch(/Rewrite this localized product name/);

    const htmlText = strategy!.fieldInstruction!(
      'Cyclone Dust Collector',
      brandCoreIssue({ path: 'block[5]' }),
    );
    expect(htmlText).toMatch(/Rewrite this heading/);
    expect(htmlText).not.toMatch(/Rewrite this localized product name/);
  });
});

/**
 * T11 (FR-11, plan D8) — `slug-name-designator-lost` gets a targeted field-scoped repair instead
 * of always falling through to full-document regeneration, the same shape improvement
 * `slug-charset` already has on the same SlugResponse artifact.
 */
describe('registry strategies — slug-name-designator-lost (T11, FR-11)', () => {
  const designatorIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
    severity: 'error',
    rule: 'slug-name-designator-lost',
    detail: 'Localized name "XGRIDS L2 Pro 32 300" no longer contains the invariant core "XGRIDS L2 Pro 32/300".',
    context: 'Slug (pl-PL)',
    path: 'slugs[0].name',
    ...overrides,
  });

  it('is registered with a field-scoped-only ladder, addressed at slugs[i].name', () => {
    const strategy = REPAIR_STRATEGIES.get('slug-name-designator-lost');
    expect(strategy).toBeDefined();
    expect(strategy!.ladder).toEqual(['field-scoped']);
  });

  it('resolves to field-scoped then full-regen for an addressed error', () => {
    expect(resolveLadder(designatorIssue())).toEqual(['field-scoped', 'full-regen']);
  });

  it('still falls through to full-regen with no path', () => {
    expect(resolveLadder(designatorIssue({ path: undefined }))).toEqual(['full-regen']);
  });
});

/**
 * T12 (FR-13(b), plan D9/D11(b)) — case (2), the deliberate GREEN characterization pin.
 *
 * Plan Review v5 (docs/reviews/plans/US-3.1-plan-review.md#5) and Task Breakdown v5 both establish
 * this disposition explicitly: this case exercises `cutOnWordBoundary()`'s pre-existing,
 * UNMODIFIED behaviour (reached via the actual production/registered entry point,
 * `REPAIR_STRATEGIES.get('meta-title-length')!.deterministic`, since `cutOnWordBoundary` itself is
 * not exported) and is expected to be GREEN the moment this file is written — no task in this
 * Story changes `cutOnWordBoundary()`. It is a REGRESSION PIN documenting a named, accepted
 * residual (Implementation Plan v4 D11(b)), not a red-to-green proof of any AC — see
 * `docs/tests/US-3.1-ac-test-matrix.md` for how it is (and is not) cited there, and
 * `docs/tests/US-3.1-test-generation-report.md` for the observed-passing-on-write confirmation.
 *
 * `.claude/skills/so-test-writer/SKILL.md`'s Constraints qualify the "never write a passing test"
 * rule to a test that passes "against UNIMPLEMENTED behaviour" — `cutOnWordBoundary()` is
 * implemented, unmodified code, so that constraint does not reach this case.
 */
describe('registry strategies — meta-title-length deterministic tier at the H1-core-length-55 boundary (T12, FR-13(b), regression pin)', () => {
  // A 55-grapheme, multi-word H1 core. Guard-asserted below rather than trusted by eye.
  const CORE = 'Bambu Lab Photopolymer Filament Ultra Matte Orange 1kgX';

  it('fixture guard: the core is exactly 55 graphemes, and the marked title is exactly 56', () => {
    expect(Array.from(CORE).length).toBe(55);
    expect(Array.from(`${CORE}·`).length).toBe(56);
  });

  it('the deterministic tier does not reproduce the bare H1 core or an h1-identical string', () => {
    const h1 = CORE;
    const marked = `${CORE}·`; // T10's own appended differentiation mark
    const issue: ValidationIssue = {
      severity: 'error',
      rule: 'meta-title-length',
      detail: `meta_title is 56 chars (max 55).`,
      context: 'SEO meta (en-GB)',
      path: 'seo_data[0].meta_title',
      measured: { actual: 56, limit: 55, unit: 'chars' },
    };

    const strategy = REPAIR_STRATEGIES.get('meta-title-length')!;
    const result = strategy.deterministic!(marked, issue);
    expect(result).not.toBeNull();
    const value = result as string;

    // (a) strictly shorter than the 55-character H1 core — its own last word is additionally
    //     stripped by cutOnWordBoundary()'s unconditional lastIndexOf(' ') backup step, not merely
    //     the appended mark.
    expect(Array.from(value).length).toBeLessThan(Array.from(h1).length);
    // (b) not byte-identical to h1.
    expect(value).not.toBe(h1);
    // (c) does not start with the full h1 string as a prefix — a shorter string cannot contain a
    //     longer one as its own prefix, which is exactly why this re-trips
    //     meta-title-template-shape's condition (2), not meta-title-h1-identical.
    expect(value.startsWith(h1)).toBe(false);
  });
});
