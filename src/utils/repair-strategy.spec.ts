import { describe, it, expect } from 'vitest';
import {
  REPAIR_STRATEGIES, getAtPath, isLadderCandidate, resolveLadder, setAtPath, slugify,
  truncateAtWordBoundary,
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

  it('replaces exactly one leaf and keeps every sibling by reference', () => {
    // Monotonicity by identity: anything that changed identity was rewritten by something else.
    const next = setAtPath(artifact, 'seo_data[0].meta_title', 'SHORT');
    expect(next.seo_data[0].meta_title).toBe('SHORT');
    expect(next.seo_data[1]).toBe(artifact.seo_data[1]); // untouched sibling, same reference
    expect(next.site_name).toBe(artifact.site_name);
    expect(artifact.seo_data[0].meta_title).toBe('A');    // input not mutated
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

  it('preserves a trailing " | Store" suffix, which is the least redundant part', () => {
    const title = 'Ortur H20 20 W Laser Engraver for Wood and Steel | Center3D';
    const out = truncateAtWordBoundary(title, 55)!;
    expect(Array.from(out).length).toBeLessThanOrEqual(55);
    expect(out.endsWith(' | Center3D')).toBe(true);
    expect(out.startsWith('Ortur H20 20 W')).toBe(true);
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
  it('registers exactly the intended rules and nothing by analogy', () => {
    expect([...REPAIR_STRATEGIES.keys()].sort())
      .toEqual(['meta-title-length', 'sentence-too-long', 'slug-charset']);
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
});
