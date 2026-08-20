import { describe, it, expect } from 'vitest';
import { validateTranslationIntegrity, withTranslateFeedback } from './translation-integrity';
import { PromptPayload } from '../prompt-core/payload';

const rules = (issues: ReturnType<typeof validateTranslationIntegrity>) => issues.map(i => i.rule);

describe('validateTranslationIntegrity', () => {
  it('the reported regression case: leaked preamble ahead of a correct HTML translation', () => {
    const input = '<p>Formlabs Fuse Sift X1 — станція для відновлення порошку.</p>';
    const output = 'Wait, corrected below. <p>Formlabs Fuse Sift X1 — estación de recuperación de polvo.</p>';
    const issues = validateTranslationIntegrity(output, input);
    expect(issues.length).toBeGreaterThan(0);
    expect(rules(issues)).toContain('translator-leaked-preamble-phrase');
    expect(rules(issues)).toContain('translator-leaked-preamble-structural');
  });

  it('clean HTML translation produces no issues', () => {
    const input = '<p>Привіт світ</p>';
    const output = '<p>Hola mundo</p>';
    expect(validateTranslationIntegrity(output, input)).toEqual([]);
  });

  it('flags a trailing-tag mismatch when the input ends with a closing tag and the output does not', () => {
    const input = '<p>Text</p>';
    const output = '<p>Texto incompleto';
    const issues = validateTranslationIntegrity(output, input);
    expect(rules(issues)).toContain('translator-trailing-mismatch');
  });

  it('does NOT false-positive the trailing check on a mixed fragment ending in plain text', () => {
    // Both start with '<' but the input's last character is a word letter, not '>' — the
    // trailing check must be gated to inputs that end on a closing tag, never a raw
    // last-character comparison (review-pass fix).
    const input = '<span>Привіт</span> світ';
    const output = '<span>Hola</span> mundo';
    expect(validateTranslationIntegrity(output, input)).toEqual([]);
  });

  it('plain-text input with a leaked preamble is caught by the phrase layer only', () => {
    const input = 'Hello world';
    const output = 'Actually, hola mundo';
    const issues = validateTranslationIntegrity(output, input);
    expect(rules(issues)).toEqual(['translator-leaked-preamble-phrase']);
  });

  it('plain-text input with a clean translation produces no issues', () => {
    expect(validateTranslationIntegrity('Hola mundo', 'Hello world')).toEqual([]);
  });

  it('normalizes BOM/whitespace before checking, so a stray BOM ahead of good output is not flagged', () => {
    const bom = String.fromCharCode(0xfeff);
    const input = '<p>Text</p>';
    const output = `${bom}<p>Texto</p>`;
    expect(validateTranslationIntegrity(output, input)).toEqual([]);
  });
});

describe('withTranslateFeedback', () => {
  const basePayload: PromptPayload = {
    systemBlocks: [{ text: 'SYSTEM', cache: true }],
    userContent: '<p>Formlabs Fuse Sift X1</p>',
  };

  it('leaves userContent byte-identical to the source text', () => {
    const result = withTranslateFeedback(basePayload, [
      { severity: 'error', rule: 'translator-leaked-preamble-phrase', detail: 'bad', context: 'Translator output' },
    ]);
    expect(result.userContent).toBe(basePayload.userContent);
  });

  it('appends a new uncached system block carrying the feedback, without mutating existing ones', () => {
    const result = withTranslateFeedback(basePayload, [
      { severity: 'error', rule: 'translator-leaked-preamble-phrase', detail: 'Output opens with a self-correction phrase.', context: 'Translator output' },
    ]);
    expect(result.systemBlocks).toHaveLength(2);
    expect(result.systemBlocks[0]).toEqual(basePayload.systemBlocks[0]);
    expect(result.systemBlocks[1].cache).toBe(false);
    expect(result.systemBlocks[1].text).toContain('self-correction phrase');
  });
});
