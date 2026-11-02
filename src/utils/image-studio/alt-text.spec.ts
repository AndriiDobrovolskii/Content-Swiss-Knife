/**
 * alt-text.spec.ts - US-10.1 T24 (FR-75, AC-47, SD-35, D-16, D-35).
 *
 * The `alt` of a generated image is the prompt that produced it, cut by a deterministic rule (SD-35, confirmed in
 * OD-46 / CF-9): trim and collapse whitespace, count UNICODE CODE POINTS (not UTF-16 units), keep at most 100,
 * remove whitespace left at the end of the cut, then append the three ASCII full stops `...` ONLY when the prompt was
 * actually cut. An empty prompt gives the studio text T-21 instead, resolved from `uiLanguage` when it is rendered
 * (D-35: a prompt-derived `alt` is never localised, the fallback text is).
 *
 * PINNED CONTRACT (src/utils/image-studio/alt-text.ts)
 *   buildAlt(prompt: string) => { kind: 'prompt'; text: string } | { kind: 'fallback'; textId: 'T-21' }
 *   The fallback is a marker, not a string, so the renderer resolves T-21 with the language at render time and a
 *   toggle re-renders it (FR-77); the studio text itself ("Згенероване зображення" / "Generated image") is asserted
 *   by studio-texts.spec.ts.
 *
 * Boundary list: FR-75 "Boundary tests" (empty, whitespace-only, 99 / 100 / 101 code points, 101 Cyrillic, an astral
 * character as the 100th and as the 101st code point, a space as the 100th, leading/trailing whitespace, an interior
 * run of three spaces).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const cp = (s: string) => Array.from(s).length;
const GRIN = '\u{1F600}';

describe('buildAlt - length boundaries (FR-75, AC-47)', () => {
  it('SD-35: 99 code points are returned unchanged', async () => {
    const { buildAlt } = await load('./alt-text');
    const p = 'a'.repeat(99);
    expect(buildAlt(p)).toEqual({ kind: 'prompt', text: p });
  });

  it('SD-35: exactly 100 code points are returned unchanged, with NO ellipsis', async () => {
    const { buildAlt } = await load('./alt-text');
    const p = 'b'.repeat(100);
    const r = buildAlt(p);
    expect(r).toEqual({ kind: 'prompt', text: p });
    expect(r.text.endsWith('...')).toBe(false);
  });

  it('SD-35: 101 code points become the first 100 followed by "..." (103 code points in total)', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('c'.repeat(101));
    expect(r).toEqual({ kind: 'prompt', text: 'c'.repeat(100) + '...' });
    expect(cp(r.text)).toBe(103);
  });

  it('SD-35: 101 Cyrillic characters are cut to 100 Cyrillic characters plus "..."', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('ж'.repeat(101));
    expect(r.text).toBe('ж'.repeat(100) + '...');
  });

  it('SD-35: the ellipsis is three ASCII full stops (U+002E), not the single character U+2026', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('d'.repeat(150));
    expect(r.text.slice(100)).toBe('...');
    expect(r.text).not.toContain('…');
  });
});

describe('buildAlt - code points, not UTF-16 units (SD-35)', () => {
  it('SD-35: an astral character as the 100th code point is kept whole', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('a'.repeat(99) + GRIN + 'b');
    expect(r.text).toBe('a'.repeat(99) + GRIN + '...');
    expect(cp(r.text.slice(0, -3))).toBe(100);
  });

  it('SD-35: an astral character as the 101st code point is cut off entirely', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('a'.repeat(100) + GRIN);
    expect(r.text).toBe('a'.repeat(100) + '...');
  });

  it('SD-35: the result never contains a lone surrogate, wherever the cut falls', async () => {
    const { buildAlt } = await load('./alt-text');
    for (let n = 95; n <= 105; n++) {
      const r = buildAlt(GRIN.repeat(n));
      expect(r.text, `n=${n}`).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    }
  });

  it('SD-35: 100 astral characters (200 UTF-16 units) are 100 code points and stay unchanged', async () => {
    const { buildAlt } = await load('./alt-text');
    const p = GRIN.repeat(100);
    expect(p.length).toBe(200);
    expect(buildAlt(p)).toEqual({ kind: 'prompt', text: p });
  });
});

describe('buildAlt - whitespace (SD-35)', () => {
  it('SD-35: leading and trailing whitespace is removed before measuring', async () => {
    const { buildAlt } = await load('./alt-text');
    expect(buildAlt('   white mug on a table \n')).toEqual({ kind: 'prompt', text: 'white mug on a table' });
  });

  it('SD-35: padding does not push a 100-code-point prompt over the limit', async () => {
    const { buildAlt } = await load('./alt-text');
    expect(buildAlt('  ' + 'e'.repeat(100) + '  ')).toEqual({ kind: 'prompt', text: 'e'.repeat(100) });
  });

  it('SD-35: an interior run of three spaces (and tabs / newlines) collapses to one space', async () => {
    const { buildAlt } = await load('./alt-text');
    expect(buildAlt('a   b')).toEqual({ kind: 'prompt', text: 'a b' });
    expect(buildAlt('a \t\n b')).toEqual({ kind: 'prompt', text: 'a b' });
  });

  it('SD-35: collapsing happens BEFORE measuring - a prompt longer than 100 only because of spacing is not cut', async () => {
    const { buildAlt } = await load('./alt-text');
    const words = Array.from({ length: 20 }, () => 'word').join('     '); // 20*4 + 19*5 = 175 raw, 99 collapsed
    expect(cp(words)).toBeGreaterThan(100);
    const r = buildAlt(words);
    expect(r.text).toBe(Array.from({ length: 20 }, () => 'word').join(' '));
    expect(r.text.endsWith('...')).toBe(false);
  });

  it('SD-35: a space as the 100th character is removed before "..." is appended', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('a'.repeat(99) + ' ' + 'b'.repeat(5));
    expect(r.text).toBe('a'.repeat(99) + '...');
  });
});

describe('buildAlt - empty prompt falls back to T-21 (D-16, OD-46, D-35)', () => {
  it.each([
    ['an empty string', ''],
    ['spaces only', '     '],
    ['tabs and newlines only', '\t\n \r\n'],
  ])('FR-75: %s gives the T-21 marker, never an empty alt', async (_n, prompt) => {
    const { buildAlt } = await load('./alt-text');
    expect(buildAlt(prompt)).toEqual({ kind: 'fallback', textId: 'T-21' });
  });

  it('FR-75: a non-empty prompt never yields the fallback, so an image is never rendered with an empty alt', async () => {
    const { buildAlt } = await load('./alt-text');
    const r = buildAlt('x');
    expect(r.kind).toBe('prompt');
    expect(r.text.length).toBeGreaterThan(0);
  });
});
