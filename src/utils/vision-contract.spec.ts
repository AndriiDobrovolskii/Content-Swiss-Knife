/**
 * vision-contract.spec.ts
 *
 * Regression guard for src/utils/vision-contract.ts — the client-side parser
 * that enforces the Vision pre-pass JSON output contract (PR1). If the parser
 * silently accepts malformed output, a wrong/over-long caption could reach the
 * image manifest and the public page.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { parseVisionResult, visionResultToEntryPatch } from './vision-contract';

describe('parseVisionResult', () => {
  it('parses valid JSON into a caption-only result', () => {
    const raw = JSON.stringify({
      caption: 'Blue laser engraver with gantry rails and controller box',
    });
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Blue laser engraver with gantry rails and controller box',
    });
  });

  it('ignores extra fields the model may still emit', () => {
    const raw = JSON.stringify({
      caption: 'Compact desktop machine with a moving laser head',
      consistent: 'yes',
      observed: 'laser engraver',
    });
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Compact desktop machine with a moving laser head',
    });
  });

  it('strips ```json code fences before parsing', () => {
    const raw = '```json\n{"caption":"Black resin 3D printer with build plate"}\n```';
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Black resin 3D printer with build plate',
    });
  });

  it('strips bare ``` fences before parsing', () => {
    const raw = '```\n{"caption":"Handheld 3D scanner with blue sensor array"}\n```';
    expect(parseVisionResult(raw).caption).toBe('Handheld 3D scanner with blue sensor array');
  });

  it('throws on missing caption', () => {
    expect(() => parseVisionResult(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('throws on empty caption', () => {
    expect(() => parseVisionResult(JSON.stringify({ caption: '   ' }))).toThrow();
  });

  it('throws on over-length caption (> 20 words)', () => {
    const caption = Array.from({ length: 21 }, () => 'word').join(' ');
    expect(() => parseVisionResult(JSON.stringify({ caption }))).toThrow();
  });

  it('throws on non-JSON garbage', () => {
    expect(() => parseVisionResult('this is not json at all')).toThrow();
  });

  it('throws on a JSON array (not an object)', () => {
    expect(() => parseVisionResult('[1,2,3]')).toThrow();
  });
});

/**
 * US-5.1 T4 (FR-21, NFR-3, NFR-12): the three optional native-Ukrainian fields. Written from the
 * Specification, before the contract carries them.
 *
 * CONTRACT PINNED HERE (plan D1, D5): `VisionResult` gains optional trimmed `label`, `description`,
 * `alt`; anything missing, blank or non-string is DROPPED (never thrown on); `caption` keeps its
 * mandatory check and the 20-word throw; `visionResultToEntryPatch(result)` maps the three fields to
 * `visionLabelUk`, `visionDescriptionUk`, `visionAltUk` and yields `{}` when none is present.
 */
describe('parseVisionResult - the three Ukrainian fields (FR-21, NFR-12)', () => {
  const CAPTION = 'Green laser engraving a wooden plate';

  it('returns label, description and alt next to the caption, each trimmed', () => {
    const raw = JSON.stringify({
      caption: CAPTION,
      label: '  Результат роботи зеленого лазера:  ',
      description: '  Зелений лазер залишає чіткий слід на деревʼяній пластині.  ',
      alt: '  Зелений лазер гравіює деревʼяну пластину.  ',
    });
    expect(parseVisionResult(raw)).toEqual({
      caption: CAPTION,
      label: 'Результат роботи зеленого лазера:',
      description: 'Зелений лазер залишає чіткий слід на деревʼяній пластині.',
      alt: 'Зелений лазер гравіює деревʼяну пластину.',
    });
  });

  it('parses a caption-only reply (an old or partial reply) without throwing and without the new fields', () => {
    const parsed = parseVisionResult(JSON.stringify({ caption: CAPTION }));
    expect(parsed.caption).toBe(CAPTION);
    expect(parsed.label).toBeUndefined();
    expect(parsed.description).toBeUndefined();
    expect(parsed.alt).toBeUndefined();
  });

  it.each([
    ['a number', 5],
    ['null', null],
    ['an object', { x: 1 }],
    ['an array', ['a']],
    ['a boolean', true],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('drops a label that is %s and never throws', (_name, value) => {
    const parsed = parseVisionResult(JSON.stringify({ caption: CAPTION, label: value, description: 'Опис.', alt: 'Альт.' }));
    expect(parsed.label).toBeUndefined();
    expect(parsed.description).toBe('Опис.');
    expect(parsed.alt).toBe('Альт.');
  });

  it('drops a non-string description or alt independently of the other fields', () => {
    const parsed = parseVisionResult(JSON.stringify({ caption: CAPTION, label: 'Мітка:', description: 42, alt: ['x'] }));
    expect(parsed).toEqual({ caption: CAPTION, label: 'Мітка:' });
  });

  it('keeps a long Ukrainian description: no word ceiling is applied to the new fields', () => {
    const long = Array.from({ length: 40 }, () => 'слово').join(' ');
    const parsed = parseVisionResult(JSON.stringify({ caption: CAPTION, description: long, alt: long }));
    expect(parsed.description).toBe(long);
    expect(parsed.alt).toBe(long);
  });

  it('still throws on a missing caption, even when the three new fields are present', () => {
    expect(() => parseVisionResult(JSON.stringify({ label: 'Мітка:', description: 'Опис.', alt: 'Альт.' }))).toThrow();
  });

  it('still throws on a caption over 20 words and keeps the retry text the caller matches on', () => {
    const caption = Array.from({ length: 21 }, () => 'word').join(' ');
    expect(() => parseVisionResult(JSON.stringify({ caption, label: 'Мітка:' }))).toThrow(/exceeds \d+ words/);
  });

  it('parses the three fields out of a fenced reply', () => {
    const body = JSON.stringify({ caption: CAPTION, label: 'Мітка:', description: 'Опис.', alt: 'Альт.' });
    const raw = ['```json', body, '```'].join('\n');
    expect(parseVisionResult(raw)).toMatchObject({ label: 'Мітка:', description: 'Опис.', alt: 'Альт.' });
  });
});

describe('visionResultToEntryPatch - FR-21 mapping onto the manifest entry', () => {
  it('maps label, description and alt to the three Ukrainian entry fields and nothing else', () => {
    expect(visionResultToEntryPatch({ caption: 'English caption', label: 'Мітка:', description: 'Опис.', alt: 'Альт.' })).toEqual({
      visionLabelUk: 'Мітка:',
      visionDescriptionUk: 'Опис.',
      visionAltUk: 'Альт.',
    });
  });

  it('yields an empty patch for a caption-only result (the English caption is never copied in)', () => {
    expect(visionResultToEntryPatch({ caption: 'English caption' })).toEqual({});
  });

  it('maps only the fields that are present', () => {
    expect(visionResultToEntryPatch({ caption: 'English caption', alt: 'Альт.' })).toEqual({ visionAltUk: 'Альт.' });
  });

  it('never carries the caption into visionDescriptionUk, visionLabelUk or visionAltUk', () => {
    const patch = visionResultToEntryPatch({ caption: 'English caption', label: 'Мітка:' });
    expect(Object.values(patch)).not.toContain('English caption');
  });
});
