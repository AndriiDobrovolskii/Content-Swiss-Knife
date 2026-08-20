/**
 * doc-block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  applyDocPatches, getDocBlock, parseDocPatchResponse, planDocBlockPatches, rejectDocPatch,
  setDocBlock,
} from './doc-block-repair';
import type { ProductDescriptionDoc } from '../domain/description-doc';

function baseDoc(overrides: Partial<ProductDescriptionDoc> = {}): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Ortur H20',
    hook: 'Коротке речення.',
    killerSpecs: [],
    keyBenefits: [{ kind: 'bullets', items: [{ lead: 'Лід:', text: 'Текст пункту.' }] }],
    functionality: [{ heading: 'H', blocks: [{ kind: 'paragraph', text: 'Абзац тексту.' }] }],
    applications: { heading: 'Застосування', items: [{ scenario: 'S', text: 'Текст сценарію.' }] },
    specs: { heading: 'Технічні характеристики', categories: [] },
    cta: { heading: 'CTA', text: 'Текст CTA.' },
    figures: [],
    videos: [],
    ...overrides,
  };
}

describe('getDocBlock / setDocBlock', () => {
  it('round-trips a leaf string path', () => {
    const doc = baseDoc();
    expect(getDocBlock(doc, 'cta.text')).toEqual({ path: 'cta.text', text: 'Текст CTA.' });
    const next = setDocBlock(doc, 'cta.text', 'Новий текст.');
    expect(next.cta.text).toBe('Новий текст.');
    expect(next).not.toBe(doc); // copy-on-write
    expect(doc.cta.text).toBe('Текст CTA.'); // original untouched
  });

  it('round-trips the root-leaf "hook" path, which repair-strategy.ts\'s walker cannot address', () => {
    const doc = baseDoc({ hook: 'Оригінал.' });
    expect(getDocBlock(doc, 'hook')).toEqual({ path: 'hook', text: 'Оригінал.' });
    const next = setDocBlock(doc, 'hook', 'Замінено.');
    expect(next.hook).toBe('Замінено.');
    expect(next).not.toBe(doc);
  });

  it('round-trips a paragraph-Block container path, unwrapping and rewrapping .text', () => {
    const doc = baseDoc({
      functionality: [{ heading: 'H', blocks: [{ kind: 'paragraph', text: 'Оригінальний абзац.' }] }],
    });
    expect(getDocBlock(doc, 'functionality[0].blocks[0]')).toEqual({
      path: 'functionality[0].blocks[0]', text: 'Оригінальний абзац.',
    });
    const next = setDocBlock(doc, 'functionality[0].blocks[0]', 'Новий абзац.');
    const block = next.functionality[0].blocks[0];
    expect(block).toEqual({ kind: 'paragraph', text: 'Новий абзац.' });
  });

  it('resolves a bullets item leaf (lead and text independently)', () => {
    const doc = baseDoc();
    expect(getDocBlock(doc, 'keyBenefits[0].items[0].lead')?.text).toBe('Лід:');
    expect(getDocBlock(doc, 'keyBenefits[0].items[0].text')?.text).toBe('Текст пункту.');
  });

  it('returns undefined for an unaddressable path (bullets container, figure/video block) without throwing', () => {
    const doc = baseDoc({
      keyBenefits: [{ kind: 'bullets', items: [{ lead: 'L', text: 'T' }] }],
      functionality: [{ heading: 'H', blocks: [{ kind: 'video', ref: 0 }] }],
    });
    expect(getDocBlock(doc, 'keyBenefits[0]')).toBeUndefined(); // a bullets Block, not a string/paragraph
    expect(getDocBlock(doc, 'functionality[0].blocks[0]')).toBeUndefined(); // a video Block
  });

  it('returns undefined rather than throwing for a malformed or unsupported path', () => {
    const doc = baseDoc();
    expect(getDocBlock(doc, 'nonsense')).toBeUndefined();
    expect(getDocBlock(doc, 'doesNotExist[0].text')).toBeUndefined();
  });
});

describe('rejectDocPatch', () => {
  it('rejects an empty replacement', () => {
    expect(rejectDocPatch('Оригінал.', '   ')).toMatch(/empty/);
  });

  it('rejects a replacement that invents a number', () => {
    expect(rejectDocPatch('Товщина 2 мм.', 'Товщина 2 мм і швидкість 40 Вт.')).toMatch(/invented/);
  });

  it('rejects a replacement that drops a number', () => {
    expect(rejectDocPatch('Товщина 2 мм.', 'Товщина.')).toMatch(/dropped/);
  });

  it('accepts a replacement that repeats a number (legitimate sentence split)', () => {
    expect(rejectDocPatch(
      'Швидкість 50 мм/с дає високу продуктивність.',
      'Швидкість 50 мм/с. Це дає високу продуктивність.',
    )).toBeNull();
  });

  it('rejects a replacement that introduces a foreign tag', () => {
    expect(rejectDocPatch('Простий текст.', 'Текст із <a href="x">посиланням</a>.')).toMatch(/<a>/);
  });

  it('rejects a replacement with unbalanced <b>/<strong> tags', () => {
    expect(rejectDocPatch('<b>Жирний</b> текст.', '<b>Жирний текст.')).toMatch(/unbalanced/);
  });

  it('accepts a replacement that keeps balanced <b>/<strong> tags', () => {
    expect(rejectDocPatch('<b>Жирний</b> текст.', 'Текст. <b>Жирний</b> знову.')).toBeNull();
  });
});

describe('planDocBlockPatches', () => {
  it('groups two issues on the same path into one request', () => {
    const doc = baseDoc();
    const requests = planDocBlockPatches(doc, new Map([
      ['cta.text', ['Problem one.', 'Problem two.']],
    ]));
    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      path: 'cta.text', text: 'Текст CTA.', instructions: ['Problem one.', 'Problem two.'],
    });
  });

  it('drops a path that does not resolve to rewritable prose', () => {
    const doc = baseDoc();
    const requests = planDocBlockPatches(doc, new Map([['nonsense', ['Problem.']]]));
    expect(requests).toEqual([]);
  });
});

describe('parseDocPatchResponse / applyDocPatches', () => {
  it('round-trips a patch response, including literal < and > in the replacement text', () => {
    // The parsing-safety regression this whole module hinges on: htmlparser2 must not choke on
    // realistic spec prose ("< 2 мм", "> 50 %") the way a strict XML parser would.
    const response = '<patch path="cta.text">Товщина < 2 мм і приріст > 50 %.</patch>';
    const patches = parseDocPatchResponse(response);
    expect(patches.get('cta.text')).toBe('Товщина < 2 мм і приріст > 50 %.');

    const doc = baseDoc();
    const next = applyDocPatches(doc, patches);
    expect(next.cta.text).toBe('Товщина < 2 мм і приріст > 50 %.');
  });

  it('applies several patches across different fields in one pass', () => {
    const response = '<patch path="hook">Новий hook.</patch>'
      + '<patch path="functionality[0].blocks[0]">Новий абзац.</patch>';
    const doc = baseDoc();
    const next = applyDocPatches(doc, parseDocPatchResponse(response));
    expect(next.hook).toBe('Новий hook.');
    expect(next.functionality[0].blocks[0]).toEqual({ kind: 'paragraph', text: 'Новий абзац.' });
  });

  it('ignores an empty patch and text outside <patch> elements', () => {
    const response = 'preamble\n<patch path="hook"></patch>\ntrailing commentary';
    expect(parseDocPatchResponse(response).size).toBe(0);
  });

  it('leaves siblings untouched by reference (setAtPath monotonicity)', () => {
    const doc = baseDoc();
    const next = applyDocPatches(doc, new Map([['cta.text', 'Новий текст.']]));
    expect(next.keyBenefits).toBe(doc.keyBenefits);
    expect(next.functionality).toBe(doc.functionality);
  });
});
