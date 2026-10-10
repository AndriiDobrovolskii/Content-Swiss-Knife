/**
 * protected-name-block.spec.ts — US-7.1 T6 (FR-2, OD-2 priority statement, NFR-1 / plan R8 guard).
 *
 * `protected-name-block.ts` does not exist yet: red at import time until so-builder creates it (T6).
 * Contract (plan D2/D5): withProtectedNameBlock(payload, typedName): PromptPayload
 *   - protected typed name -> same `systemBlocks` (SAME ARRAY REFERENCE, cache breakpoints intact),
 *     `userContent` = original userContent + a `[PROTECTED PRODUCT NAME]` block;
 *   - generic or empty typed name -> the payload, unchanged.
 * The per-product block lives in `userContent` ONLY (AGENTS.md §3 prompt caching): a product-specific
 * string in a cached system block fragments the cache per product.
 *
 * The marker literal `[PROTECTED PRODUCT NAME]` is shared with the static precedence clause (T8);
 * protected-name-precedence.spec.ts asserts the identical literal so the two cannot drift apart.
 */
import { describe, it, expect } from 'vitest';
import { withProtectedNameBlock } from './protected-name-block';
import type { PromptPayload } from './payload';

const PROTECTED_MARKER = '[PROTECTED PRODUCT NAME]';

const A = 'Formlabs Form Studio 1 Resin Tank Pro';
const C = 'Hardened Steel Nozzle 0.4 mm';

const payload = (): PromptPayload => ({
  systemBlocks: [
    { text: 'MASTER SYSTEM PROMPT TEXT', cache: true },
    { text: 'TASK TEMPLATE TEXT', cache: true },
  ],
  userContent: '[INPUT DATA]\n[Product Name]: "Formlabs Form Studio 1 Resin Tank Pro"',
});

describe('withProtectedNameBlock — protected name', () => {
  it('appends a [PROTECTED PRODUCT NAME] block to userContent, after the original content', () => {
    const p = payload();
    const out = withProtectedNameBlock(p, A);
    expect(out.userContent.startsWith(p.userContent)).toBe(true);
    expect(out.userContent.length).toBeGreaterThan(p.userContent.length);
    expect(out.userContent.slice(p.userContent.length)).toContain(PROTECTED_MARKER);
  });

  it('carries the typed name verbatim inside the block', () => {
    const p = payload();
    const block = withProtectedNameBlock(p, A).userContent.slice(p.userContent.length);
    expect(block).toContain(A);
  });

  it('states the rule: every token, in order, untranslated, verbatim, rendered once (FR-2)', () => {
    const p = payload();
    const block = withProtectedNameBlock(p, A).userContent.slice(p.userContent.length);
    expect(block).toMatch(/every token/i);
    expect(block).toMatch(/order/i);
    expect(block).toMatch(/untranslated|never translate|not translate|do not translate/i);
    expect(block).toMatch(/verbatim/i);
    expect(block).toMatch(/\bonce\b/i);
  });

  it('states the OD-2 priority: the full typed name outranks the localized category noun under the 55-character meta_title limit', () => {
    const p = payload();
    const block = withProtectedNameBlock(p, A).userContent.slice(p.userContent.length);
    expect(block).toContain('meta_title');
    expect(block).toContain('55');
    expect(block).toMatch(/categor/i);
    expect(block).toMatch(/outrank|takes (priority|precedence)|priority over|precedence over|wins over|before/i);
  });

  it('permits locale formatting of numbers and units only', () => {
    const p = payload();
    const block = withProtectedNameBlock(p, A).userContent.slice(p.userContent.length);
    expect(block).toMatch(/number/i);
    expect(block).toMatch(/unit/i);
  });

  it('NFR-1: systemBlocks is the SAME array reference as the input, cache breakpoints intact', () => {
    const p = payload();
    const out = withProtectedNameBlock(p, A);
    expect(out.systemBlocks).toBe(p.systemBlocks);
    expect(out.systemBlocks.map(b => b.cache)).toEqual([true, true]);
  });

  it('NFR-1: no system block text mentions the per-product block or the name (it never drifts into a cached block)', () => {
    const out = withProtectedNameBlock(payload(), A);
    for (const b of out.systemBlocks) {
      expect(b.text).not.toContain(PROTECTED_MARKER);
      expect(b.text).not.toContain(A);
    }
  });

  it('does not mutate the payload it was given', () => {
    const p = payload();
    const before = JSON.stringify(p);
    Object.freeze(p); Object.freeze(p.systemBlocks);
    withProtectedNameBlock(p, A);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('is deterministic: two calls give byte-identical output', () => {
    expect(JSON.stringify(withProtectedNameBlock(payload(), A))).toBe(JSON.stringify(withProtectedNameBlock(payload(), A)));
  });
});

describe('withProtectedNameBlock — generic or empty name leaves the payload untouched', () => {
  it('Fixture C (generic) returns a payload equal to the input, with no marker', () => {
    const p = payload();
    const out = withProtectedNameBlock(p, C);
    expect(out).toEqual(p);
    expect(out.userContent).not.toContain(PROTECTED_MARKER);
    expect(out.systemBlocks).toBe(p.systemBlocks);
  });

  it.each(['', '   '])('an empty typed name %j returns the payload unchanged', (typed) => {
    const p = payload();
    expect(withProtectedNameBlock(p, typed)).toEqual(p);
  });
});
