import { describe, it, expect } from 'vitest';
import { buildSpecsCanonicalizePrompt } from './task-specs-canonicalize';

describe('buildSpecsCanonicalizePrompt — payload shape', () => {
  it('puts the raw input verbatim into userContent', () => {
    const input = 'Screen: 1.3-inch OLED. Camera: 200,000 pixel.';
    expect(buildSpecsCanonicalizePrompt(input).userContent).toBe(input);
  });

  it('emits exactly one cached system block', () => {
    const payload = buildSpecsCanonicalizePrompt('x');
    expect(payload.systemBlocks).toHaveLength(1);
    expect(payload.systemBlocks[0].cache).toBe(true);
  });
});

describe('buildSpecsCanonicalizePrompt — row rules', () => {
  const block = () => buildSpecsCanonicalizePrompt('x').systemBlocks[0].text;

  it('instructs the canonical two-column table shape', () => {
    expect(block()).toContain('| Item | Specification |');
    expect(block()).toContain('| :--- | :--- |');
  });

  it('forbids inventing or omitting characteristics', () => {
    expect(block()).toMatch(/Do NOT invent/i);
    expect(block()).toMatch(/Do NOT omit/i);
  });

  it('forbids a product-name/title row', () => {
    expect(block()).toMatch(/Do NOT include a product name/i);
  });

  it('forbids translation and number reformatting', () => {
    expect(block()).toMatch(/Do not translate/i);
    expect(block()).toMatch(/byte-identical/i);
  });
});
