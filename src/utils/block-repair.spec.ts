/**
 * block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { applyBlockPatches, extractBlocks, getBlock, rejectPatch, setBlock } from './block-repair';

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

describe('getBlock / setBlock', () => {
  const HTML = '<section><p>Перший абзац.</p><hr><p>Другий абзац.</p></section>';

  it('reads the outerHTML the path addresses', () => {
    expect(getBlock(HTML, 'block[1]')).toBe('<p>Другий абзац.</p>');
  });

  it('returns undefined for an out-of-range index rather than throwing', () => {
    // Mirrors getAtPath in repair-strategy.ts: a missing target is "nothing to fix", not a crash.
    expect(getBlock(HTML, 'block[9]')).toBeUndefined();
  });

  it('throws on a malformed path instead of silently doing nothing', () => {
    // A silent no-op would let a failed repair look like a successful one.
    expect(() => getBlock(HTML, 'seo_data[0].meta_title')).toThrow(/unsupported block path/);
    expect(() => setBlock(HTML, 'block', 'x')).toThrow(/unsupported block path/);
  });

  it('replaces exactly the addressed block and leaves every other byte identical', () => {
    const out = setBlock(HTML, 'block[0]', '<p>Коротко.</p>');
    expect(out).toBe('<section><p>Коротко.</p><hr><p>Другий абзац.</p></section>');
  });

  it('throws when the addressed block does not exist', () => {
    expect(() => setBlock(HTML, 'block[9]', '<p>x</p>')).toThrow(/out of range/);
  });
});

describe('applyBlockPatches', () => {
  it('applies several patches at once without corrupting offsets', () => {
    // THE regression guard for offset conflict. Replacements of different lengths applied
    // left-to-right would shift every later range; this must not depend on patch order.
    const html = '<p>alpha</p><p>beta</p><p>gamma</p>';
    const out = applyBlockPatches(html, new Map([
      [0, '<p>a much longer first paragraph</p>'],
      [2, '<p>g</p>'],
    ]));
    expect(out).toBe('<p>a much longer first paragraph</p><p>beta</p><p>g</p>');
  });

  it('is insensitive to the order patches are supplied in', () => {
    const html = '<p>alpha</p><p>beta</p>';
    const forward = applyBlockPatches(html, new Map([[0, '<p>AAAA</p>'], [1, '<p>B</p>']]));
    const reverse = applyBlockPatches(html, new Map([[1, '<p>B</p>'], [0, '<p>AAAA</p>']]));
    expect(forward).toBe(reverse);
    expect(forward).toBe('<p>AAAA</p><p>B</p>');
  });

  it('keeps the innermost block and drops an overlapping outer one', () => {
    // Two ranges that enclose one another cannot both be spliced — the outer patch would swallow
    // the inner replacement. The innermost is the more specific fix, so it wins.
    const html = '<ul><li>Зовнішній<ul><li>Внутрішній</li></ul></li></ul>';
    const out = applyBlockPatches(html, new Map([
      [0, '<li>ПЕРЕПИСАНИЙ ЗОВНІШНІЙ</li>'],
      [1, '<li>Внутрішній, виправлений</li>'],
    ]));
    expect(out).toBe('<ul><li>Зовнішній<ul><li>Внутрішній, виправлений</li></ul></li></ul>');
  });

  it('ignores an index that addresses no block', () => {
    const html = '<p>alpha</p>';
    expect(applyBlockPatches(html, new Map([[7, '<p>x</p>']]))).toBe(html);
  });

  it('is a no-op for an empty patch set', () => {
    const html = '<p>alpha</p><p>beta</p>';
    expect(applyBlockPatches(html, new Map())).toBe(html);
  });
});

describe('rejectPatch', () => {
  const ORIGINAL =
    '<p class="lead">Триярусна структура Ortur H20 20 Вт поєднує кришку та основу в секції.</p>';

  it('accepts a split that preserves tag, attributes and figures', () => {
    const patched =
      '<p class="lead">Триярусна структура Ortur H20 20 Вт поєднує кришку та основу. ' +
      'Вони фіксуються в окремі секції.</p>';
    expect(rejectPatch(ORIGINAL, patched)).toBeNull();
  });

  it('rejects a changed root tag', () => {
    expect(rejectPatch(ORIGINAL, '<div class="lead">Текст.</div>')).toMatch(/root tag/);
  });

  it('rejects added, dropped or changed root attributes', () => {
    expect(rejectPatch(ORIGINAL, '<p>Текст.</p>')).toMatch(/attribute/);
    expect(rejectPatch(ORIGINAL, '<p class="lead" id="x">Текст.</p>')).toMatch(/attribute/);
    expect(rejectPatch(ORIGINAL, '<p class="hook">Текст.</p>')).toMatch(/attribute/);
  });

  it('rejects a fragment that is not exactly one element', () => {
    // Splitting a sentence must stay INSIDE the block. Emitting two <p> changes the document
    // structure, which is the caller's problem to never have to think about.
    expect(rejectPatch(ORIGINAL, '<p class="lead">Перше.</p><p class="lead">Друге.</p>'))
      .toMatch(/exactly one element/);
    expect(rejectPatch(ORIGINAL, 'просто текст')).toMatch(/exactly one element/);
    expect(rejectPatch(ORIGINAL, '')).toMatch(/exactly one element/);
  });

  it('rejects an invented number', () => {
    expect(rejectPatch(ORIGINAL, '<p class="lead">Структура Ortur H20 40 Вт поєднує секції.</p>'))
      .toMatch(/number/);
  });

  it('rejects a dropped number', () => {
    expect(rejectPatch(ORIGINAL, '<p class="lead">Триярусна структура Ortur поєднує секції.</p>'))
      .toMatch(/number/);
  });

  it('allows a number to REPEAT, which a legitimate sentence split does', () => {
    // Set comparison, not multiset: "…швидкість 50 мм/с, що дає…" splits into two sentences that
    // both name 50. Nothing was invented or lost, so nothing is wrong.
    const original = '<p>Він друкує зі швидкістю 50 мм/с, що дає виграш у часі.</p>';
    const patched = '<p>Він друкує зі швидкістю 50 мм/с. Швидкість 50 мм/с дає виграш у часі.</p>';
    expect(rejectPatch(original, patched)).toBeNull();
  });

  it('rejects a changed src or href', () => {
    const withMedia = '<figcaption><a href="/catalog/ortur">Ortur H20 20 Вт</a></figcaption>';
    expect(rejectPatch(withMedia, '<figcaption><a href="/catalog/other">Ortur H20 20 Вт</a></figcaption>'))
      .toMatch(/href|src/);
  });

  it('rejects a dropped image', () => {
    const withImg = '<figcaption><img src="https://cdn/a.jpg" alt="20 Вт"> Підпис</figcaption>';
    expect(rejectPatch(withImg, '<figcaption>Підпис 20 Вт</figcaption>')).toMatch(/href|src/);
  });
});
