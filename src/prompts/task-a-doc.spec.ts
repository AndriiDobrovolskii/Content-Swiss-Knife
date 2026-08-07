/**
 * task-a-doc.spec.ts
 *
 * Task A, emitting a ProductDescriptionDoc instead of HTML.
 *
 * WHY A SEPARATE FILE AND NOT A FLAG INSIDE task-a.ts: that file is FROZEN. This variant is purely
 * additive — it reuses buildPromptA's assembled payload and swaps only the task instruction, so
 * every input rule the frozen builder encodes (image manifest, video manifest, template hint, ToV
 * overlays, consumables mode) is inherited rather than reimplemented and cannot drift from it.
 *
 * The point of this variant is to answer a question the corpus and conformance gates cannot: both
 * prove the RENDERER is correct, but nothing has ever asked a model to produce a Doc. Until one
 * does, reliably, switching production to renderDescription() is unproven at its most important
 * joint.
 */
import { describe, it, expect } from 'vitest';

import { buildPromptADoc, TASK_A_DOC_INSTRUCTION } from './task-a-doc';
import { buildPromptA } from './task-a';
import type { ProductInput } from '../app/types';

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Ortur H20 20 W',
    website: { name: 'EXPERT3D' },
    description: '<p>Laser engraver.</p>',
    specs: 'Power: 20 W',
    ...overrides,
  } as ProductInput;
}

describe('buildPromptADoc — inherits from the frozen builder', () => {
  it('keeps buildPromptA’s master block byte-identical, so caching still hits', () => {
    expect(buildPromptADoc(input()).systemBlocks[0]).toEqual(buildPromptA(input()).systemBlocks[0]);
  });

  it('keeps the user content byte-identical — same input contract, different output contract', () => {
    expect(buildPromptADoc(input()).userContent).toBe(buildPromptA(input()).userContent);
  });

  it('replaces only the task instruction block', () => {
    const html = buildPromptA(input());
    const doc = buildPromptADoc(input());
    expect(doc.systemBlocks).toHaveLength(html.systemBlocks.length);
    expect(doc.systemBlocks[1].text).not.toBe(html.systemBlocks[1].text);
    expect(doc.systemBlocks[1].text).toBe(TASK_A_DOC_INSTRUCTION);
  });

  /**
   * Center 3D Print gets a third cached block carrying the Style B overlay. Dropping it would
   * silently strip that store's voice — the variant must carry through whatever the frozen builder
   * assembled, not assume two blocks.
   */
  it('preserves the Center 3D Print Style B overlay block', () => {
    const c3d = input({ website: { name: 'Center 3D Print' } } as Partial<ProductInput>);
    expect(buildPromptADoc(c3d).systemBlocks).toHaveLength(buildPromptA(c3d).systemBlocks.length);
    expect(buildPromptADoc(c3d).systemBlocks.at(-1)).toEqual(buildPromptA(c3d).systemBlocks.at(-1));
  });

  it('keeps every system block cacheable', () => {
    expect(buildPromptADoc(input()).systemBlocks.every(b => b.cache === true)).toBe(true);
  });

  it('is cache-stable — same input, byte-identical blocks', () => {
    expect(buildPromptADoc(input()).systemBlocks).toEqual(buildPromptADoc(input()).systemBlocks);
  });
});

describe('TASK_A_DOC_INSTRUCTION — the output contract', () => {
  /** The master prompt's [FORMAT] says "Emit HTML only". This block must visibly overrule it. */
  it('explicitly supersedes the master prompt’s HTML-only format rule', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/SUPERSEDES|OVERRIDES/);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/\[FORMAT\]/);
  });

  it('asks for JSON and forbids HTML and code fences', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/JSON/);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/no code fences|without code fences/i);
  });

  it('pins the schema version the validator expects', () => {
    expect(TASK_A_DOC_INSTRUCTION).toContain('"schemaVersion": "3.0"');
  });

  /** Constraints the zod schema enforces — if the prompt omits them, every generation fails late. */
  it.each([
    ['killerSpecs 3–4', /killerSpecs[^]*3[–-]4/],
    ['bullets 3–8', /3[–-]8/],
    ['applications items 4–8', /4[–-]8/],
    ['prose tag allow-list', /<b>[^]*<strong>/],
    ['figure refs exactly once', /exactly once/],
    ['subsection depth cap', /two levels|depth|subsections/i],
  ])('states the %s constraint the schema will enforce', (_label, pattern) => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(pattern);
  });

  it('tells the model that figures are referenced by index, not embedded', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/index/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/filename only|file.*only/i);
  });
});

/**
 * The two clauses added after the first real 3DDevice generation (2026-08-02) shipped
 * `<li><b>&lt;b&gt;Транспортування:&lt;/b&gt;</b>рюкзак…` and
 * `<li><b>Топографічне знімання</b>Дальність…`.
 *
 * The schema now rejects both (description-doc.schema.spec.ts) — these assert the model is TOLD,
 * so the repair gate is a backstop rather than the first line of defence.
 */
describe('TASK_A_DOC_INSTRUCTION — plain-text vs prose fields', () => {
  it('separates the tag allow-list for prose from the no-tags rule for plain text', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/PROSE FIELDS ADMIT <b> and <strong>/);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL/);
  });

  it('names "lead" as plain text and explains why tags there backfire', () => {
    const plain = TASK_A_DOC_INSTRUCTION.slice(TASK_A_DOC_INSTRUCTION.indexOf('PLAIN-TEXT FIELDS'));
    expect(plain).toContain('"lead"');
    // The reason matters more than the rule: the model must know the tags are escaped, not applied.
    expect(plain).toMatch(/escaped|angle brackets/i);
  });

  it('warns about a lead and text colliding with no separator', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/<b>\{lead\}<\/b>\{text\}/);
    // Whitespace-tolerant: the instruction wraps, so a literal phrase match would be brittle.
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/letter\s+or\s+digit/i);
    expect(TASK_A_DOC_INSTRUCTION).toContain('зніманняДальність');   // the real defect, as an example
  });
});

