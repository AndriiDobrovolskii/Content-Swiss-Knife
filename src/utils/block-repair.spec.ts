/**
 * block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { extractBlocks } from './block-repair';

/** U+00A0 by code point — a literal NBSP is invisible in review and in diffs. */
const NBSP = String.fromCharCode(0xa0);

describe('extractBlocks', () => {
  it('returns one block per prose tag, in document order', () => {
    const html = '<section><h2>Заголовок</h2><p>Перший</p><ul><li>Пункт</li></ul></section>';
    expect(extractBlocks(html).map(b => b.tag)).toEqual(['h2', 'p', 'li']);
  });

  it('gives offsets that slice back to outerHTML byte-for-byte', () => {
    // The whole point of htmlparser2 over a DOM round-trip: the slice IS the original bytes.
    const html = '<p class="lead">Alpha</p><figcaption><b>Підпис</b> — деталь</figcaption>';
    for (const block of extractBlocks(html)) {
      expect(html.slice(block.start, block.end)).toBe(block.outerHTML);
    }
  });

  it('ignores tags that are not addressable prose blocks', () => {
    const html = '<div><section><p>Yes</p><b>no</b><span>no</span></section></div>';
    expect(extractBlocks(html).map(b => b.tag)).toEqual(['p']);
  });

  it('yields BOTH the outer and the inner block of a nested list', () => {
    // Assignment picks the innermost; overlap is resolved when patches are applied, not here.
    const html = '<ul><li>Зовнішній<ul><li>Внутрішній</li></ul></li></ul>';
    const blocks = extractBlocks(html);
    expect(blocks.map(b => b.tag)).toEqual(['li', 'li']);
    expect(blocks[0].start).toBeLessThan(blocks[1].start);
    expect(blocks[0].end).toBeGreaterThan(blocks[1].end); // outer encloses inner
  });

  it('does not split a block on a ">" inside a quoted attribute value', () => {
    // The exact hazard html-text-walk.ts documents and lives with; a rewriter cannot.
    const html = '<p title="a > b">Текст</p>';
    const blocks = extractBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].outerHTML).toBe(html);
    expect(blocks[0].text).toBe('Текст');
  });

  it('decodes entities in `text`, normalises NBSP, and leaves `outerHTML` raw', () => {
    // `text` is matched against validator output, which measures decoded textContent. NBSP must
    // normalise: fixNumberFormatting deliberately writes NUM<NBSP>UNIT, so an anchor like
    // "1,75 мм" would never match a block that still held U+00A0.
    const html = '<p>200&nbsp;°C &amp; 1,75&nbsp;мм</p>';
    const [block] = extractBlocks(html);
    expect(block.outerHTML).toBe(html);
    // Built by join so no invisible NBSP can hide inside the expectation literal.
    expect(block.text).toBe(['200', '°C', '&', '1,75', 'мм'].join(' '));
    expect(block.text).not.toContain(NBSP);
  });

  it('collapses whitespace runs in `text` without touching outerHTML', () => {
    const html = '<p>Перше\n   слово   <b>друге</b>\tтретє</p>';
    const [block] = extractBlocks(html);
    expect(block.text).toBe('Перше слово друге третє');
    expect(block.outerHTML).toBe(html);
  });

  it('numbers blocks by their position in the returned list', () => {
    const html = '<p>a</p><p>b</p><p>c</p>';
    expect(extractBlocks(html).map(b => b.index)).toEqual([0, 1, 2]);
  });

  it('survives an unclosed tag instead of throwing', () => {
    const html = '<p>alpha<p>beta</p>';
    expect(extractBlocks(html).map(b => b.text)).toEqual(['alpha', 'beta']);
  });

  it('returns nothing for empty or block-free input', () => {
    expect(extractBlocks('')).toEqual([]);
    expect(extractBlocks('<div><span>plain</span></div>')).toEqual([]);
  });
});
