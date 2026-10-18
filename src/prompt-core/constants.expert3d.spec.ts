/**
 * constants.expert3d.spec.ts - US-9.1 T19 (FR-22, AC-8) and the file-level half of FR-23 item 1 (plan-review
 * N19): the EXPERT3D overlay gains APPLICATIONS and HEADINGS rules and one amended line, and no other text
 * gains them.
 *
 * Specification FR-22 (collapsed whitespace, case-sensitive):
 *   Assert present in `EXPERT3D_TOV_BASE_OVERLAY`: `states the mechanism that makes THIS product the right
 *   tool` (APPLICATIONS), `functional headings`, `only for §3 <h2>`, `<h3> stay nominal`, `at most one colon or
 *   dash per heading` (HEADINGS, composed from OD-5), `mandated section order` and `the ToV changes the WORDING
 *   and the evidence discipline, not the structure` (the amended line).
 *   Assert absent: in the overlay, `Keep the schema's mandated section order and headings` (the old line in
 *   that form); in every `systemBlocks` text of every STORE_REGISTRY store and in `constants.ts`, `never bare
 *   noun` (OD-5: the phrase is not used, so the `task-a.spec.ts` guard keyed on it is never triggered and is
 *   not edited or weakened); and in `C3D_TOV_BASE_OVERLAY`, `MASTER_SYSTEM_PROMPT`, `task-c.ts` and
 *   `task-translate.ts`: `states the mechanism that makes THIS product the right tool` and `functional headings`.
 *
 * N19: FR-23 item 1's absence from the master, `task-c.ts` and `task-translate.ts` had no named owner test in
 * the breakdown; it is a green-on-arrival absence pin owned HERE (the overlay) and stays green through
 * T27 to T32 (the master). `task-c.ts` / `task-translate.ts` are read as TEXT (they are FROZEN / untouched).
 *
 * N22: the HEADINGS prose the plan composes beyond the FR-22 literals (for example a parenthetical referring to
 * the rest of [HEADING FORM]) is composed text under H-OD13; nothing beyond the literals is asserted.
 *
 * `task-a.spec.ts` lines 122 and 133 (the `never bare noun` guard, the cached prefix across stores) are NOT
 * edited and must stay green.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPERT3D_TOV_BASE_OVERLAY, C3D_TOV_BASE_OVERLAY, STORE_REGISTRY } from './constants';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';
import { buildPromptA } from '../prompts/task-a';
import { collapse, stringConstants } from '../../test/fixtures/us91-constants';

const overlay = collapse(EXPERT3D_TOV_BASE_OVERLAY);
const FR22_ONLY_IN_EXPERT3D = ['states the mechanism that makes THIS product the right tool', 'functional headings'];

describe('FR-22: EXPERT3D_TOV_BASE_OVERLAY - APPLICATIONS, HEADINGS and the amended line (Assert present)', () => {
  it.each([
    'states the mechanism that makes THIS product the right tool',
    'functional headings',
    'only for §3 <h2>',
    '<h3> stay nominal',
    'at most one colon or dash per heading',
    'mandated section order',
    'the ToV changes the WORDING and the evidence discipline, not the structure',
  ])('contains the literal %j', literal => {
    expect(overlay).toContain(literal);
  });
});

describe('FR-22: EXPERT3D_TOV_BASE_OVERLAY - the old line is gone (Assert absent)', () => {
  it('does not contain "Keep the schema\'s mandated section order and headings"', () => {
    expect(overlay).not.toContain("Keep the schema's mandated section order and headings");
  });
});

describe('FR-21 (T19): the overlay keeps its tone limit (green on arrival, stays green)', () => {
  it('still says "Emotionally neutral: no excitement, no exclamation marks."', () => {
    expect(overlay).toContain('Emotionally neutral: no excitement, no exclamation marks.');
  });
});

describe('FR-22 / OD-5: "never bare noun" is used nowhere (green on arrival, stays green)', () => {
  it('constants.ts defines no string containing it', () => {
    const offenders = stringConstants().filter(([, value]) => collapse(value).includes('never bare noun')).map(([name]) => name);
    expect(offenders).toEqual([]);
  });

  it.each(Object.keys(STORE_REGISTRY))('buildPromptA system blocks for store %s do not contain it', store => {
    const payload = buildPromptA({
      website: { name: store, group: STORE_REGISTRY[store].group, url: 'https://x.example' },
      name: 'Creality Ender-3 V3 SE', description: 'Budget FDM printer.', specs: '',
    });
    for (const block of payload.systemBlocks) expect(collapse(block.text)).not.toContain('never bare noun');
  });
});

describe('FR-23 item 1 / AC-8 (plan-review N19): the FR-22 strings reach no other text (green on arrival, stays green through T27 to T32)', () => {
  const sourceOf = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

  it.each(FR22_ONLY_IN_EXPERT3D)('C3D_TOV_BASE_OVERLAY does not contain %j', literal => {
    expect(collapse(C3D_TOV_BASE_OVERLAY)).not.toContain(literal);
  });

  it.each(FR22_ONLY_IN_EXPERT3D)('MASTER_SYSTEM_PROMPT does not contain %j', literal => {
    expect(collapse(MASTER_SYSTEM_PROMPT)).not.toContain(literal);
  });

  it.each([
    ['src/prompts/task-c.ts', ['src', 'prompts', 'task-c.ts']],
    ['src/prompts/task-translate.ts', ['src', 'prompts', 'task-translate.ts']],
  ])('%s (read as text) does not contain either string', (_name, path) => {
    const text = collapse(sourceOf(...path));
    for (const literal of FR22_ONLY_IN_EXPERT3D) expect(text).not.toContain(literal);
  });

  it('no exported string constant other than EXPERT3D_TOV_BASE_OVERLAY contains either string (no *_TOV_TRANSLATION_OVERLAY gains them)', () => {
    const offenders = stringConstants()
      .filter(([name]) => name !== 'EXPERT3D_TOV_BASE_OVERLAY')
      .filter(([, value]) => FR22_ONLY_IN_EXPERT3D.some(literal => collapse(value).includes(literal)))
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });
});
