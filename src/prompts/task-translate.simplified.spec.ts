/**
 * US-2.2 T8 / T9 — FR-19: the translation prompts of a simplified template translate only what the
 * master document contains, never re-add or expand an omitted paragraph, and enforce no length
 * limit. Covers both translators: `buildTranslatePrompt` (Doc pipeline, gains an optional trailing
 * `templateId`) and the FROZEN `buildPromptC` (legacy path, already takes `templateId`).
 *
 * The removed consumables overlay must be gone from both (OD-4).
 */
import { describe, it, expect } from 'vitest';
import { buildTranslatePrompt } from './task-translate';
import { buildPromptC } from './task-c';
import type { PromptPayload } from '../prompt-core/payload';
import { addedLines } from '../../test/fixtures/prompt-clauses';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

const TPLS = ['filaments-resins-powders', 'accessories', 'spare-parts'] as const;
const JSON_DOC = '{"schemaVersion":"4.0","locale":"uk-UA","hook":"<b>X</b> — текст","cta":{"heading":"h","text":"t"}}';
const HTML = '<p><b>X</b> — текст.</p>';

const allText = (p: PromptPayload) => p.systemBlocks.map(b => b.text).join('\n');

function clauseText(withTpl: PromptPayload, without: PromptPayload): string {
  // What the template added, wherever it was added (a system block or userContent).
  return `${addedLines(allText(without), allText(withTpl))}\n${addedLines(without.userContent, withTpl.userContent)}`;
}

function expectFr19(added: string) {
  expect(added.trim().length).toBeGreaterThan(0);
  expect(added).toMatch(/(only|just)\b[^.]{0,80}\b(present|contain|exist|includ)/i);          // translate only what the master has
  expect(added).toMatch(/(do not|don't|never|must not)\b[^.]{0,80}\b(add|invent|re-?add|expand|restore|introduc)/i); // never add
  expect(added).toMatch(/omitted|absent|missing|not present|does not contain/i);              // names the omission
  expect(added).toMatch(/(no|without|not\s+enforce|not\s+apply)\b[^.]{0,60}\b(length|word|character)/i); // no length limits
  expect(added).not.toMatch(/5500/);
  expect(added).not.toMatch(/\bhard\s+limit\b/i);
  expect(added).not.toMatch(/§C\d|consumable/i);
}

describe('buildTranslatePrompt (Doc pipeline) — FR-19', () => {
  const plain = buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content');
  for (const tpl of TPLS) {
    it(`${tpl}: carries the preserve-omissions clause`, () => {
      const p = buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', tpl);
      expectFr19(clauseText(p, plain));
    });
    it(`${tpl}: the clause also applies to a Ukrainian target with the style guide`, () => {
      const base = buildTranslatePrompt(JSON_DOC, 'Ukrainian', 'user-facing-content');
      const p = buildTranslatePrompt(JSON_DOC, 'Ukrainian', 'user-facing-content', tpl);
      expectFr19(clauseText(p, base));
    });
    it(`${tpl}: userContent is still the untouched source text`, () => {
      expect(buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', tpl).userContent).toBe(JSON_DOC);
    });
  }
  it('names no specific paragraph as "always translate" (the set is whatever the master holds)', () => {
    const p = buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', 'spare-parts');
    expect(clauseText(p, plain)).not.toMatch(/must (translate|include|emit)[^.]{0,40}§[2-9]/i);
  });
  it('undefined, empty and unknown ids add nothing (Full description is byte-identical)', () => {
    expect(buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', undefined)).toEqual(plain);
    expect(buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', '')).toEqual(plain);
    expect(buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', STALE_TEMPLATE_ID)).toEqual(plain);
  });
  it('the cached system-block layout is unchanged: still two blocks, both cached', () => {
    const p = buildTranslatePrompt(JSON_DOC, 'German', 'user-facing-content', 'accessories');
    expect(p.systemBlocks).toHaveLength(2);
    expect(p.systemBlocks.every(b => b.cache === true)).toBe(true);
  });
});

describe('buildPromptC (legacy path, FROZEN) — FR-19 and consumables overlay removal', () => {
  const plain = buildPromptC(HTML, 'European English', 'Expert-3DPrinter', 'US');
  for (const tpl of TPLS) {
    it(`${tpl}: carries the preserve-omissions clause`, () => {
      const p = buildPromptC(HTML, 'European English', 'Expert-3DPrinter', 'US', tpl);
      expectFr19(clauseText(p, plain));
    });
  }
  it('no template id, and a stale template id, produce the same prompt (overlay is gone)', () => {
    expect(buildPromptC(HTML, 'European English', 'Expert-3DPrinter', 'US', STALE_TEMPLATE_ID)).toEqual(plain);
  });
  it('nothing in any simplified translation prompt mentions the consumables schema', () => {
    for (const tpl of TPLS) {
      expect(allText(buildPromptC(HTML, 'European English', 'Expert-3DPrinter', 'US', tpl))).not.toMatch(/§C[1-6]|CONSUMABLES/);
    }
  });
});
