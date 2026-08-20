import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';
import { LEAKED_PREAMBLE_PATTERN, normalizeForIntegrityCheck } from './llm-output-integrity';

/**
 * Same leaked-preamble backstop as translation-integrity.ts, minus the structural first/last-
 * character comparison: Copywriter is a stylistic rewrite, not a 1:1 markup-preserving
 * translation, so it has no "the output's first character mirrors the input's" promise to check.
 * What it does promise ("NO markdown code blocks. Return RAW HTML string only.") is checked at
 * the weaker level that promise actually supports: when the source is HTML, the rewrite must
 * open with a tag too — not necessarily the SAME tag.
 */
export function validateCopywriterIntegrity(output: string, input: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cleanOutput = normalizeForIntegrityCheck(output);
  const cleanInput = normalizeForIntegrityCheck(input);

  if (LEAKED_PREAMBLE_PATTERN.test(cleanOutput)) {
    issues.push({
      severity: 'error',
      rule: 'copywriter-leaked-preamble-phrase',
      detail: 'Output opens with a self-correction/meta phrase (e.g. "Wait,", "Actually,") ' +
        'that must never reach the emitted rewrite.',
      context: 'Copywriter output',
    });
  }

  if (/^</.test(cleanInput) && !cleanOutput.startsWith('<')) {
    issues.push({
      severity: 'error',
      rule: 'copywriter-leaked-preamble-structural',
      detail: 'Source text is HTML, so the rewrite must open with a tag too — per the "Return ' +
        'RAW HTML string only" contract. This shape matches a leaked preamble/self-correction ' +
        'fragment shipped ahead of the actual rewrite.',
      context: 'Copywriter output',
    });
  }

  return issues;
}

/**
 * Same reasoning as translation-integrity.ts's withTranslateFeedback: buildCopywriterPrompt's
 * `userContent` is the source text (prefixed only by a static "[SOURCE TEXT]" label, no
 * per-request framing to append feedback into), so feedback goes into a new, uncached system
 * block instead of `appendRepairFeedback`'s default of appending to `userContent`.
 */
export function withCopywriterFeedback(payload: PromptPayload, errors: ValidationIssue[]): PromptPayload {
  const feedbackLines = errors.map(i => `- ${i.detail}`).join('\n');
  return {
    systemBlocks: [
      ...payload.systemBlocks,
      {
        text: `[VALIDATION FEEDBACK — REVISION REQUIRED]\nYour previous output failed:\n${feedbackLines}\nReturn a corrected rewrite with no preamble, no self-correction narration.`,
        cache: false,
      },
    ],
    userContent: payload.userContent,
  };
}
