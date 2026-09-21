/**
 * prompt-clauses.ts — how the US-2.2 prompt specs read "the prompt requests paragraph N".
 *
 * AC-3..AC-5 say the built prompt "requests paragraphs 1, 2, 4, 5, 7, 8 and requests no §3, §6 or
 * §9 content". A prompt is prose, so the observable is: a paragraph is REQUESTED when some clause
 * names it as `§N` without negating it, and OMITTED when every clause that names it carries a
 * negation. A clause is a fragment between sentence/semicolon/newline boundaries.
 *
 * This is a deliberately loose contract on wording and a strict one on meaning: the builder may
 * phrase the instruction any way it likes, but it may not name an excluded paragraph in a clause
 * that asks for it. The contract is recorded in docs/tests/US-2.2-test-strategy.md.
 *
 * SCOPE OF THE SCANNED TEXT. The master system prompt (systemBlocks[0]) legitimately describes all
 * nine paragraphs for Full description and is excluded. What is scanned is the TEMPLATE-SPECIFIC
 * text: the task block (systemBlocks[1]) and the lines the builder ADDED to userContent relative to
 * the same input built with no template.
 */
import type { PromptPayload } from '../../src/prompt-core/payload';

const NEGATION =
  /\b(no|not|never|omit\w*|exclud\w*|without|skip\w*|absent|forbid\w*|must not|do not|don't|drop|leave out|left out)\b/i;

/** Splits on sentence ends, semicolons and newlines; keeps §-numbers with their decimal-free digits. */
export function clauses(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|;|\n/)
    .map(c => c.trim())
    .filter(Boolean);
}

export interface ParagraphMentions {
  requested: Set<number>;
  negated: Set<number>;
}

export function paragraphMentions(text: string): ParagraphMentions {
  const requested = new Set<number>();
  const negated = new Set<number>();
  for (const clause of clauses(text)) {
    const nums = [...clause.matchAll(/§\s*(\d)/g)].map(m => Number(m[1]));
    if (nums.length === 0) continue;
    const target = NEGATION.test(clause) ? negated : requested;
    nums.forEach(n => target.add(n));
  }
  return { requested, negated };
}

/** Lines of `built` that do not occur (as whole lines) in `base`. */
export function addedLines(base: string, built: string): string {
  const baseLines = new Set(base.split('\n'));
  return built.split('\n').filter(l => !baseLines.has(l)).join('\n');
}

/** Normalises the dash family so "40–85", "40-85" and "40 — 85" compare equal. */
export function normDashes(s: string): string {
  return s.replace(/\s*[–—-]\s*/g, '-');
}

/** Template-specific text of a payload: task block + userContent lines added vs the no-template build. */
export function templateText(built: PromptPayload, baseNoTemplate: PromptPayload, opts: { includeSystemTask: boolean }): string {
  const sys = opts.includeSystemTask ? (built.systemBlocks[1]?.text ?? '') : '';
  return `${sys}\n${addedLines(baseNoTemplate.userContent, built.userContent)}`;
}

export const HAS_SOFT_CEILING_CLAUSE = {
  five500: /5500/,
  soft: /\bsoft\b/i,
  priority: /(absolute|strict)\s+priority|takes?\s+(absolute\s+)?priority|priority\s+over|overrid\w+/i,
  exceed: /exceed/i,
  stripped: /strip|tag/i,
  figcaption: /figcaption|alt\b/i,
};
