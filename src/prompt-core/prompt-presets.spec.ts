/**
 * prompt-presets.spec.ts - US-10.1 T4 (FR-28, FR-29, FR-30, FR-31, FR-78, FR-79, FR-80, NFR-8, NFR-13).
 *
 * `src/prompt-core/prompt-presets.ts` is the one place studio prompt text lives (AGENTS.md section 3 Rule 3,
 * FR-78): the five presets, the four quick-edit chip instructions and `applyProduct()`. Written from the
 * Specification (FR-30 table, SD-21 literals, D-14, D-15), not from the implementation.
 *
 * PINNED CONTRACT (CONTRACT.md "Presets" plus the helper names the plan leaves open):
 *   PROMPT_PRESETS: Array<{ id; name: { en; uk }; template; defaults: { aspectRatio; resolution; model } }>
 *   CHIP_INSTRUCTIONS: Array<{ id: 'remove-background'|'brighter'|'softer-shadow'|'different-angle';
 *                              textId: 'T-15a'|'T-15b'|'T-15c'|'T-15d'; instruction }>
 *   applyProduct(template, product): string                 D-14 / D-15
 *   validatePreset(entry: unknown, models?): string[]        [] when valid, else one message per defect (FR-29
 *                                                            failure path: caught by the registry test, not at runtime);
 *                                                            checks required fields, `{product}` in the template, aspect
 *                                                            ratio / resolution against the shared contract, and the
 *                                                            default resolution against the model's `resolutions`
 *   findPreset(id, registry = PROMPT_PRESETS): preset | undefined   the consumer function; takes the registry as a parameter
 *                                                            so the "adding an entry needs no component change" test
 *                                                            can pass a copy
 *   presetName(preset, lang: 'en'|'uk'): string
 *
 * Not asserted: how a component fills the form (T41), the 4 model-facing chip texts being sent (T28).
 * Coverage: src/prompt-core/** floors 95/95/85/95 (NFR-13) apply to this file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as catalog from './model-catalog';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';

/** FR-30 table + SD-21 literals, verbatim. */
const EXPECTED = [
  {
    id: 'white-bg', uk: 'Білий фон', en: 'White background', aspectRatio: '1:1', resolution: '2K', model: FLASH,
    template: 'Product photo of {product} on a clean pure white (#FFFFFF) background, soft shadow below the product, product centred in the frame.',
    directives: ['#FFFFFF', 'soft shadow', 'centred'],
  },
  {
    id: 'lifestyle', uk: 'Лайфстайл', en: 'Lifestyle', aspectRatio: '4:3', resolution: '2K', model: PRO,
    template: 'Lifestyle photo of {product} placed in a real environment such as a workshop, an office or a classroom.',
    directives: ['workshop', 'office', 'classroom'],
  },
  {
    id: 'banner', uk: 'Банер', en: 'Banner', aspectRatio: '16:9', resolution: '2K', model: PRO,
    template: 'Wide banner image featuring {product}, with a free area reserved for text. Do not draw any text.',
    directives: ['free area reserved for text', 'Do not draw any text'],
  },
  {
    id: 'social', uk: 'Соцмережі', en: 'Social', aspectRatio: '4:5', resolution: '1K', model: FLASH,
    template: 'Social media image of {product}.', directives: [],
  },
  {
    id: 'detail-closeup', uk: 'Деталь крупним планом', en: 'Detail close-up', aspectRatio: '1:1', resolution: '2K', model: PRO,
    template: 'Detail close-up of {product}.', directives: [],
  },
];

describe('PROMPT_PRESETS registry (FR-29, FR-30, FR-78, AC-15, AC-16, AC-17)', () => {
  it('FR-30: contains exactly five presets with the OD-26 ids, in the AC-17 order', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    expect(PROMPT_PRESETS.map((p: any) => p.id)).toEqual(['white-bg', 'lifestyle', 'banner', 'social', 'detail-closeup']);
  });

  it('FR-30: every preset carries both names (uk and en) exactly as OD-26 fixes them', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    for (const e of EXPECTED) {
      const p = PROMPT_PRESETS.find((x: any) => x.id === e.id);
      expect(p, e.id).toBeDefined();
      expect(p.name, e.id).toEqual({ uk: e.uk, en: e.en });
    }
  });

  it('FR-30 / SD-21: every template is the SD-21 literal, contains {product} and its AC-17 directive words', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    for (const e of EXPECTED) {
      const p = PROMPT_PRESETS.find((x: any) => x.id === e.id);
      expect(p.template, e.id).toBe(e.template);
      expect(p.template, e.id).toContain('{product}');
      for (const word of e.directives) expect(p.template, `${e.id}: ${word}`).toContain(word);
    }
  });

  it('FR-30 / AC-17: the defaults (aspect ratio, resolution, model) match the AC-17 table for every preset', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    for (const e of EXPECTED) {
      const p = PROMPT_PRESETS.find((x: any) => x.id === e.id);
      expect(p.defaults, e.id).toEqual({ aspectRatio: e.aspectRatio, resolution: e.resolution, model: e.model });
    }
  });

  it('FR-28 / FR-29: every default model id is a catalogue image model and every default resolution is inside that model\'s resolutions', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    expect(PROMPT_PRESETS).toHaveLength(5);
    for (const p of PROMPT_PRESETS) {
      const model = (catalog as any).findImageModel(p.defaults.model);
      expect(model, `${p.id}: model ${p.defaults.model} must be in the catalogue`).toBeDefined();
      expect(model.resolutions, `${p.id}: resolution ${p.defaults.resolution}`).toContain(p.defaults.resolution);
    }
  });

  it('FR-30: preset ids are unique, lowercase and safe for a task label (no "|", matches ^[a-z0-9][a-z0-9-]{0,63}$)', async () => {
    const { PROMPT_PRESETS } = await load('./prompt-presets');
    const ids = PROMPT_PRESETS.map((p: any) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]{0,63}$/);
  });

  it('FR-29: every registry entry passes the registry validator (malformed entries are caught by the test, not at runtime)', async () => {
    const { PROMPT_PRESETS, validatePreset } = await load('./prompt-presets');
    expect(PROMPT_PRESETS).toHaveLength(5);
    for (const p of PROMPT_PRESETS) expect(validatePreset(p), p.id).toEqual([]);
  });
});

describe('validatePreset - the FR-29 / FR-28 failure paths', () => {
  const good = () => ({
    id: 'extra', name: { en: 'Extra', uk: 'Додатково' }, template: 'An extra image of {product}.',
    defaults: { aspectRatio: '1:1', resolution: '1K', model: FLASH },
  });

  it('FR-29: accepts a well-formed entry', async () => {
    const { validatePreset } = await load('./prompt-presets');
    expect(validatePreset(good())).toEqual([]);
  });

  it.each([
    ['a missing id', (p: any) => { delete p.id; }],
    ['a missing uk name', (p: any) => { delete p.name.uk; }],
    ['a missing en name', (p: any) => { p.name.en = ''; }],
    ['a missing template', (p: any) => { delete p.template; }],
    ['a missing defaults block', (p: any) => { delete p.defaults; }],
    ['a missing default model', (p: any) => { delete p.defaults.model; }],
    ['an unknown aspect ratio', (p: any) => { p.defaults.aspectRatio = '2:1'; }],
    ['an unknown resolution', (p: any) => { p.defaults.resolution = '8K'; }],
    ['4K on Flash (not offered for that model)', (p: any) => { p.defaults.resolution = '4K'; }],
    ['an unknown model id', (p: any) => { p.defaults.model = 'gemini-9-image'; }],
    ['a text model id', (p: any) => { p.defaults.model = 'gemini-3.1-pro-preview'; }],
    ['a template without the {product} placeholder (FR-79 failure path)', (p: any) => { p.template = 'A plain image.'; }],
  ])('FR-29: rejects %s with at least one message', async (_name, mutate) => {
    const { validatePreset } = await load('./prompt-presets');
    const p: any = good();
    mutate(p);
    const errors = validatePreset(p);
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) expect(typeof e).toBe('string');
  });

  it('FR-28: 4K on Pro is allowed (the same resolution that Flash rejects)', async () => {
    const { validatePreset } = await load('./prompt-presets');
    const p: any = good();
    p.defaults.model = PRO;
    p.defaults.resolution = '4K';
    expect(validatePreset(p)).toEqual([]);
  });

  it('FR-29: rejects non-object input without throwing', async () => {
    const { validatePreset } = await load('./prompt-presets');
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(validatePreset(bad).length, String(bad)).toBeGreaterThan(0);
    }
  });
});

describe('registry is data: adding a preset needs no component change (FR-29, AC-16)', () => {
  it('FR-29: an entry added to a COPY of the registry is found by the same consumer function and named in both languages', async () => {
    const { PROMPT_PRESETS, findPreset, presetName } = await load('./prompt-presets');
    const extra = {
      id: 'packshot', name: { en: 'Packshot', uk: 'Пекшот' }, template: 'Packshot of {product}.',
      defaults: { aspectRatio: '1:1', resolution: '1K', model: FLASH },
    };
    const copy = [...PROMPT_PRESETS, extra];
    expect(findPreset('packshot', copy)).toBe(extra);
    expect(findPreset('packshot')).toBeUndefined(); // the shipped registry is untouched
    expect(presetName(extra, 'en')).toBe('Packshot');
    expect(presetName(extra, 'uk')).toBe('Пекшот');
    expect(findPreset('white-bg', copy)!.id).toBe('white-bg');
    expect(findPreset('nope', copy)).toBeUndefined();
  });

  it('FR-30: presetName follows the language argument for the shipped presets', async () => {
    const { PROMPT_PRESETS, presetName } = await load('./prompt-presets');
    for (const e of EXPECTED) {
      const p = PROMPT_PRESETS.find((x: any) => x.id === e.id);
      expect(presetName(p, 'uk')).toBe(e.uk);
      expect(presetName(p, 'en')).toBe(e.en);
    }
  });
});

describe('CHIP_INSTRUCTIONS (FR-31, SD-21, OD-42)', () => {
  it('FR-31: exactly four chips, each tied to its T-15 text id, each sending the SD-21 English instruction', async () => {
    const { CHIP_INSTRUCTIONS } = await load('./prompt-presets');
    expect(CHIP_INSTRUCTIONS.map((c: any) => [c.id, c.textId, c.instruction])).toEqual([
      ['remove-background', 'T-15a', 'Remove the background.'],
      ['brighter', 'T-15b', 'Make the image brighter.'],
      ['softer-shadow', 'T-15c', 'Make the shadow softer.'],
      ['different-angle', 'T-15d', 'Show the product from a different angle.'],
    ]);
  });

  it('FR-31 / CF-3: the instruction is single-language English whatever the UI language (no Cyrillic)', async () => {
    const { CHIP_INSTRUCTIONS } = await load('./prompt-presets');
    expect(CHIP_INSTRUCTIONS).toHaveLength(4);
    for (const c of CHIP_INSTRUCTIONS) expect(c.instruction).not.toMatch(/\p{Script=Cyrillic}/u);
  });
});

describe('applyProduct (FR-79, D-14, D-15)', () => {
  it('FR-79: white-bg with the field "Bambu Lab H2D" gives a prompt containing the name and no {product}', async () => {
    const { PROMPT_PRESETS, applyProduct } = await load('./prompt-presets');
    const white = PROMPT_PRESETS.find((p: any) => p.id === 'white-bg');
    const out = applyProduct(white.template, 'Bambu Lab H2D');
    expect(out).toContain('Bambu Lab H2D');
    expect(out).not.toContain('{product}');
    expect(out).toBe('Product photo of Bambu Lab H2D on a clean pure white (#FFFFFF) background, soft shadow below the product, product centred in the frame.');
  });

  it('D-15: an empty field gives the words "the product" and no placeholder', async () => {
    const { applyProduct } = await load('./prompt-presets');
    expect(applyProduct('Social media image of {product}.', '')).toBe('Social media image of the product.');
  });

  it('D-15: a whitespace-only field counts as empty', async () => {
    const { applyProduct } = await load('./prompt-presets');
    expect(applyProduct('Social media image of {product}.', '   \t ')).toBe('Social media image of the product.');
  });

  it('FR-79: every shipped preset resolves with no {product} left, for a typed name and for an empty field', async () => {
    const { PROMPT_PRESETS, applyProduct } = await load('./prompt-presets');
    expect(PROMPT_PRESETS).toHaveLength(5);
    for (const p of PROMPT_PRESETS) {
      expect(applyProduct(p.template, 'Prusa MK4'), p.id).not.toContain('{product}');
      expect(applyProduct(p.template, 'Prusa MK4'), p.id).toContain('Prusa MK4');
      expect(applyProduct(p.template, ''), p.id).not.toContain('{product}');
      expect(applyProduct(p.template, ''), p.id).toContain('the product');
    }
  });

  it('FR-79: replaces every occurrence of the placeholder', async () => {
    const { applyProduct } = await load('./prompt-presets');
    expect(applyProduct('{product} and {product}', 'X1C')).toBe('X1C and X1C');
  });

  it('FR-79: the name is used as typed - replacement-pattern characters in it are not interpreted', async () => {
    const { applyProduct } = await load('./prompt-presets');
    expect(applyProduct('Image of {product}.', 'A$&B $1 $$')).toBe('Image of A$&B $1 $$.');
  });

  it('D-14: it is a pure function - a later change of the field cannot rewrite text already produced, and the template is not mutated', async () => {
    const { applyProduct } = await load('./prompt-presets');
    const template = 'Image of {product}.';
    const first = applyProduct(template, 'Alpha');
    const second = applyProduct(template, 'Beta');
    expect(first).toBe('Image of Alpha.');
    expect(second).toBe('Image of Beta.');
    expect(template).toBe('Image of {product}.');
  });

  it('FR-79: a template with no placeholder is returned unchanged (nothing invented)', async () => {
    const { applyProduct } = await load('./prompt-presets');
    expect(applyProduct('No placeholder here.', 'X')).toBe('No placeholder here.');
  });
});

describe('no system instruction anywhere in the registry module (FR-80, NFR-8)', () => {
  it('FR-80: the module exports no system-instruction-like symbol, and no preset or chip carries such a field', async () => {
    const m = await load('./prompt-presets');
    expect(m.PROMPT_PRESETS).toBeDefined();
    for (const key of Object.keys(m)) expect(key, `export ${key}`).not.toMatch(/system/i);
    for (const p of [...m.PROMPT_PRESETS, ...m.CHIP_INSTRUCTIONS]) {
      for (const key of Object.keys(p)) expect(key, `field ${key}`).not.toMatch(/system/i);
    }
  });

  it('NFR-8: the prompt-presets source is the home of the template literals - the SD-21 white-bg template appears in it', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/prompt-core/prompt-presets.ts'), 'utf8');
    expect(src).toContain('Product photo of {product} on a clean pure white (#FFFFFF) background');
  });
});
