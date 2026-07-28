/**
 * block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  applyBlockPatches, extractBlocks, getBlock, parsePatchResponse, planBlockPatches, rejectPatch,
  setBlock,
} from './block-repair';

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

describe('parsePatchResponse', () => {
  it('keys each patch by its block index', () => {
    const response = '<patch block="0"><p>Перше.</p></patch><patch block="3"><li>Третє.</li></patch>';
    expect([...parsePatchResponse(response)]).toEqual([
      [0, '<p>Перше.</p>'],
      [3, '<li>Третє.</li>'],
    ]);
  });

  it('carries double quotes and nested tags through untouched', () => {
    // The whole reason for XML over JSON: no escaping contract to get wrong.
    const inner = '<p class="lead">Текст із <b>жирним</b> та <a href="/x?a=1&amp;b=2">лінком</a>.</p>';
    expect(parsePatchResponse(`<patch block="2">${inner}</patch>`).get(2)).toBe(inner);
  });

  it('ignores commentary and code fences around the patches', () => {
    const response = 'Ось виправлення:\n```html\n<patch block="1"><p>Ок.</p></patch>\n```\nГотово.';
    expect([...parsePatchResponse(response)]).toEqual([[1, '<p>Ок.</p>']]);
  });

  it('tolerates whitespace between the patch tag and its content', () => {
    expect(parsePatchResponse('<patch block="1">\n  <p>Ок.</p>\n</patch>').get(1)).toBe('<p>Ок.</p>');
  });

  it('skips a patch whose block attribute is missing or not a number', () => {
    const response = '<patch><p>a</p></patch><patch block="x"><p>b</p></patch><patch block="1"><p>c</p></patch>';
    expect([...parsePatchResponse(response)]).toEqual([[1, '<p>c</p>']]);
  });

  it('keeps the first patch when a block is addressed twice', () => {
    // First occurrence wins, matching dedupeIssues in validation-issues.ts.
    const response = '<patch block="1"><p>first</p></patch><patch block="1"><p>second</p></patch>';
    expect(parsePatchResponse(response).get(1)).toBe('<p>first</p>');
  });

  it('returns an empty map when the model returned no patches', () => {
    expect(parsePatchResponse('Нічого виправляти не треба.').size).toBe(0);
    expect(parsePatchResponse('').size).toBe(0);
  });

  it('skips an empty patch rather than emitting a blank replacement', () => {
    expect(parsePatchResponse('<patch block="1"></patch>').size).toBe(0);
  });
});

describe('planBlockPatches', () => {
  const HTML = '<p>Перший.</p><p>Другий задовгий.</p><p>Третій.</p>';

  it('carries every instruction for a block in ONE request', () => {
    // Two issues in one block must not become two patches — the second would splice against
    // offsets the first already invalidated.
    const plan = planBlockPatches(HTML, new Map([[1, ['Split the sentence.', 'Replace the calque.']]]));
    expect(plan).toHaveLength(1);
    expect(plan[0].index).toBe(1);
    expect(plan[0].outerHTML).toBe('<p>Другий задовгий.</p>');
    expect(plan[0].instructions).toEqual(['Split the sentence.', 'Replace the calque.']);
  });

  it('attaches the neighbouring blocks as read-only context', () => {
    // Without this the model resolves "Він" to the product name because it cannot see that the
    // name was already given in the previous paragraph.
    const [request] = planBlockPatches(HTML, new Map([[1, ['Split it.']]]));
    expect(request.before).toBe('Перший.');
    expect(request.after).toBe('Третій.');
  });

  it('leaves the missing neighbour empty at the edges of the document', () => {
    const plan = planBlockPatches(HTML, new Map([[0, ['x']], [2, ['y']]]));
    expect(plan[0].before).toBe('');
    expect(plan[1].after).toBe('');
  });

  it('drops an index that addresses no block', () => {
    expect(planBlockPatches(HTML, new Map([[9, ['x']]]))).toEqual([]);
  });

  it('drops a block with no instructions', () => {
    expect(planBlockPatches(HTML, new Map([[1, []]]))).toEqual([]);
  });

  it('orders requests by block index regardless of map insertion order', () => {
    const plan = planBlockPatches(HTML, new Map([[2, ['b']], [0, ['a']]]));
    expect(plan.map(r => r.index)).toEqual([0, 2]);
  });
});
