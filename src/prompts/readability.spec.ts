import { describe, it, expect } from 'vitest';
import { buildReadabilityPrompt } from './readability';

describe('buildReadabilityPrompt', () => {
  it('embeds the text to analyze', () => {
    expect(buildReadabilityPrompt('Unique marker XYZ123.')).toContain('Unique marker XYZ123.');
  });

  it('truncates very long input to 5000 characters', () => {
    const long = 'a'.repeat(6000);
    const prompt = buildReadabilityPrompt(long);
    expect(prompt).toContain('a'.repeat(5000));
    expect(prompt).not.toContain('a'.repeat(5001));
  });

  it('demands raw JSON only, with the documented fields', () => {
    const prompt = buildReadabilityPrompt('x');
    expect(prompt).toContain('Return ONLY the raw JSON object.');
    expect(prompt).toContain('"optimizedText"');
  });
});
