/**
 * protected-seo-name.spec.ts — US-7.1 T4 (FR-4, OD-2, OD-12 default; AC-2 boundary at 53/54/55).
 *
 * `protected-seo-name.ts` does not exist yet: red at import time until so-builder creates it (T4).
 * Contract (plan D2): seoCoreName(localizedName, typedName, isProtected): string
 *
 * OD-12 default (FR-4): when `category + typed name` would give an H1 of 54 or MORE code points, the
 * H1 omits the category noun and the typed name alone is the core, so `meta_title` keeps the whole
 * typed name and the existing long-H1 canonicalization (isH1Unreachable, 54) never fires. Below 54 the
 * localized name (category included) is kept. Length is counted in CODE POINTS, not UTF-16 units.
 */
import { describe, it, expect } from 'vitest';
import { seoCoreName } from './protected-seo-name';

const TYPED = 'Formlabs Form Studio 1 Resin Tank Pro';   // Fixture A, 37 code points

/** A localized name of exactly `total` code points: `<category> <typed>`. */
function localizedOfLength(total: number, fillChar = 'Ж'): string {
  const categoryLen = total - TYPED.length - 1;
  return `${fillChar.repeat(categoryLen)} ${TYPED}`;
}
const cp = (s: string) => Array.from(s).length;

describe('seoCoreName — the 54 code-point boundary (OD-12 default, FR-4)', () => {
  it('premise: Fixture A is 37 code points and the helper builds exact lengths', () => {
    expect(cp(TYPED)).toBe(37);
    expect(cp(localizedOfLength(53))).toBe(53);
    expect(cp(localizedOfLength(54))).toBe(54);
  });

  it('53 code points: the category is kept (the localized name is returned unchanged)', () => {
    const name = localizedOfLength(53);
    expect(seoCoreName(name, TYPED, true)).toBe(name);
  });

  it('54 code points: the category is dropped, the typed name alone is the core', () => {
    expect(seoCoreName(localizedOfLength(54), TYPED, true)).toBe(TYPED);
  });

  it('55 code points: the category is dropped, the typed name alone is the core', () => {
    expect(seoCoreName(localizedOfLength(55), TYPED, true)).toBe(TYPED);
  });

  it('the observed bug shape: "Depósito de resina" + Fixture A is 56 code points, so only the typed name is kept', () => {
    const name = `Depósito de resina ${TYPED}`;
    expect(cp(name)).toBe(56);
    expect(seoCoreName(name, TYPED, true)).toBe(TYPED);
  });

  it('counts code points, not UTF-16 units: an astral-plane category character counts once', () => {
    // 14 BMP letters + 1 astral letter (2 UTF-16 units) = 15 code points -> 53 code points in total
    // (but 54 UTF-16 units). A .length-based implementation would wrongly drop the category.
    const name = `${'Ж'.repeat(14)}\u{1D538} ${TYPED}`;
    expect(cp(name)).toBe(53);
    expect(name.length).toBe(54);
    expect(seoCoreName(name, TYPED, true)).toBe(name);
  });
});

describe('seoCoreName — names that are already short, or not protected', () => {
  it('returns an English name that equals the typed name unchanged', () => {
    expect(seoCoreName(TYPED, TYPED, true)).toBe(TYPED);
  });

  it('returns a short localized name unchanged: category + typed name under 54 keeps the category', () => {
    const name = `Бак ${TYPED}`;
    expect(cp(name)).toBeLessThan(54);
    expect(seoCoreName(name, TYPED, true)).toBe(name);
  });

  it('a generic (not protected) name is returned unchanged whatever its length', () => {
    const typed = 'Hardened Steel Nozzle 0.4 mm';
    const longLocalized = `${'Ж'.repeat(60)} ${typed}`;
    expect(seoCoreName(longLocalized, typed, false)).toBe(longLocalized);
  });
});
