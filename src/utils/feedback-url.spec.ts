/**
 * feedback-url.spec.ts
 *
 * Regression guard for buildFeedbackUrl (src/utils/feedback-url.ts).
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildFeedbackUrl, truncateForUrl, type FeedbackFormConfig } from './feedback-url';

const CONFIGURED: FeedbackFormConfig = {
  baseUrl: 'https://docs.google.com/forms/d/e/1FAIpQL/viewform',
  entryAuthor: 'entry.111',
  entryTool: 'entry.222',
  entrySite: 'entry.301',
  entryTemplate: 'entry.302',
  entryProductName: 'entry.303',
  entryInputText: 'entry.304',
  entrySpecs: 'entry.305',
  entrySupplementalContent: 'entry.306',
  entryCustomInstructions: 'entry.307',
  entryLlmDeep: 'entry.308',
  entryLlmFast: 'entry.309',
  entryThinkingEnabled: 'entry.310',
  entrySessionId: 'entry.311',
};

const UNCONFIGURED: FeedbackFormConfig = {
  baseUrl: '', entryAuthor: '', entryTool: '',
  entrySite: '', entryTemplate: '', entryProductName: '', entryInputText: '', entrySpecs: '',
  entrySupplementalContent: '', entryCustomInstructions: '', entryLlmDeep: '', entryLlmFast: '',
  entryThinkingEnabled: '', entrySessionId: '',
};

describe('buildFeedbackUrl', () => {
  it('returns null while the form has not been created yet', () => {
    expect(buildFeedbackUrl(UNCONFIGURED, { author: 'Оля', tool: 'Optimizer' })).toBeNull();
  });

  it('treats a whitespace-only baseUrl as unconfigured', () => {
    expect(buildFeedbackUrl({ ...CONFIGURED, baseUrl: '   ' }, { tool: 'Optimizer' })).toBeNull();
  });

  it('prefills both fields with usp=pp_url', () => {
    const url = buildFeedbackUrl(CONFIGURED, { author: 'Olha', tool: 'Optimizer' });
    expect(url).toBe(`${CONFIGURED.baseUrl}?usp=pp_url&entry.111=Olha&entry.222=Optimizer`);
  });

  it('percent-encodes Cyrillic names and ampersands', () => {
    const url = buildFeedbackUrl(CONFIGURED, { author: 'Оля & Ко', tool: 'HTML-редактор' });
    expect(url).toContain('entry.111=%D0%9E%D0%BB%D1%8F%20%26%20%D0%9A%D0%BE');
    expect(url).toContain('entry.222=HTML-%D1%80%D0%B5%D0%B4%D0%B0%D0%BA%D1%82%D0%BE%D1%80');
  });

  it('omits a missing or blank author but keeps the tool', () => {
    expect(buildFeedbackUrl(CONFIGURED, { tool: 'SEO' }))
      .toBe(`${CONFIGURED.baseUrl}?usp=pp_url&entry.222=SEO`);
    expect(buildFeedbackUrl(CONFIGURED, { author: '  ', tool: 'SEO' }))
      .toBe(`${CONFIGURED.baseUrl}?usp=pp_url&entry.222=SEO`);
  });

  it('trims surrounding whitespace from prefilled values', () => {
    const url = buildFeedbackUrl(CONFIGURED, { author: '  Olha  ', tool: 'SEO' });
    expect(url).toContain('entry.111=Olha&');
  });

  it('skips an entry whose id is not configured', () => {
    const url = buildFeedbackUrl({ ...CONFIGURED, entryTool: '' }, { author: 'Olha', tool: 'SEO' });
    expect(url).toBe(`${CONFIGURED.baseUrl}?usp=pp_url&entry.111=Olha`);
  });

  it('returns the bare baseUrl when there is nothing to prefill', () => {
    expect(buildFeedbackUrl(CONFIGURED, {})).toBe(CONFIGURED.baseUrl);
  });

  it('appends with & when the published URL already carries a query string', () => {
    const cfg = { ...CONFIGURED, baseUrl: `${CONFIGURED.baseUrl}?usp=sf_link` };
    const url = buildFeedbackUrl(cfg, { tool: 'Translator' });
    expect(url).toBe(`${cfg.baseUrl}&usp=pp_url&entry.222=Translator`);
  });

  it('prefills the app-state snapshot fields (site, template, LLM settings, etc.)', () => {
    const url = buildFeedbackUrl(CONFIGURED, {
      site: 'ShopName',
      template: 'consumables-uk',
      productName: 'Filament PLA 1.75mm',
      inputText: 'Опис товару',
      llmDeep: 'anthropic / claude-sonnet-5 / medium',
      llmFast: 'gemini / gemini-3.6-flash / minimal',
      thinkingEnabled: 'так',
      sessionId: 'ab12cd34',
    });
    expect(url).toContain('entry.301=ShopName');
    expect(url).toContain('entry.302=consumables-uk');
    expect(url).toContain('entry.303=Filament%20PLA%201.75mm');
    expect(url).toContain('entry.308=anthropic%20%2F%20claude-sonnet-5%20%2F%20medium');
    expect(url).toContain('entry.310=%D1%82%D0%B0%D0%BA');
    expect(url).toContain('entry.311=ab12cd34');
  });

  it('truncates a large snapshot field instead of blowing the URL open', () => {
    const huge = 'x'.repeat(5000);
    const url = buildFeedbackUrl(CONFIGURED, { inputText: huge });
    const encodedValue = url!.split('entry.304=')[1];
    expect(decodeURIComponent(encodedValue)).toContain('обрізано клієнтом');
    // The truncated value stays within the per-field encoded budget plus the marker itself.
    expect(url!.length).toBeLessThan(2000);
  });
});

describe('truncateForUrl', () => {
  it('leaves a value under the budget untouched', () => {
    expect(truncateForUrl('коротко', 1200)).toBe('коротко');
  });

  it('bounds Latin/ASCII text by encoded length', () => {
    const value = 'a'.repeat(2000);
    const result = truncateForUrl(value, 100);
    const kept = result.split('\n\n[✂')[0];
    expect(kept).toBe('a'.repeat(100)); // 'a' costs 1 encoded char each, so the budget is the raw count too
    expect(encodeURIComponent(kept).length).toBeLessThanOrEqual(100);
    expect(result).toContain('обрізано клієнтом');
  });

  it('bounds Cyrillic text by ENCODED length, not character count — 1 char can cost 6', () => {
    // Every Cyrillic character encodes to 6 chars (%XX%XX), so a 1200-encoded-char budget
    // holds roughly 200 raw characters, not 1200 — this is the whole point of the helper.
    const value = 'привіт '.repeat(500); // ~3500 raw chars
    const result = truncateForUrl(value, 1200);
    const kept = result.split('\n\n[✂')[0];
    expect(encodeURIComponent(kept).length).toBeLessThanOrEqual(1200);
    expect(kept.length).toBeLessThan(300);
  });
});
