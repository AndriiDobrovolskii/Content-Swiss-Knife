import { describe, it, expect, vi } from 'vitest';
import { buildPromptSlug } from './task-slug';
import { normalizeSlug, stripSlugStopwords } from '../prompt-core/slug-utils';
import * as flagModule from '../prompt-core/slug-context-enrichment-flag';

vi.mock('../prompt-core/slug-context-enrichment-flag', () => ({
  usesSlugContextEnrichment: vi.fn(() => false),
}));

describe('buildPromptSlug — context window', () => {
  it('omits the [CONTEXT] block entirely when no context is passed', () => {
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(payload.userContent).not.toContain('[CONTEXT');
  });

  it('includes the context up to 4000 characters, not the old 1000-character cap', () => {
    // Long enough that §1's hook alone would have exhausted the old 1000-char limit before the
    // killer-specs table (§2a) ever appeared — this string simulates that shape.
    const hook = 'A'.repeat(1500);
    const killerSpecsMarker = '<div data-section="killer-specs">KILLER-SPECS-TABLE</div>';
    const html = `<p>${hook}</p>${killerSpecsMarker}`;
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA'], html);
    expect(payload.userContent).toContain(killerSpecsMarker);
  });

  it('still truncates at 4000 characters, not the whole document', () => {
    const html = 'B'.repeat(5000);
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA'], html);
    const contextBlock = payload.userContent.split('[CONTEXT')[1];
    expect(contextBlock.match(/B/g)?.length).toBe(4000);
  });
});

describe('buildPromptSlug — context enrichment (Rule 9)', () => {
  it('omits the CONTEXT ENRICHMENT block for a store not on the allow-list (default: every store)', () => {
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(payload.systemBlocks.length).toBe(2);
    expect(payload.systemBlocks.map(b => b.text).join('\n')).not.toContain('CONTEXT ENRICHMENT');
  });

  it('includes the CONTEXT ENRICHMENT block as its own cached system block for an allow-listed store', () => {
    vi.mocked(flagModule.usesSlugContextEnrichment).mockReturnValueOnce(true);
    const payload = buildPromptSlug('Center 3D Print', 'Revopoint MetroY Ultra', ['uk-UA']);
    expect(payload.systemBlocks.length).toBe(3);
    expect(payload.systemBlocks[2].text).toContain('CONTEXT ENRICHMENT');
    expect(payload.systemBlocks[2].cache).toBe(true);
  });

  it('leaves the base task-template block byte-identical whether or not enrichment is on', () => {
    const off = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    vi.mocked(flagModule.usesSlugContextEnrichment).mockReturnValueOnce(true);
    const on = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(on.systemBlocks[1].text).toBe(off.systemBlocks[1].text);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// US-7.1 T9 (FR-3, FR-9, AC-1 prompt half, AC-9). The Slugs prompt's worked examples are the model's
// strongest signal. Four of them used to teach "localize the head noun, drop or re-order tokens" for
// BRANDED / MODEL input names — the legacy behaviour the Story invalidates. AC-9: no example with a
// protected input name may translate, drop or re-order a token of it (numbers and units may be
// locale-formatted); a localized category noun MAY be added around the name.
//
// Self-contained on purpose: this file only imports modules that already exist, so the green tests
// above stay green. The example parser reads the JSON the prompt itself contains.
// ═══════════════════════════════════════════════════════════════════════════
interface ExampleEntry { language: string; name: string; slug: string }
interface WorkedExample { input: string; entries: ExampleEntry[] }

function workedExamples(promptText: string): WorkedExample[] {
  return promptText.split('Input product: "').slice(1).map(part => ({
    input: part.slice(0, part.indexOf('"')),
    entries: [...part.matchAll(/\{"language":"([^"]+)","name":"([^"]+)","slug":"([^"]+)"\}/g)]
      .map(m => ({ language: m[1], name: m[2], slug: m[3] })),
  }));
}

/** Rule 3 of the Specification for one name: locale decimal separators and Cyrillic units are normalized. */
const UNIT_BACK: Record<string, string> = { 'мм': 'mm', 'кг': 'kg', 'см': 'cm', 'Вт': 'W' };
const tokensOf = (s: string) =>
  s.replace(/(\d),(\d)/g, '$1.$2').split(/\s+/).filter(Boolean).map(t => UNIT_BACK[t] ?? t);

function containsContiguous(haystack: string[], needle: string[]): boolean {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((t, k) => haystack[i + k] === t)) return true;
  }
  return false;
}

const keepsTypedName = (name: string, typed: string) => containsContiguous(tokensOf(name), tokensOf(typed));

describe('buildPromptSlug — worked examples never localize a protected input name (FR-9, AC-9)', () => {
  const instruction = buildPromptSlug('EXPERT3D', 'Formlabs Form Studio 1 Resin Tank Pro', ['uk-UA']).systemBlocks[1].text;
  const examples = workedExamples(instruction);

  it('premise: the instruction block carries the three base worked examples, each with several locales', () => {
    expect(examples.map(e => e.input)).toEqual([
      'Bambu Lab Hardened Steel Nozzle 0.4 mm',
      'Bambu Lab PLA Basic Filament 1.75 mm 1 kg x4 With Spool CMYK',
      'XGRIDS L2 Pro 32/300 Standard Package',
    ]);
    for (const e of examples) expect(e.entries.length).toBeGreaterThanOrEqual(3);
  });

  it.each([0, 1, 2])('example %i: every locale name keeps every token of the input, in order, untranslated', (i) => {
    const ex = examples[i];
    const offenders = ex.entries.filter(e => !keepsTypedName(e.name, ex.input)).map(e => `${e.language}: ${e.name}`);
    expect(offenders, `names that translate, drop or re-order a token of "${ex.input}"`).toEqual([]);
  });

  it.each([0, 1, 2])('example %i: every locale slug contains the slugified input name (AC-1 shape)', (i) => {
    const ex = examples[i];
    const typedSlug = normalizeSlug(stripSlugStopwords(ex.input), 'en-GB');
    const offenders = ex.entries.filter(e => !e.slug.includes(typedSlug)).map(e => `${e.language}: ${e.slug}`);
    expect(offenders, `slugs missing "${typedSlug}"`).toEqual([]);
  });

  it('the CONTEXT ENRICHMENT worked example also keeps its protected input name whole (regression guard: it already conforms)', () => {
    vi.mocked(flagModule.usesSlugContextEnrichment).mockReturnValueOnce(true);
    const payload = buildPromptSlug('Center 3D Print', 'Revopoint MetroY Ultra Standard Edition', ['uk-UA']);
    const enrichment = workedExamples(payload.systemBlocks[2].text);
    expect(enrichment).toHaveLength(1);
    const offenders = enrichment[0].entries.filter(e => !keepsTypedName(e.name, enrichment[0].input));
    expect(offenders).toEqual([]);
  });
});

describe('buildPromptSlug — the protected-name carve-out is stated in the NAME composition rules (FR-2, FR-3)', () => {
  const instruction = buildPromptSlug('EXPERT3D', 'Formlabs Form Studio 1 Resin Tank Pro', ['uk-UA']).systemBlocks[1].text;
  const compositionRules = instruction.slice(
    instruction.indexOf('NAME — COMPOSITION RULES'),
    instruction.indexOf('NAME — BUNDLES'),
  );

  it('premise: the composition-rules section was located', () => {
    expect(compositionRules.length).toBeGreaterThan(500);
  });

  it('refers to the [PROTECTED PRODUCT NAME] block and says the typed name is kept whole there', () => {
    expect(compositionRules).toContain('[PROTECTED PRODUCT NAME]');
    expect(compositionRules).toMatch(/every token/i);
  });

  it('says a protected name overrides the head-noun localization and the length-drop rules', () => {
    expect(compositionRules).toMatch(/protected[\s\S]{0,400}(overrid|precedence|supersed|instead of|exception|except|wins|takes priority)/i);
  });

  it('allows a localized category noun to be added around the protected name', () => {
    expect(compositionRules).toMatch(/protected[\s\S]{0,600}categor|categor[\s\S]{0,600}protected/i);
  });
});

describe('buildPromptSlug — generic-name behaviour is unchanged (FR-9, regression guard)', () => {
  const instruction = buildPromptSlug('EXPERT3D', 'Hardened Steel Nozzle 0.4 mm', ['uk-UA']).systemBlocks[1].text;

  it('still tells the model to localize the whole descriptive part, head noun included, for a name without a brand or model', () => {
    expect(instruction).toContain('Localize the ENTIRE descriptive part');
  });

  it('still orders non-English locales category-first and English locales brand-first', () => {
    expect(instruction).toContain('CATEGORY-FIRST');
    expect(instruction).toContain('BRAND-FIRST');
  });

  it('still carries the single-render rule and the slug stopword rule', () => {
    expect(instruction).toContain('SINGLE-RENDER');
    expect(instruction).toContain('Drop connective prepositions/articles');
  });
});
