/**
 * output-integrity-wiring.spec.ts
 *
 * Repo-wide wiring guard, styled after src/services/seo-currency-wiring.spec.ts's "the check
 * stays disabled" pattern — inverted: asserts every LLM prompt builder in the app embeds
 * NO_LEAKED_REASONING_CLAUSE somewhere in what it sends the model. Catches future drift if a
 * builder's contract text is edited without going through the shared constant.
 *
 * Covers every builder identified by the leaked-reasoning investigation (both non-frozen and
 * the frozen files edited with explicit user approval this session): task-translate.ts,
 * optimizer.ts, copywriter.ts, task-faq.ts, readability.ts, keywords.ts, image-alt.ts,
 * master-system-prompt.ts (via task-a.ts), task-a.ts (both branches), task-b.ts, task-c.ts (all
 * six store-variant instructions).
 */
import { describe, it, expect } from 'vitest';
import { NO_LEAKED_REASONING_CLAUSE } from '../prompt-core/constants';
import { buildTranslatePrompt } from './task-translate';
import { buildOptimizerPrompt } from './optimizer';
import { buildCopywriterPrompt } from './copywriter';
import { buildPromptFaq } from './task-faq';
import { buildReadabilityPrompt } from './readability';
import { buildKeywordsPrompt } from './keywords';
import { buildImageAltPrompt } from './image-alt';
import { buildPromptA } from './task-a';
import { buildPromptB } from './task-b';
import { buildPromptC } from './task-c';
import type { ProductInput, WebsiteGroup, WebsiteOption } from '../app/types';

const flatten = (payload: { systemBlocks: { text: string }[]; userContent?: string }) =>
  payload.systemBlocks.map(b => b.text).join('\n') + (payload.userContent ?? '');

const WEBSITE: WebsiteOption = { name: 'EXPERT3D', group: 'ES' as WebsiteGroup, url: 'https://impresora-3d.es' };

const PRODUCT_INPUT: ProductInput = {
  website: WEBSITE,
  name: 'Formlabs Fuse X1',
  description: 'An SLS 3D printer.',
  specs: 'Build volume | 330 × 330 × 565 mm',
};

describe('NO_LEAKED_REASONING_CLAUSE wiring — non-frozen builders', () => {
  it('task-translate.ts (buildTranslatePrompt)', () => {
    const payload = buildTranslatePrompt('<p>x</p>', 'German', 'user-facing-content');
    expect(flatten(payload)).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('optimizer.ts (buildOptimizerPrompt)', () => {
    expect(flatten(buildOptimizerPrompt('<p>x</p>'))).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('copywriter.ts (buildCopywriterPrompt)', () => {
    expect(flatten(buildCopywriterPrompt(WEBSITE, 'Original text.'))).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('task-faq.ts (buildPromptFaq)', () => {
    const payload = buildPromptFaq('Product', 'Description', 'Specs', '', 'English', '$');
    expect(flatten(payload)).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('readability.ts (buildReadabilityPrompt)', () => {
    expect(buildReadabilityPrompt('Some text.')).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('keywords.ts (buildKeywordsPrompt)', () => {
    expect(buildKeywordsPrompt('Product', 'Description')).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('image-alt.ts (buildImageAltPrompt)', () => {
    expect(buildImageAltPrompt()).toContain(NO_LEAKED_REASONING_CLAUSE);
  });
});

describe('NO_LEAKED_REASONING_CLAUSE wiring — frozen builders (edited with approval this session)', () => {
  it('master-system-prompt.ts, reached via buildPromptA systemBlocks[0]', () => {
    expect(buildPromptA(PRODUCT_INPUT).systemBlocks[0].text).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('task-a.ts — standard schema branch', () => {
    expect(flatten(buildPromptA(PRODUCT_INPUT))).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('task-a.ts — consumables branch', () => {
    const consumablesInput: ProductInput = { ...PRODUCT_INPUT, templateId: 'consumables-resin' };
    expect(flatten(buildPromptA(consumablesInput))).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('task-b.ts (buildPromptB)', () => {
    const payload = buildPromptB('EXPERT3D', 'Formlabs Fuse X1', ['en-ES']);
    expect(flatten(payload)).toContain(NO_LEAKED_REASONING_CLAUSE);
  });

  it('task-c.ts — every store-variant instruction carries the clause', () => {
    const html = '<p>Sample product description.</p>';
    const variants: Array<[string, string, string?]> = [
      ['generic', buildPromptC(html, 'PL', 'Center 3D Print').systemBlocks[1].text],
      ['EU_EN', buildPromptC(html, 'European English', 'Center 3D Print').systemBlocks[1].text],
      ['US_UK', buildPromptC(html, 'Ukrainian (Expert-3DPrinter)', 'Expert-3DPrinter').systemBlocks[1].text],
      ['usInstruction', buildPromptC(html, 'American English', 'Expert-3DPrinter').systemBlocks[1].text],
      ['EXPERT3D_ES', buildPromptC(html, 'Spanish (EXPERT3D)', 'EXPERT3D').systemBlocks[1].text],
      ['EXPERT3D_PT', buildPromptC(html, 'Portuguese (EXPERT3D)', 'EXPERT3D').systemBlocks[1].text],
    ];
    for (const [label, text] of variants) {
      expect(text, label).toContain(NO_LEAKED_REASONING_CLAUSE);
    }
  });
});
