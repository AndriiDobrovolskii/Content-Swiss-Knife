/**
 * feedback-url.spec.ts
 *
 * Regression guard for buildFeedbackUrl (src/utils/feedback-url.ts).
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildFeedbackUrl, type FeedbackFormConfig } from './feedback-url';

const CONFIGURED: FeedbackFormConfig = {
  baseUrl: 'https://docs.google.com/forms/d/e/1FAIpQL/viewform',
  entryAuthor: 'entry.111',
  entryTool: 'entry.222',
};

const UNCONFIGURED: FeedbackFormConfig = { baseUrl: '', entryAuthor: '', entryTool: '' };

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
});
