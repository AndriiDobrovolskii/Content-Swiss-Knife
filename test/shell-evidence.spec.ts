/**
 * shell-evidence.spec.ts - US-10.4 TEST_WRITING: AC-9 / FR-19, the manual-verification evidence artifact exists and is complete.
 *
 * LOGIC runner. FR-13 (dark tokens, painting layers), FR-14 (light theme), FR-15 (contrast), FR-16 (fit at 1024 px) and the
 * pixel adjacency of the History overlay (FR-11) cannot be asserted automatically: the Tailwind CDN is not loaded by either
 * runner (Specification, Out of scope). They are verified by hand in a real Chromium and recorded in ONE evidence file. This spec
 * does not re-measure anything and does not judge a measured value; it checks the one thing that is mechanical: that the record
 * AC-9 demands is there, is a registered `evidence` artifact, and has every section FR-19 requires, with the hand-off marker lines
 * of the task breakdown. The substance of each measurement stays a human / external-executor responsibility (OD-28).
 *
 * The path comes from the registry pattern `docs/evidence/{story_id}-{slug}-evidence.md` (artifact-paths.yaml) with the slug
 * `shell-manual-verification` fixed by the test strategy (OD-28). The section headings are the procedure pinned by that same
 * strategy ("Evidence file contract").
 *
 * RED until the external executor completes T10 (pause P3, marker `EVIDENCE-COMPLETE: yes`). It is red BY DESIGN throughout
 * T3-T9 and `so-builder` cannot turn it green (it never writes the evidence file); it is part of the P3 hand-off, not of any
 * builder task. Reads one file: no network, no clock.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EVIDENCE = 'docs/evidence/US-10.4-shell-manual-verification-evidence.md';
const abs = join(process.cwd(), ...EVIDENCE.split('/'));
const text = (): string => (existsSync(abs) ? readFileSync(abs, 'utf8').split('\r\n').join('\n') : '');

/** The nine sections FR-19 / DD-13 require, as `## ` headings (strategy "Evidence file contract"). */
const SECTIONS = [
  'M-0 phase 1',
  'M-0 gate 1 verdict',
  'M-0 phase 2',
  'M-0 gate 2 verdict',
  'FR-13 dark tokens and painting layers',
  'FR-14 light theme values',
  'FR-15 contrast',
  'FR-11 overlay geometry',
  'FR-16 fit summary',
] as const;

/**
 * Sections that record a browser measurement: each must name its method, the browser and tool versions, the date and who ran it.
 * The two gate verdicts and the fit summary are decisions taken ON measured tables, so they name the date, who decided and the
 * table they rest on, but involve no browser of their own.
 */
const MEASURED = ['M-0 phase 1', 'M-0 phase 2', 'FR-13 dark tokens and painting layers', 'FR-14 light theme values', 'FR-15 contrast', 'FR-11 overlay geometry'] as const;
const DECIDED = ['M-0 gate 1 verdict', 'M-0 gate 2 verdict', 'FR-16 fit summary'] as const;

/** The body of a `## <title>` section, up to the next `## ` heading, or '' when it is missing. */
function sectionOf(source: string, title: string): string {
  const parts = source.split(/^## /m);
  const hit = parts.find((p) => p.startsWith(`${title}\n`) || p.startsWith(`${title} `) || p === title);
  return hit ?? '';
}

describe('AC-9 / FR-19: the manual-verification evidence artifact is recorded under docs/evidence/', () => {
  it('the evidence file exists at the registered path', () => {
    expect(existsSync(abs), `${EVIDENCE} must exist`).toBe(true);
  });

  it('it opens with the artifact front matter of an `evidence` artifact for US-10.4 (owner as registered)', () => {
    const src = text();
    expect(src, 'evidence file missing or empty').not.toBe('');
    const fm = src.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
    expect(fm, 'front matter block').not.toBe('');
    expect(fm).toMatch(/^artifact: evidence$/m);
    expect(fm).toMatch(/^story: US-10\.4$/m);
    expect(fm).toMatch(/^version: \d+$/m);
    expect(fm).toMatch(/^owner: so-planner$/m);
    for (const key of ['status', 'created_at', 'updated_at', 'supersedes', 'inputs_consumed']) {
      expect(fm, `front matter key ${key}`).toMatch(new RegExp(`^${key}:`, 'm'));
    }
  });

  it.each(SECTIONS)('it has the section "## %s"', (title) => {
    expect(sectionOf(text(), title), `section "${title}"`).not.toBe('');
  });

  it.each(MEASURED)('the measured section "## %s" names its method, the browser and tool versions, the date and who ran it', (title) => {
    const body = sectionOf(text(), title);
    expect(body, `section "${title}"`).not.toBe('');
    for (const field of ['Method', 'Browser', 'Date', 'Run by']) {
      expect(body, `"${title}" must record "${field}"`).toMatch(new RegExp(`${field}\\s*[:|]`, 'i'));
    }
  });

  it.each(DECIDED)('the decision section "## %s" names the date, who decided and the measured table it rests on', (title) => {
    const body = sectionOf(text(), title);
    expect(body, `section "${title}"`).not.toBe('');
    for (const field of ['Date', 'Run by', 'Based on']) {
      expect(body, `"${title}" must record "${field}"`).toMatch(new RegExp(`${field}\\s*[:|]`, 'i'));
    }
  });

  it('the hand-off marker lines of the task breakdown are present: both gate verdicts, the FR-16 line, and EVIDENCE-COMPLETE: yes', () => {
    const src = text();
    expect(src, 'evidence file missing or empty').not.toBe('');
    expect(src).toMatch(/^GATE-1 \(gate pass under the baseline rule\): (PASS|FAIL)$/m);
    expect(src).toMatch(/^GATE-2 \(gate pass under the baseline rule\): (PASS|FAIL)$/m);
    expect(src).toMatch(/^FR-16 met: .+$/m);
    expect(src).toMatch(/^EVIDENCE-COMPLETE: yes$/m);
  });

  it('a recorded failure is not hidden: no FAIL gate verdict coexists with EVIDENCE-COMPLETE (a failed gate is a BLOCKED report, not a complete record)', () => {
    const src = text();
    expect(src, 'evidence file missing or empty').not.toBe('');
    const complete = /^EVIDENCE-COMPLETE: yes$/m.test(src);
    const failed = /^GATE-[12] \(gate pass under the baseline rule\): FAIL$/m.test(src);
    expect(complete && failed, 'EVIDENCE-COMPLETE: yes together with a FAIL gate verdict').toBe(false);
    expect(complete, 'EVIDENCE-COMPLETE: yes must be present').toBe(true);
  });

  it('no open light-value failure remains: a "LIGHT-VALUE-FAIL: <token> <ratio>" line must have been resolved (re-measured, recorded as "LIGHT-VALUE-RESOLVED: ...") before EVIDENCE-COMPLETE', () => {
    const src = text();
    expect(src, 'evidence file missing or empty').not.toBe('');
    expect(/^LIGHT-VALUE-FAIL: /m.test(src), 'an open LIGHT-VALUE-FAIL line').toBe(false);
    expect(/^EVIDENCE-COMPLETE: yes$/m.test(src), 'EVIDENCE-COMPLETE: yes must be present').toBe(true);
  });
});
