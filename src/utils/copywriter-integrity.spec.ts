import { describe, it, expect } from 'vitest';
import { validateCopywriterIntegrity, withCopywriterFeedback } from './copywriter-integrity';
import { PromptPayload } from '../prompt-core/payload';

const rules = (issues: ReturnType<typeof validateCopywriterIntegrity>) => issues.map(i => i.rule);

describe('validateCopywriterIntegrity', () => {
  it('flags a leaked preamble ahead of an HTML rewrite', () => {
    const input = '<p>Original description.</p>';
    const output = 'Actually, here is the rewrite: <p>Better description.</p>';
    const issues = validateCopywriterIntegrity(output, input);
    expect(rules(issues)).toContain('copywriter-leaked-preamble-phrase');
    expect(rules(issues)).toContain('copywriter-leaked-preamble-structural');
  });

  it('clean HTML rewrite produces no issues', () => {
    expect(validateCopywriterIntegrity('<p>Rewritten description.</p>', '<p>Original description.</p>')).toEqual([]);
  });

  it('does not require the SAME opening tag — only that a tag opens it (stylistic rewrite, not 1:1)', () => {
    expect(validateCopywriterIntegrity('<h2>Rewritten</h2><p>Body.</p>', '<p>Original.</p>')).toEqual([]);
  });

  it('plain-text source: only the phrase layer applies', () => {
    const issues = validateCopywriterIntegrity('Wait, rewritten text.', 'Original text.');
    expect(rules(issues)).toEqual(['copywriter-leaked-preamble-phrase']);
  });
});

describe('withCopywriterFeedback', () => {
  const basePayload: PromptPayload = {
    systemBlocks: [{ text: 'SYSTEM', cache: true }],
    userContent: '[SOURCE TEXT]\n<p>Original description.</p>',
  };

  it('leaves userContent byte-identical to the source text', () => {
    const result = withCopywriterFeedback(basePayload, [
      { severity: 'error', rule: 'copywriter-leaked-preamble-phrase', detail: 'bad', context: 'Copywriter output' },
    ]);
    expect(result.userContent).toBe(basePayload.userContent);
  });

  it('appends a new uncached system block, without mutating existing ones', () => {
    const result = withCopywriterFeedback(basePayload, [
      { severity: 'error', rule: 'copywriter-leaked-preamble-phrase', detail: 'Output opens with a self-correction phrase.', context: 'Copywriter output' },
    ]);
    expect(result.systemBlocks).toHaveLength(2);
    expect(result.systemBlocks[0]).toEqual(basePayload.systemBlocks[0]);
    expect(result.systemBlocks[1].cache).toBe(false);
    expect(result.systemBlocks[1].text).toContain('self-correction phrase');
  });
});
