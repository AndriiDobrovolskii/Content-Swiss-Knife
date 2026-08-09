/**
 * task-a-consumables-doc.spec.ts
 *
 * Mirrors task-a-doc.spec.ts's assertion set for the consumables sibling: buildPromptAConsumablesDoc
 * must inherit buildPromptA's payload byte-for-byte except for systemBlocks[1], and
 * TASK_A_CONSUMABLES_DOC_INSTRUCTION must state every constraint ConsumablesDescriptionDocSchema
 * enforces.
 */
import { describe, it, expect } from 'vitest';

import { buildPromptAConsumablesDoc, TASK_A_CONSUMABLES_DOC_INSTRUCTION } from './task-a-consumables-doc';
import { buildPromptA } from './task-a';
import type { ProductInput } from '../app/types';

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'PLA Filament 1.75mm',
    website: { name: '3DDevice' },
    description: '<p>Consumable material.</p>',
    specs: 'Diameter: 1.75 mm',
    templateId: 'consumables-resin',
    ...overrides,
  } as ProductInput;
}

describe('buildPromptAConsumablesDoc — inherits from the frozen builder', () => {
  it('keeps buildPromptA’s master block byte-identical, so caching still hits', () => {
    expect(buildPromptAConsumablesDoc(input()).systemBlocks[0]).toEqual(buildPromptA(input()).systemBlocks[0]);
  });

  it('keeps the user content byte-identical — same input contract, different output contract', () => {
    expect(buildPromptAConsumablesDoc(input()).userContent).toBe(buildPromptA(input()).userContent);
  });

  it('replaces only the task instruction block', () => {
    const html = buildPromptA(input());
    const doc = buildPromptAConsumablesDoc(input());
    expect(doc.systemBlocks).toHaveLength(html.systemBlocks.length);
    expect(doc.systemBlocks[1].text).not.toBe(html.systemBlocks[1].text);
    expect(doc.systemBlocks[1].text).toBe(TASK_A_CONSUMABLES_DOC_INSTRUCTION);
  });

  it('preserves a store ToV overlay block when the store has one', () => {
    const c3d = input({ website: { name: 'Center 3D Print' } } as Partial<ProductInput>);
    expect(buildPromptAConsumablesDoc(c3d).systemBlocks).toHaveLength(buildPromptA(c3d).systemBlocks.length);
    expect(buildPromptAConsumablesDoc(c3d).systemBlocks.at(-1)).toEqual(buildPromptA(c3d).systemBlocks.at(-1));
  });

  it('keeps every system block cacheable', () => {
    expect(buildPromptAConsumablesDoc(input()).systemBlocks.every(b => b.cache === true)).toBe(true);
  });

  it('is cache-stable — same input, byte-identical blocks', () => {
    expect(buildPromptAConsumablesDoc(input()).systemBlocks).toEqual(buildPromptAConsumablesDoc(input()).systemBlocks);
  });
});

describe('TASK_A_CONSUMABLES_DOC_INSTRUCTION — the output contract', () => {
  it('explicitly supersedes the master prompt’s HTML-only format rule', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/SUPERSEDES|OVERRIDES/);
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/\[FORMAT\]/);
  });

  it('asks for JSON and forbids HTML and code fences', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/JSON/);
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/no code fences|without code fences/i);
  });

  it('pins the schema version the validator expects', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toContain('"schemaVersion": "C1"');
  });

  it.each([
    ['features 4–6', /features[^]*4[–-]6/],
    ['applications 3–4', /applications[^]*3[–-]4/],
    ['specGroups 0–3', /specGroups[^]*0[–-]3/],
    ['storage 2–3', /storage[^]*2[–-]3/],
    ['prose tag allow-list', /<b>[^]*<strong>/],
    ['char ceiling', /4000/],
  ])('states the %s constraint the schema will enforce', (_label, pattern) => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(pattern);
  });

  it('warns that a specGroup heading is not always "Print Settings"', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/NOT always/);
  });

  it('allows specGroups to be empty', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/MAY BE AN EMPTY ARRAY/);
  });
});

describe('TASK_A_CONSUMABLES_DOC_INSTRUCTION — plain-text vs prose fields', () => {
  it('separates the tag allow-list for prose from the no-tags rule for plain text', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/PROSE FIELDS ADMIT <b> and <strong>/);
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/PLAIN-TEXT FIELDS ADMIT NO TAGS AT ALL/);
  });

  it('names "lead" as plain text and explains why tags there backfire', () => {
    const plain = TASK_A_CONSUMABLES_DOC_INSTRUCTION.slice(TASK_A_CONSUMABLES_DOC_INSTRUCTION.indexOf('PLAIN-TEXT FIELDS'));
    expect(plain).toContain('"lead"');
    expect(plain).toMatch(/escaped|angle brackets/i);
  });

  it('warns about a lead and text colliding with no separator', () => {
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/<b>\{lead\}<\/b>\{text\}/);
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toMatch(/letter\s+or\s+digit/i);
    expect(TASK_A_CONSUMABLES_DOC_INSTRUCTION).toContain('зніманняДальність');
  });
});
