/**
 * doc-schema-issues.v4.spec.ts — US-2.1 validation category V13 (FR-30).
 *
 * 🔵 THIS WHOLE FILE IS A CHARACTERIZATION SUITE, AND IT IS GREEN ON ARRIVAL EXCEPT FOR ONE TEST.
 * FR-30 restates existing behaviour rather than introducing it, and D16 decides that NO CODE IS
 * ADDED for it: `assertDocRendered` already throws with the unresolved schema failures named, on
 * the stated grounds that persisting an empty description is "a silent data loss that surfaces days
 * later as 'why is this product blank', with no trace of the cause". The plan's obligation here is
 * NEGATIVE — introduce no `'4.0'` → `'3.0'` fallback anywhere — and a negative obligation is
 * exactly the kind that rots without a test naming it.
 *
 * WHY FR-30 NEEDED A STATED OUTCOME AT ALL. This Story adds a constraint of a class the repair
 * ladder has already failed on once — the FR-17 combined §2 ceiling names no single field, so
 * `repair-strategy.ts` has no tier-0 target for it and it degrades to a fuller regeneration, which
 * is the same shape of miss that exhausted the budget on 2026-08-17 and caused the `keyBenefits`
 * bullets floor to be relaxed. What happens at exhaustion therefore had to be a requirement rather
 * than an assumption.
 *
 * WHY A SOURCE SCAN FOR THE NEGATIVE. "No code path retries as `'3.0'`" is not observable from any
 * single call: it is the absence of a branch. The repository already checks negatives it cannot
 * observe by reading the diff (`git diff --stat` acceptance checks throughout the task breakdown);
 * reading the source is the runnable form of the same check.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertDocRendered } from './doc-schema-issues';
import type { ValidationIssue } from '../utils/output-validator';

const schemaFailure = (detail: string): ValidationIssue => ({
  severity: 'error',
  rule: 'doc-schema',
  detail,
  context: 'Doc (uk-UA)',
});

describe('V13 / FR-30 — an exhausted repair budget fails loudly and saves nothing', () => {
  it('throws rather than returning an empty artifact', () => {
    expect(() => assertDocRendered('', 'Doc (uk-UA)', [])).toThrow();
  });

  /**
   * "An error NAMING the unresolved schema failures" is the requirement, not merely an error. A
   * message that said only "generation failed" would leave the log without the field the model kept
   * getting wrong — which is the whole reason the issues are folded in.
   */
  it('names every unresolved schema failure in the message', () => {
    const issues = [
      schemaFailure('keyBenefits: the combined §2 list has 12 items; the maximum is 8.'),
      schemaFailure('functionality.0.subsections: a §3 group opens <h3> only with 2+ sub-functions.'),
    ];

    let thrown: Error | undefined;
    try {
      assertDocRendered('   ', 'Doc (uk-UA)', issues);
    } catch (e) {
      thrown = e as Error;
    }

    expect(thrown).toBeDefined();
    expect(thrown!.message).toContain('Doc (uk-UA)');
    expect(thrown!.message).toContain('nothing to save');
    expect(thrown!.message).toContain('keyBenefits: the combined §2 list has 12 items');
    expect(thrown!.message).toContain('functionality.0.subsections');
  });

  it('lets a non-empty artifact through untouched', () => {
    expect(() => assertDocRendered('<p>Опис.</p>', 'Doc (uk-UA)', [])).not.toThrow();
  });

  /** Whitespace is not content — an artifact of spaces is the same silent data loss. */
  it('treats a whitespace-only artifact as empty', () => {
    expect(() => assertDocRendered('\n\t  \n', 'Doc (uk-UA)', [])).toThrow();
  });
});

describe('V13 / FR-30 — the negative: no `4.0` → `3.0` downgrade path exists', () => {
  const read = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

  /**
   * 🔴 THE ONE RED TEST IN THIS FILE. `task-a-doc.ts` still pins `"schemaVersion": "3.0"` today, so
   * this fails until T7 — which is exactly the point: FR-15 requires every new generation to emit
   * `'4.0'`, and a prompt that names `'3.0'` is a downgrade the model can take on its own.
   */
  it('the Doc prompt offers the model no `3.0`', () => {
    expect(read('../prompts/task-a-doc.ts')).not.toMatch(/"schemaVersion":\s*"3\.0"/);
  });

  /**
   * The orchestrator must never construct or patch a document's version. `'3.0'` may legitimately
   * appear in the SCHEMA (the enum admits it, per OD-2) and in test fixtures; it must not appear as
   * an assignment on the generation path.
   */
  it.each([
    ['the orchestrator', '../services/content-orchestrator.service.ts'],
    ['the Doc repair gate', './doc-schema-issues.ts'],
    ['the repair strategy', '../utils/repair-strategy.ts'],
  ])('%s assigns no schemaVersion at all', (_label, path) => {
    expect(read(path)).not.toMatch(/schemaVersion\s*[:=]\s*['"`]3\.0['"`]/);
  });

  /** The renderer BRANCHES on the version; it never writes one. */
  it('the renderer reads schemaVersion but never assigns it', () => {
    const source = read('./render-description.ts');
    expect(source).not.toMatch(/schemaVersion\s*=\s*['"`]/);
  });
});
