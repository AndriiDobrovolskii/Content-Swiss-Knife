/**
 * task-c.faq.spec.ts — US-8.1 AC-19 (prompt half), FR-12 items 1 to 3, NFR-4, and the other side of
 * AC-18 (an absent or `'description'` `contentKind` is a description).
 *
 * TABLE A SPEC, OWNED BY T1. `buildPromptC` has no `contentKind` option yet, so this file carries a
 * TS2353 diagnostic (excess property) until T1 lands; at runtime the FAQ-variant assertions fail with
 * the description prompt in their hands ("expected ... not to contain '<hr'" and the like). The
 * description-kind guards in the last block are green by design.
 *
 * WHAT IS PINNED. FR-12 gives three minimum content items that "a test pins on the prompt text with a
 * stubbed LLM":
 *   1. translate the FAQ element for element, keeping every <h3>, <p>, <ul>, <li> and adding none;
 *   2. keep the per-language tone / terminology / unit / number rules the description prompt carries;
 *   3. contain no instruction that would add an element outside the five FAQ elements: the
 *      description-only blocks (closing commercial <h2>, delivery-region sentence, H1 LOCK,
 *      "Technical specifications" and "What's in the box" labels) are absent. The forbidden-marker list
 *      below is the plan's D4 list, applied case-sensitively to every system block AND `userContent`.
 *
 * Wording is NOT pinned beyond those three items (OD-5: the exact wording is the builder's). Every
 * check runs over all 16 store x non-master-language pairs derived from STORE_REGISTRY.
 *
 * The FAQ variant is selected by the explicit `contentKind: 'faq'` option and nothing else - never by
 * sniffing `<h3>` (plan Rejected 5): the last block pins that a description full of `<h3>` category
 * headings is still a description when `contentKind` is absent.
 */
import { describe, it, expect } from 'vitest';
import { buildPromptC } from './task-c';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { registryPairs, CORPUS_MASTER_HTML, SNIPPET_HTML, type PairCase } from '../../test/fixtures/task-c-description-inputs';
import type { PromptPayload } from '../prompt-core/payload';

const FAQ_UK =
  '<h3>Чи потрібен підігрів столу?</h3><p><b>Так, рекомендовано.</b> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості — 0,4 мм:</p><ul><li><b>0,4 мм:</b> швидкість;</li><li><b>0,2 мм:</b> деталі.</li></ul>';
const FAQ_UK_OTHER =
  '<h3>Яка швидкість друку?</h3><p>До 300 мм/с на Zyxel-9000 QX.</p>';

const faqPayload = (p: PairCase, html = FAQ_UK, localizedName?: string): PromptPayload =>
  buildPromptC(html, p.lang, p.store, p.group, undefined, { sourceLocale: 'uk-UA', contentKind: 'faq', ...(localizedName ? { localizedName } : {}) });

const everything = (pl: PromptPayload) => `${pl.systemBlocks.map(b => b.text).join('\n')}\n${pl.userContent}`;
const PAIRS = registryPairs();
const label = (p: PairCase) => `${p.store} / ${p.lang}`;

describe('FR-12 item 1: the FAQ translation prompt demands an element-for-element translation', () => {
  it.each(PAIRS.map(p => [label(p), p] as const))('%s', (_n, p) => {
    const system = faqPayload(p).systemBlocks.map(b => b.text).join('\n');
    expect(system).toMatch(/element[- ]for[- ]element/i);
    for (const tag of ['<h3>', '<p>', '<ul>', '<li>']) expect(system, `names ${tag}`).toContain(tag);
    expect(system).toMatch(/(adding none|add none|do not add|don't add|never add|must not add|without adding)/i);
  });

  it('the FAQ to translate reaches userContent verbatim (dynamic data stays out of the cached blocks)', () => {
    for (const p of PAIRS) {
      const pl = faqPayload(p);
      expect(pl.userContent, label(p)).toContain(FAQ_UK);
      expect(pl.userContent, label(p)).toContain(p.store);
    }
  });
});

describe('FR-12 item 3: no description-only instruction survives in a FAQ translation prompt', () => {
  const FORBIDDEN = [
    '</section>', '<hr', '<h2', 'COMMERCIAL CLOSING', 'CTA', 'H1 LOCK',
    'Technical specifications', "What's in the box", '[Delivery',
  ];

  it.each(PAIRS.map(p => [label(p), p] as const))('%s: none of the nine description-only markers appears anywhere', (_n, p) => {
    const text = everything(faqPayload(p));
    const present = FORBIDDEN.filter(m => text.includes(m));
    expect(present).toEqual([]);
  });

  it.each(PAIRS.map(p => [label(p), p] as const))('%s: a localizedName passed alongside contentKind "faq" produces no H1 LOCK and is not echoed', (_n, p) => {
    const text = everything(faqPayload(p, FAQ_UK, 'Ortur H20 20 W — localized H1'));
    expect(text).not.toContain('H1 LOCK');
    expect(text).not.toContain('localized H1');
  });

  it.each(PAIRS.map(p => [label(p), p] as const))('%s: the 35 KB description master prompt is not part of the FAQ variant', (_n, p) => {
    const system = faqPayload(p).systemBlocks.map(b => b.text);
    for (const slice of [MASTER_SYSTEM_PROMPT, MASTER_SYSTEM_PROMPT.slice(0, 400), MASTER_SYSTEM_PROMPT.slice(3000, 3400)]) {
      expect(system.some(t => t.includes(slice))).toBe(false);
    }
  });

  it('the FAQ translation prompt is a different payload from the description prompt for the same input', () => {
    for (const p of PAIRS) {
      const faq = faqPayload(p);
      const description = buildPromptC(FAQ_UK, p.lang, p.store, p.group, undefined, { sourceLocale: 'uk-UA' });
      expect(faq.systemBlocks.map(b => b.text), label(p)).not.toEqual(description.systemBlocks.map(b => b.text));
    }
  });
});

describe('FR-12 item 2: the per-language rules are kept, picked by the same language dispatch as the description path', () => {
  // The dispatch keys are the Task C language labels `bcp47ToTaskCLang` produces. Each row names what
  // the language's FAQ wording must at least identify itself as; nothing about exact phrasing.
  const IDENTITY: Array<[string, RegExp]> = [
    ['PL', /polish/i], ['RU', /russian/i], ['DE', /german/i], ['UA', /ukrainian/i], ['Ukrainian', /ukrainian/i],
    ['European English', /(british|european) english/i], ['American English', /american english|en-US/i],
    ['American Spanish', /spanish/i], ['ES', /spanish/i], ['PT', /portuguese/i],
  ];
  const DECIMAL_COMMA_LANGS = new Set(['PL', 'RU', 'DE', 'UA', 'ES', 'PT', 'Ukrainian']);

  it('premise: every task language the registry produces is covered by a row above', () => {
    const covered = new Set(IDENTITY.map(([k]) => k));
    expect([...new Set(PAIRS.map(p => p.lang))].filter(l => !covered.has(l))).toEqual([]);
  });

  it.each(PAIRS.map(p => [label(p), p] as const))('%s: a cached language block names its language and states unit and number rules', (_n, p) => {
    const pl = faqPayload(p);
    expect(pl.systemBlocks.length).toBeGreaterThanOrEqual(2);
    const languageBlocks = pl.systemBlocks.slice(1).map(b => b.text).join('\n');
    const [, identity] = IDENTITY.find(([k]) => k === p.lang)!;
    expect(languageBlocks).toMatch(identity);
    expect(languageBlocks).toMatch(/unit/i);
    expect(languageBlocks).toMatch(/number|decimal|separator/i);
    if (DECIMAL_COMMA_LANGS.has(p.lang)) expect(languageBlocks).toMatch(/decimal/i);
  });

  it('EXPERT3D Castilian Spanish keeps the formal register (usted) of its Tone of Voice', () => {
    const pl = faqPayload({ store: 'EXPERT3D', group: 'ES', lang: 'ES' });
    expect(pl.systemBlocks.map(b => b.text).join('\n')).toMatch(/usted/i);
  });

  it('different languages of one store get different language blocks', () => {
    const byStore = new Map<string, string[]>();
    for (const p of PAIRS) {
      const t = faqPayload(p).systemBlocks.slice(1).map(b => b.text).join('\n');
      byStore.set(p.store, [...(byStore.get(p.store) ?? []), t]);
    }
    for (const [store, blocks] of byStore) expect(new Set(blocks).size, store).toBe(blocks.length);
  });
});

describe('NFR-4: caching - system blocks stay cached, stable across calls, and hold no per-product data', () => {
  it.each(PAIRS.map(p => [label(p), p] as const))('%s', (_n, p) => {
    const a = faqPayload(p, FAQ_UK);
    const b = faqPayload(p, FAQ_UK_OTHER);
    expect(a.systemBlocks.length).toBeGreaterThanOrEqual(2);
    expect(a.systemBlocks.every(blk => blk.cache === true)).toBe(true);
    expect(a.systemBlocks).toEqual(b.systemBlocks);
    for (const blk of a.systemBlocks) {
      expect(blk.text).not.toContain('Чи потрібен підігрів столу');
      expect(blk.text).not.toContain('Zyxel-9000');
    }
    expect(a.userContent).toContain(FAQ_UK);
    expect(b.userContent).toContain(FAQ_UK_OTHER);
  });

  it('a build is a pure function of its input', () => {
    for (const p of PAIRS) expect(JSON.stringify(faqPayload(p))).toBe(JSON.stringify(faqPayload(p)));
  });
});

describe('AC-18, other side: only the explicit option selects the FAQ variant', () => {
  it.each(PAIRS.map(p => [label(p), p] as const))('%s: contentKind "description" and an absent contentKind build the same prompt', (_n, p) => {
    const absent = buildPromptC(CORPUS_MASTER_HTML, p.lang, p.store, p.group, undefined, { sourceLocale: 'uk-UA' });
    const explicit = buildPromptC(CORPUS_MASTER_HTML, p.lang, p.store, p.group, undefined, { sourceLocale: 'uk-UA', contentKind: 'description' });
    expect(JSON.stringify(explicit)).toBe(JSON.stringify(absent));
  });

  it('a description full of <h3> category headings is NOT taken for a FAQ without the option (no HTML sniffing)', () => {
    const p = PAIRS[0];
    const sniffBait = '<section class="specs"><h3>Загальні</h3><table><tr><td>Вага</td><td>1 кг</td></tr></table></section><h3>Питання?</h3><p>Відповідь.</p>';
    const pl = buildPromptC(sniffBait, p.lang, p.store, p.group, undefined, { sourceLocale: 'uk-UA' });
    expect(pl.systemBlocks.map(b => b.text)).toContain(MASTER_SYSTEM_PROMPT);
  });

  it('the snippet (standalone) description path is unaffected too', () => {
    const p = PAIRS[0];
    const pl = buildPromptC(SNIPPET_HTML, p.lang, p.store, p.group);
    expect(pl.systemBlocks[0].text).toBe(MASTER_SYSTEM_PROMPT);
  });
});
