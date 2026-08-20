import { describe, it, expect } from 'vitest';
import { buildImageAltPrompt } from './image-alt';

describe('buildImageAltPrompt', () => {
  it('demands exactly one plain-text alt string, no markup, no quotes', () => {
    const prompt = buildImageAltPrompt();
    expect(prompt).toContain('emit exactly one alt-text string');
    expect(prompt).toContain('maximum 20 words');
  });

  it('takes no arguments — the prompt text is fixed, image data goes through a separate vision call', () => {
    expect(buildImageAltPrompt.length).toBe(0);
  });
});
