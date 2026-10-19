/**
 * us91-master.ts - helpers for the US-9.1 master-prompt pin specs: locate a block of
 * `MASTER_SYSTEM_PROMPT` by its heading and compare over whitespace-collapsed text.
 *
 * Test helper only; nothing here asserts. Specification "Assertion convention": comparison is case-sensitive
 * over the text with every run of whitespace (including line breaks) collapsed to one space on both sides.
 */
import { MASTER_SYSTEM_PROMPT } from '../../src/prompt-core/master-system-prompt';

export const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The whole master, collapsed. */
export const MASTER = collapse(MASTER_SYSTEM_PROMPT);

/**
 * The raw master text from `start` (found as a whole line or a prefix of a line) up to the next line that
 * begins with `end` (exclusive), collapsed. Fails the calling test with a clear message when a marker is gone.
 */
export function blockBetween(start: string, end: string): string {
  const a = MASTER_SYSTEM_PROMPT.indexOf(start);
  if (a < 0) throw new Error(`master block start not found: ${JSON.stringify(start)}`);
  const b = MASTER_SYSTEM_PROMPT.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`master block end not found after ${JSON.stringify(start)}: ${JSON.stringify(end)}`);
  return collapse(MASTER_SYSTEM_PROMPT.slice(a, b));
}

/** `[VIDEO]` heading line to the next `[...]` heading line. */
export const videoBlock = (): string => {
  const a = MASTER_SYSTEM_PROMPT.indexOf('\n[VIDEO]\n');
  if (a < 0) throw new Error('master [VIDEO] heading not found');
  const rest = MASTER_SYSTEM_PROMPT.slice(a + 1);
  const next = rest.slice('[VIDEO]\n'.length).search(/\n\[[A-Z][^\n]*\]\n/);
  return collapse(next < 0 ? rest : rest.slice(0, '[VIDEO]\n'.length + next));
};

/** The IMAGE GROUNDING LOCK block: from its heading to the next top-level label (`ALT TEXT:`). */
export const groundingLockBlock = (): string => blockBetween('IMAGE GROUNDING LOCK (', '\nALT TEXT:');

/** The PLACEMENT block: from `PLACEMENT — STRICT RULES:` to the `[FORMAT]` heading. */
export const placementBlock = (): string => blockBetween('PLACEMENT — STRICT RULES:', '\n[FORMAT]');

/** One `- ` bullet of the `[SOURCE FIDELITY]` block, from `- <name>:` to the next `\n- ` bullet. */
export function sourceFidelityBullet(name: string): string {
  const a = MASTER_SYSTEM_PROMPT.indexOf(`- ${name}`);
  if (a < 0) throw new Error(`[SOURCE FIDELITY] bullet not found: ${name}`);
  const next = MASTER_SYSTEM_PROMPT.indexOf('\n- ', a + 3);
  return collapse(MASTER_SYSTEM_PROMPT.slice(a, next < 0 ? undefined : next));
}
