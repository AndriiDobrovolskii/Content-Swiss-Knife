import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';
import { LEAKED_PREAMBLE_PATTERN, normalizeForIntegrityCheck } from './llm-output-integrity';

/**
 * Deterministic backstop against the leaked-preamble failure mode (a self-correction fragment
 * like "Wait, corrected below." shipped ahead of the actual translation). Two layers:
 *
 * - Layer 1 (structural, markup input only): checks exactly what TRANSLATOR_SYSTEM_BLOCK
 *   already promises in its own words (task-translate.ts) — the output opens with the same
 *   opening tag the input starts with, and mirrors the input's closing tag when the input ends
 *   on one. No-ops on plain-text input, where there is no structural ground truth to compare.
 * - Layer 2 (pattern, all input): tests the output against LEAKED_PREAMBLE_PATTERN regardless
 *   of input shape — the only coverage plain-text Translator input gets.
 */
export function validateTranslationIntegrity(output: string, input: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cleanOutput = normalizeForIntegrityCheck(output);
  const cleanInput = normalizeForIntegrityCheck(input);

  // Layer 2 — runs regardless of input shape.
  if (LEAKED_PREAMBLE_PATTERN.test(cleanOutput)) {
    issues.push({
      severity: 'error',
      rule: 'translator-leaked-preamble-phrase',
      detail: 'Output opens with a self-correction/meta phrase (e.g. "Wait,", "Actually,") ' +
        'that must never reach the emitted translation.',
      context: 'Translator output',
    });
  }

  // Layer 1 — markup input only.
  if (/^</.test(cleanInput)) {
    if (!cleanOutput.startsWith('<')) {
      issues.push({
        severity: 'error',
        rule: 'translator-leaked-preamble-structural',
        detail: 'Input is markup, so the translation must open with the same opening tag the ' +
          'input starts with. This shape matches a leaked preamble/self-correction fragment ' +
          'shipped ahead of the actual translation.',
        context: 'Translator output',
      });
    }
    // Gated to '>' specifically, not "compare the two last characters" — a mixed fragment
    // like input `<span>Привіт</span> світ` legitimately ends on a plain-text word, and its
    // translation legitimately ends on a different plain-text word in the target language.
    // Comparing raw last characters would false-positive on exactly that ordinary case. Only
    // when the input's own last character is a closing tag's '>' does "the output's last
    // character mirrors it" hold as a real invariant worth enforcing.
    if (cleanInput.endsWith('>') && !cleanOutput.endsWith('>')) {
      issues.push({
        severity: 'error',
        rule: 'translator-trailing-mismatch',
        detail: 'Input ends with a closing tag (">") but the output does not — per ' +
          'TRANSLATOR_SYSTEM_BLOCK\'s own output contract.',
        context: 'Translator output',
      });
    }
  }

  return issues;
}

/**
 * `appendRepairFeedback` (repair-gate.ts) appends feedback to `payload.userContent` — wrong here,
 * because `buildTranslatePrompt`'s `userContent` is the raw source text with no framing
 * (task-translate.ts: `userContent: text`). Appending feedback there would ask the model to
 * translate the feedback block itself. This appends a new, uncached system block instead, leaving
 * `userContent` — and therefore what gets translated — untouched.
 */
export function withTranslateFeedback(payload: PromptPayload, errors: ValidationIssue[]): PromptPayload {
  const feedbackLines = errors.map(i => `- ${i.detail}`).join('\n');
  return {
    systemBlocks: [
      ...payload.systemBlocks,
      {
        text: `[VALIDATION FEEDBACK — REVISION REQUIRED]\nYour previous output failed:\n${feedbackLines}\nReturn a corrected translation with no preamble, no self-correction narration.`,
        cache: false,
      },
    ],
    userContent: payload.userContent,
  };
}
