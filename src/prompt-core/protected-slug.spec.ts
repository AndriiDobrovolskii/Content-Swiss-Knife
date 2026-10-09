/**
 * protected-slug.spec.ts — US-7.1 T5 (FR-10, OD-5, OD-6; AC-1 slug half).
 *
 * `protected-slug.ts` does not exist yet: red at import time until so-builder creates it (T5).
 * Contract (plan D2): enforceProtectedSlugLength(name, slug, typedName, language?): string
 *
 * FR-10: for a protected name the verbatim typed name outranks the 100-character slug maximum.
 *   (a) full slug > 100 but the typed name's slug alone <= 100  -> output <= 100 AND still contains
 *       the whole typed-name slug (only tokens OUTSIDE the typed-name span are trimmed);
 *   (b) the typed name's slug alone > 100 -> output is that full typed-name slug, nothing trimmed
 *       from it, i.e. longer than 100.
 * `enforceSlugLength` and `invariantCore` are NOT edited (OD-6): the legacy function keeps
 * anchoring on the short core, which is exactly why a protected variant exists (see the contrast test).
 */
import { describe, it, expect } from 'vitest';
import { enforceProtectedSlugLength } from './protected-slug';
import { enforceSlugLength, normalizeSlug, stripSlugStopwords } from './slug-utils';

const TYPED = 'Formlabs Form Studio 1 Resin Tank Pro';
const slugOf = (name: string, language?: string) => normalizeSlug(stripSlugStopwords(name), language);
const TYPED_SLUG = slugOf(TYPED);   // formlabs-form-studio-1-resin-tank-pro

const filler = (n: number) => Array.from({ length: n }, (_, i) => `filler${i}`).join(' ');

describe('enforceProtectedSlugLength — FR-10 (a): the typed-name slug fits, the rest is trimmed', () => {
  const name = `${TYPED} ${filler(15)} accuracy 0.015 mm`;
  const slug = slugOf(name);

  it('premise: the full slug really is over 100 and the typed-name slug is well under it', () => {
    expect(slug.length).toBeGreaterThan(100);
    expect(TYPED_SLUG.length).toBeLessThan(100);
  });

  it('returns a slug of at most 100 characters', () => {
    expect(enforceProtectedSlugLength(name, slug, TYPED).length).toBeLessThanOrEqual(100);
  });

  it('keeps the whole typed-name slug, "resin-tank" included', () => {
    const out = enforceProtectedSlugLength(name, slug, TYPED);
    expect(out).toContain(TYPED_SLUG);
    expect(out).toContain('resin-tank');
  });

  it('only trims the tail: everything up to the end of the typed-name span is preserved byte-for-byte', () => {
    const out = enforceProtectedSlugLength(name, slug, TYPED);
    expect(out.startsWith(TYPED_SLUG)).toBe(true);
  });

  it('keeps a localized category prefix in front of the typed name when trimming the tail', () => {
    const localized = `Depósito de resina ${TYPED} ${filler(15)} accuracy 0.015 mm`;
    const localizedSlug = slugOf(localized, 'es-ES');
    expect(localizedSlug.length).toBeGreaterThan(100);
    const out = enforceProtectedSlugLength(localized, localizedSlug, TYPED, 'es-ES');
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out).toContain(TYPED_SLUG);
    expect(out.startsWith('deposito-resina-')).toBe(true);
  });

  it('CONTRAST (OD-6): the legacy enforceSlugLength anchors on the short core and trims "resin-tank" away', () => {
    // This pins the premise of the whole task: if the legacy trimmer already spared the typed name,
    // no protected variant would be needed. Guards against the premise silently becoming false.
    const legacy = enforceSlugLength(name, slug);
    expect(legacy).not.toContain(TYPED_SLUG);
  });
});

describe('enforceProtectedSlugLength — FR-10 (b): the typed-name slug alone exceeds 100', () => {
  const longTyped = `Formlabs ${Array.from({ length: 16 }, (_, i) => `Segment${String.fromCharCode(65 + i)}`).join(' ')} Pro`;
  const longTypedSlug = slugOf(longTyped);
  const name = `${longTyped} extra tail words`;
  const slug = slugOf(name);

  it('premise: the typed-name slug alone is over 100 characters', () => {
    expect(longTypedSlug.length).toBeGreaterThan(100);
  });

  it('returns the full typed-name slug with nothing trimmed from it (longer than 100)', () => {
    const out = enforceProtectedSlugLength(name, slug, longTyped);
    expect(out).toBe(longTypedSlug);
    expect(out.length).toBeGreaterThan(100);
  });
});

describe('enforceProtectedSlugLength — no-op and number handling', () => {
  it('is a no-op when the slug is already within 100 characters', () => {
    const slug = slugOf(TYPED);
    expect(enforceProtectedSlugLength(TYPED, slug, TYPED)).toBe(slug);
  });

  it('a typed name with a decimal keeps its dot in the preserved span', () => {
    const typed = 'Bambu Lab PLA Basic Filament 1.75 mm';
    const name = `${typed} ${filler(16)} extra`;
    const slug = slugOf(name);
    expect(slug.length).toBeGreaterThan(100);
    const out = enforceProtectedSlugLength(name, slug, typed);
    expect(out).toContain('bambu-lab-pla-basic-filament-1.75-mm');
    expect(out.length).toBeLessThanOrEqual(100);
  });
});
