/**
 * US-2.2 T9 — the legacy HTML-path prompt (`buildPromptA`, FROZEN, Expert-3DPrinter) honours the
 * selected simplified template (FR-7, OD-1).
 *
 * The frozen builder gains only an import, one call and deletions (T9). The template instruction
 * rides in `userContent` as an overlay and `systemBlocks` are untouched (NFR-1, plan D2), so every
 * assertion here reads the lines the builder ADDED to userContent relative to the no-template build.
 */
import { describe, it, expect } from 'vitest';
import { buildPromptA } from './task-a';
import type { ProductInput } from '../app/types';
import { LEGACY_INPUT } from '../../test/fixtures/full-description-inputs';
import { paragraphMentions, addedLines, normDashes, HAS_SOFT_CEILING_CLAUSE as C } from '../../test/fixtures/prompt-clauses';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

type Tpl = 'filaments-resins-powders' | 'accessories' | 'spare-parts';
const TPLS: Tpl[] = ['filaments-resins-powders', 'accessories', 'spare-parts'];

const build = (templateId?: string, extra: Partial<ProductInput> = {}) =>
  buildPromptA({ ...LEGACY_INPUT, ...(templateId ? { templateId } : {}), ...extra });
const FULL = build();
const overlay = (tpl: Tpl, extra: Partial<ProductInput> = {}) =>
  addedLines(buildPromptA({ ...LEGACY_INPUT, ...extra }).userContent, build(tpl, extra).userContent);

describe('FR-7 — the legacy path requests only the template paragraphs', () => {
  it('Filaments: 1, 2, 4, 5, 7, 8 requested; 3, 6, 9 not', () => {
    const m = paragraphMentions(overlay('filaments-resins-powders'));
    for (const n of [1, 2, 4, 5, 7, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [3, 6, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });
  it('Accessories checked: 1, 2, 3, 5, 7, 8 requested; 4, 6, 9 not', () => {
    const m = paragraphMentions(overlay('accessories', { includeFunctionality: true }));
    for (const n of [1, 2, 3, 5, 7, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [4, 6, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });
  it('Accessories unchecked: no §3, and a missing flag equals unchecked', () => {
    const off = paragraphMentions(overlay('accessories', { includeFunctionality: false })).requested;
    expect(off.has(8), 'the overlay must exist for this check to mean anything').toBe(true);
    expect(off.has(3)).toBe(false);
    expect(build('accessories')).toEqual(build('accessories', { includeFunctionality: false }));
  });
  it('Spare parts: only 1, 5, 8', () => {
    const m = paragraphMentions(overlay('spare-parts'));
    for (const n of [1, 5, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [2, 3, 4, 6, 7, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });
  it('the flag is ignored for other templates and for Full', () => {
    for (const tpl of ['filaments-resins-powders', 'spare-parts'] as const) {
      expect(build(tpl, { includeFunctionality: true })).toEqual(build(tpl, { includeFunctionality: false }));
    }
    expect(build(undefined, { includeFunctionality: true })).toEqual(FULL);
  });
});

describe('FR-3..FR-5 / FR-10 / FR-11 — data-conditional §5 and §7 on the legacy path', () => {
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: §5 only when the source has compatibility data', tpl => {
    const clause = overlay(tpl, { includeFunctionality: true }).split(/(?<=[.!?])\s+|;|\n/).filter(c => /§\s*5/.test(c)).join(' ');
    expect(clause).toMatch(/(only|solely)\s+(if|when)|if\s+(the\s+)?(source|input)|when\s+(the\s+)?(source|input)|unless/i);
  });
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: empty specs -> §7 omitted; non-empty -> not negated', tpl => {
    const empty = paragraphMentions(overlay(tpl, { specs: '' }));
    expect(empty.negated.has(7)).toBe(true);
    expect(empty.requested.has(7)).toBe(false);
    expect(paragraphMentions(overlay(tpl)).negated.has(7)).toBe(false);
    expect(paragraphMentions(overlay(tpl)).requested.has(7)).toBe(true);
  });
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: single-table §7, one <tbody>, no <h3>', tpl => {
    const t = overlay(tpl);
    expect(t).toMatch(/single\s+(<tbody>|tbody|table)|one\s+(<tbody>|tbody|single table)/i);
    expect(t).toMatch(/<h3>|sub-?heading|category (heading|title)/i);
  });
});

describe('FR-13 / FR-15 — v4 ranges and the soft ceiling on the legacy path', () => {
  const RANGES: Record<Tpl, { present: string[]; absent: string[] }> = {
    'filaments-resins-powders': { present: ['40-85', '90-300', '80-250', '30-100', '50-100'], absent: [] },
    accessories: { present: ['40-85', '90-300', '30-100', '50-100'], absent: ['80-250'] },
    'spare-parts': { present: ['40-85', '30-100', '50-100'], absent: ['90-300', '80-250'] },
  };
  for (const tpl of TPLS) {
    it(`${tpl}: ranges of included paragraphs only, no legacy limit, soft 5500 ceiling`, () => {
      const t = overlay(tpl, { includeFunctionality: true });
      const n = normDashes(t);
      RANGES[tpl].present.forEach(r => expect(n, r).toContain(r));
      RANGES[tpl].absent.forEach(r => expect(n, r).not.toContain(r));
      expect(n).not.toMatch(/\b40-60\b/);
      expect(t).not.toMatch(/consumable/i);
      expect(t).toMatch(C.five500);
      expect(t).toMatch(C.soft);
      expect(t).toMatch(C.priority);
      expect(t).toMatch(C.exceed);
    });
  }
});

describe('NFR-1 — the legacy path leaves systemBlocks untouched', () => {
  it.each(TPLS)('%s: systemBlocks equal the Full build byte for byte; the overlay is in userContent', tpl => {
    const built = build(tpl);
    expect(built.systemBlocks).toEqual(FULL.systemBlocks);
    expect(built.userContent).not.toBe(FULL.userContent);
  });
  it.each(TPLS)('%s: no consumables reinforcement and no legacy [TEMPLATE] hint', tpl => {
    const u = build(tpl).userContent;
    expect(u).not.toMatch(/CONSUMABLES/i);
    expect(u).not.toContain('[TEMPLATE]');
    expect(build(tpl).systemBlocks[1].text).not.toMatch(/CONSUMABLES/i);
  });
});

describe('FR-6 — Full description on the legacy path', () => {
  it('an empty-string or stale templateId builds the Full prompt (the [TEMPLATE] hint stays exactly as before)', () => {
    expect(buildPromptA({ ...LEGACY_INPUT, templateId: '' })).toEqual(FULL);
    const stale = buildPromptA({ ...LEGACY_INPUT, templateId: STALE_TEMPLATE_ID });
    expect(stale.systemBlocks[1].text).toBe(FULL.systemBlocks[1].text);
    expect(stale.userContent).not.toMatch(/CONSUMABLES MODE/);
  });
  it('a Customize-panel template with no id still produces the [TEMPLATE] hint (OD-5)', () => {
    const p = buildPromptA({ ...LEGACY_INPUT, customTemplate: { bodyFocus: 'durability' } });
    expect(p.userContent).toContain('[TEMPLATE]');
    expect(p.userContent).toContain('durability');
  });
});
