import { describe, it, expect } from 'vitest';
import { buildKeywordsPrompt } from './keywords';

describe('buildKeywordsPrompt', () => {
  it('embeds the product name and truncated description', () => {
    const prompt = buildKeywordsPrompt('Formlabs Fuse X1', 'Unique marker XYZ123.');
    expect(prompt).toContain('Formlabs Fuse X1');
    expect(prompt).toContain('Unique marker XYZ123.');
  });

  it('truncates very long description context to 2000 characters', () => {
    const long = 'a'.repeat(3000);
    const prompt = buildKeywordsPrompt('Product', long);
    expect(prompt).toContain('a'.repeat(2000));
    expect(prompt).not.toContain('a'.repeat(2001));
  });

  it('demands a raw JSON array only', () => {
    expect(buildKeywordsPrompt('Product', 'x')).toContain('Return ONLY a raw JSON array of strings.');
  });
});
