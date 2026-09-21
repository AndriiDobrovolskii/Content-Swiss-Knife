/**
 * US-2.2 T8 — the Doc-pipeline prompt (`buildPromptADoc`) for the three simplified templates.
 *
 * AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-12, AC-14, AC-15 and the FR-6 non-regression, on the
 * builder the six DOC_PIPELINE_STORES use.
 *
 * Wording is not pinned; meaning is. See test/fixtures/prompt-clauses.ts for how "the prompt
 * requests paragraph N" is read.
 */
import { describe, it, expect } from 'vitest';
import { buildPromptADoc } from './task-a-doc';
import type { ProductInput } from '../app/types';
import { EXPERT3D_INPUT } from '../../test/fixtures/full-description-inputs';
import {
  paragraphMentions, templateText, addedLines, normDashes, HAS_SOFT_CEILING_CLAUSE as C,
} from '../../test/fixtures/prompt-clauses';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

type Tpl = 'filaments-resins-powders' | 'accessories' | 'spare-parts';

const build = (templateId?: string, extra: Partial<ProductInput> = {}) =>
  buildPromptADoc({ ...EXPERT3D_INPUT, ...(templateId ? { templateId } : {}), ...extra });
const FULL = build();
const text = (tpl: Tpl, extra: Partial<ProductInput> = {}) =>
  templateText(build(tpl, extra), buildPromptADoc({ ...EXPERT3D_INPUT, ...extra }), { includeSystemTask: true });


describe('AC-3 — Filaments/resins/powders requests 1, 2, 4, 5, 7, 8 and no §3, §6, §9', () => {
  const t = text('filaments-resins-powders');
  const m = paragraphMentions(t);
  it.each([1, 2, 4, 5, 7, 8])('requests §%i', n => expect(m.requested.has(n)).toBe(true));
  it.each([3, 6, 9])('does not request §%i', n => expect(m.requested.has(n)).toBe(false));
  it.each(['functionality', 'packageContents', 'faq'])('the JSON shape lists no "%s" key', key => {
    expect(build('filaments-resins-powders').systemBlocks[1].text).not.toMatch(new RegExp(`"${key}"\\s*:`));
  });
});

describe('AC-4 — Accessories requests 1, 2, 5, 7, 8 (+3 with the checkbox) and no §4, §6, §9', () => {
  it('checkbox checked: requests 1, 2, 3, 5, 7, 8 and not 4, 6, 9', () => {
    const m = paragraphMentions(text('accessories', { includeFunctionality: true }));
    for (const n of [1, 2, 3, 5, 7, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [4, 6, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });
  it('checkbox unchecked: requests 1, 2, 5, 7, 8 and not 3, 4, 6, 9 in the per-run text', () => {
    const t = text('accessories', { includeFunctionality: false });
    const m = paragraphMentions(t);
    for (const n of [1, 2, 5, 7, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [4, 6, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });
  it('AC-9: the checked and unchecked prompts differ, and only in userContent (NFR-1)', () => {
    const on = build('accessories', { includeFunctionality: true });
    const off = build('accessories', { includeFunctionality: false });
    expect(on.systemBlocks).toEqual(off.systemBlocks);
    expect(on.userContent).not.toBe(off.userContent);
  });
  it('AC-9: the per-run text asks for §3 when checked and does not when unchecked', () => {
    const base = buildPromptADoc({ ...EXPERT3D_INPUT });
    const on = paragraphMentions(addedLines(base.userContent, build('accessories', { includeFunctionality: true }).userContent));
    const off = paragraphMentions(addedLines(base.userContent, build('accessories', { includeFunctionality: false }).userContent));
    expect(on.requested.has(3)).toBe(true);
    expect(off.requested.has(3)).toBe(false);
  });
  it('a missing flag behaves as unchecked', () => {
    const noFlag = build('accessories');
    const off = build('accessories', { includeFunctionality: false });
    expect(noFlag).toEqual(off);
  });
  it('the flag is ignored for any other template (silent risk 9: a stale true must not leak)', () => {
    for (const tpl of ['filaments-resins-powders', 'spare-parts'] as const) {
      expect(build(tpl, { includeFunctionality: true })).toEqual(build(tpl, { includeFunctionality: false }));
    }
    expect(build(undefined, { includeFunctionality: true })).toEqual(FULL);
  });
});

describe('AC-5 — Spare parts requests only 1, 5, 8', () => {
  const m = paragraphMentions(text('spare-parts'));
  it.each([1, 5, 8])('requests §%i', n => expect(m.requested.has(n)).toBe(true));
  it.each([2, 3, 4, 6, 7, 9])('does not request §%i', n => expect(m.requested.has(n)).toBe(false));
  it.each(['killerSpecs', 'keyBenefits', 'functionality', 'applications', 'packageContents', 'specs', 'faq'])(
    'the JSON shape lists no "%s" key', key => {
      expect(build('spare-parts').systemBlocks[1].text).not.toMatch(new RegExp(`"${key}"\\s*:`));
    });
});

describe('AC-8 — §5 is emitted only when the source carries compatibility data (Filaments, Accessories)', () => {
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: the §5 instruction is conditional on source data', tpl => {
    const clause = text(tpl, { includeFunctionality: true })
      .split(/(?<=[.!?])\s+|;|\n/).filter(c => /§\s*5/.test(c)).join(' ');
    expect(clause).toMatch(/(only|solely)\s+(if|when)|if\s+(the\s+)?(source|input)|when\s+(the\s+)?(source|input)|unless/i);
  });
});

describe('AC-15 — §7 is omitted when the source specs are empty, present when they are not', () => {
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: empty specs -> the per-run text omits §7', tpl => {
    const base = buildPromptADoc({ ...EXPERT3D_INPUT, specs: '' });
    const added = addedLines(base.userContent, build(tpl, { specs: '' }).userContent);
    const m = paragraphMentions(added);
    expect(m.negated.has(7), 'per-run text must say to omit §7').toBe(true);
    expect(m.requested.has(7)).toBe(false);
  });
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: non-empty specs -> §7 is requested and not negated per run', tpl => {
    const base = buildPromptADoc({ ...EXPERT3D_INPUT });
    const added = addedLines(base.userContent, build(tpl).userContent);
    expect(paragraphMentions(added).negated.has(7)).toBe(false);
    expect(paragraphMentions(text(tpl)).requested.has(7)).toBe(true);
  });
  it('the empty-specs signal never enters a cached system block (NFR-1)', () => {
    for (const tpl of ['filaments-resins-powders', 'accessories'] as const) {
      expect(build(tpl, { specs: '' }).systemBlocks).toEqual(build(tpl).systemBlocks);
    }
  });
  it('whitespace-only specs count as empty', () => {
    const base = buildPromptADoc({ ...EXPERT3D_INPUT, specs: '  \n ' });
    const added = addedLines(base.userContent, build('filaments-resins-powders', { specs: '  \n ' }).userContent);
    expect(paragraphMentions(added).negated.has(7)).toBe(true);
  });
});

describe('AC-7 — single-table §7 is stated explicitly (Filaments, Accessories)', () => {
  it.each(['filaments-resins-powders', 'accessories'] as const)('%s: one <tbody>, no <h3> sub-headings, one category', tpl => {
    const t = text(tpl);
    expect(t).toMatch(/single\s+(<tbody>|tbody|table)|one\s+(<tbody>|tbody|single table)/i);
    expect(t).toMatch(/<h3>|sub-?heading|category (heading|title)/i);
    expect(t).toMatch(/(exactly\s+)?(one|single|1)\s+categor(y|ies)/i);
  });
});

describe('AC-12 — v4 ranges in every simplified prompt; no legacy consumables limit', () => {
  const RANGES: Record<Tpl, { present: string[]; absent: string[] }> = {
    'filaments-resins-powders': { present: ['40-85', '90-300', '80-250', '30-100', '50-100'], absent: [] },
    accessories: { present: ['40-85', '90-300', '30-100', '50-100'], absent: ['80-250'] },
    'spare-parts': { present: ['40-85', '30-100', '50-100'], absent: ['90-300', '80-250'] },
  };
  for (const tpl of Object.keys(RANGES) as Tpl[]) {
    it(`${tpl}: names the v4 ranges of the paragraphs it includes and none of an excluded one`, () => {
      const t = normDashes(text(tpl, { includeFunctionality: true }));
      RANGES[tpl].present.forEach(r => expect(t, r).toContain(r));
      RANGES[tpl].absent.forEach(r => expect(t, r).not.toContain(r));
    });
    it(`${tpl}: carries no legacy consumables limit or consumables wording`, () => {
      const t = normDashes(text(tpl, { includeFunctionality: true }));
      expect(t, 'the template must state the ceiling at all').toMatch(/5500/);
      expect(t).not.toMatch(/\b40-60\b/);
      expect(t).not.toMatch(/4700/);
      expect(t).not.toMatch(/consumable/i);
      expect(t).not.toMatch(/§C\d/);
      expect(t).not.toMatch(/\b(4-6|3-4|2-3)\s*(<li>|list items|items)/i);
    });
  }
  it('Filaments: applications 4-8 items; Killer Specs block at most 8 items', () => {
    const t = normDashes(text('filaments-resins-powders'));
    expect(t).toMatch(/4-8\s*(entries|items|<li>)/i);
    expect(t).toMatch(/(≤|<=|at most|max(?:imum)?(?: of)?)\s*8/i);
  });
});

describe('AC-14 — 5500-character soft ceiling, v4 ranges win', () => {
  for (const tpl of ['filaments-resins-powders', 'accessories', 'spare-parts'] as const) {
    it(`${tpl}: states a 5500 soft ceiling on narrative text and that the v4 ranges take priority`, () => {
      const t = text(tpl, { includeFunctionality: true });
      expect(t).toMatch(C.five500);
      expect(t).toMatch(C.soft);
      expect(t).toMatch(C.priority);
      expect(t).toMatch(C.exceed);
      expect(t).toMatch(C.stripped);
      expect(t).toMatch(C.figcaption);
    });
  }
  it('the ceiling is not stated as a hard limit', () => {
    const t = text('filaments-resins-powders');
    expect(t, 'the template must state the ceiling at all').toMatch(C.five500);
    expect(t).not.toMatch(/hard\s+(visible-text\s+)?(limit|ceiling)[^.]{0,40}5500/i);
    expect(t).not.toMatch(/5500[^.]{0,40}hard/i);
  });
  it('Full description prompt does not mention the ceiling (AC-14: Full is unaffected)', () => {
    expect(FULL.systemBlocks[1].text).not.toMatch(/5500/);
  });
});

describe('NFR-1 — cache-block separation is preserved', () => {
  it.each(['filaments-resins-powders', 'accessories', 'spare-parts'] as const)('%s: block 0 and any store overlay are untouched; only the task block differs', tpl => {
    const built = build(tpl);
    expect(built.systemBlocks.length).toBe(FULL.systemBlocks.length);
    built.systemBlocks.forEach((b, i) => {
      if (i === 1) {
        expect(b.text).not.toBe(FULL.systemBlocks[1].text);
        expect(b.cache).toBe(true);
      } else {
        expect(b).toEqual(FULL.systemBlocks[i]);
      }
    });
  });
  it.each(['filaments-resins-powders', 'accessories', 'spare-parts'] as const)('%s: PromptPayload shape is unchanged and product data never enters a system block', tpl => {
    const built = build(tpl);
    expect(Object.keys(built).sort()).toEqual(['systemBlocks', 'userContent']);
    for (const b of built.systemBlocks) {
      expect(b.text).not.toContain(EXPERT3D_INPUT.name);
    }
    // Real invariant: no user-supplied string value (name, specs, notes...) is in any system block.
    const supplied = Object.values(EXPERT3D_INPUT).filter((v): v is string => typeof v === 'string' && v.trim().length >= 6);
    for (const b of built.systemBlocks) {
      for (const v of supplied) expect(b.text).not.toContain(v.trim());
    }
    expect(built.userContent).toContain(EXPERT3D_INPUT.name);
  });
  it('the three templates have three distinct task blocks (four stable cache variants with Full)', () => {
    const blocks = new Set([FULL, build('filaments-resins-powders'), build('accessories'), build('spare-parts')].map(p => p.systemBlocks[1].text));
    expect(blocks.size).toBe(4);
  });
  it('the legacy [TEMPLATE] hint never reaches a Doc-path simplified prompt (would double-instruct)', () => {
    for (const tpl of ['filaments-resins-powders', 'accessories', 'spare-parts'] as const) {
      expect(build(tpl).userContent).not.toContain('[TEMPLATE]');
    }
  });
});

describe('FR-6 / NFR-6 — Full description and determinism', () => {
  it('a build with no templateId equals a build that passes an empty-string templateId', () => {
    expect(buildPromptADoc({ ...EXPERT3D_INPUT, templateId: '' })).toEqual(FULL);
  });
  it('an unknown or stale id (a stale id) builds the Full prompt block (D14)', () => {
    const stale = buildPromptADoc({ ...EXPERT3D_INPUT, templateId: STALE_TEMPLATE_ID });
    expect(stale.systemBlocks[1].text).toBe(FULL.systemBlocks[1].text);
    expect(stale.userContent).not.toMatch(/consumables/i);
  });
  it('is deterministic: two builds of the same simplified input are byte-identical', () => {
    for (const tpl of ['filaments-resins-powders', 'accessories', 'spare-parts'] as const) {
      expect(JSON.stringify(build(tpl, { includeFunctionality: true }))).toBe(JSON.stringify(build(tpl, { includeFunctionality: true })));
    }
  });
});

describe('FR-22 / FR-23 — media instructions survive in simplified prompts', () => {
  it('the image and video manifests still ride in userContent for a simplified template', () => {
    const t = build('spare-parts').userContent;
    expect(t).toContain('[IMAGE MANIFEST]');
    expect(t).toContain('[VIDEO MANIFEST]');
    expect(t).toContain('https://www.youtube.com/embed/abc123');
  });
});
