import { describe, it, expect } from 'vitest';
import { buildCopywriterPrompt } from './copywriter';
import type { WebsiteOption, WebsiteGroup } from '../app/types';

function website(name: string, group: WebsiteGroup): WebsiteOption {
  return { name, group, url: '' };
}

describe('buildCopywriterPrompt — payload shape', () => {
  it('returns a PromptPayload with one cached system block and the source text in userContent', () => {
    const payload = buildCopywriterPrompt(website('EXPERT3D', 'ES'), 'Original description.');
    expect(payload.systemBlocks).toHaveLength(1);
    expect(payload.systemBlocks[0].cache).toBe(true);
    expect(payload.userContent).toBe('[SOURCE TEXT]\nOriginal description.');
  });

  it('keeps the source text out of the cached system block', () => {
    const payload = buildCopywriterPrompt(website('EXPERT3D', 'ES'), 'Unique marker XYZ123.');
    expect(payload.systemBlocks[0].text).not.toContain('Unique marker XYZ123');
  });
});

describe('buildCopywriterPrompt — market localization context', () => {
  it('EXPERT3D (ES group) gets the Castilian Spanish tone block', () => {
    const payload = buildCopywriterPrompt(website('EXPERT3D', 'ES'), 'x');
    expect(payload.systemBlocks[0].text).toContain('Spain Market');
  });

  it('Center 3D Print (EU group) gets the EU language priority block', () => {
    const payload = buildCopywriterPrompt(website('Center 3D Print', 'EU'), 'x');
    expect(payload.systemBlocks[0].text).toContain('EU Market');
  });

  it('Expert-3DPrinter (US group) gets the US measurement rules and market block', () => {
    const payload = buildCopywriterPrompt(website('Expert-3DPrinter', 'US'), 'x');
    expect(payload.systemBlocks[0].text).toContain('US Market');
    expect(payload.systemBlocks[0].text).toContain('MIXED US STANDARD');
  });
});

describe('buildCopywriterPrompt — output contract', () => {
  it('forbids markdown code fences and demands raw HTML', () => {
    const payload = buildCopywriterPrompt(website('EXPERT3D', 'ES'), 'x');
    expect(payload.systemBlocks[0].text).toContain('Return RAW HTML string only');
  });
});
