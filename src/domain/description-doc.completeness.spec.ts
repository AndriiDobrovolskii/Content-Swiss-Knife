/**
 * US-2.2 T5 — the template completeness gate, `validateTemplateCompleteness`.
 *
 * Why it exists: widening the shared schema (FR-17) would otherwise let a FULL description that
 * omits §3 or §9-era paragraphs validate. This gate restores the pre-Story mandatory set for Full
 * (undefined templateId) and enforces the per-template set for the simplified ids.
 *
 * Covers FR-3, FR-4, FR-5 (required / stray), FR-8 (Doc-path shape rule `simplified-specs-shape`,
 * D4b), FR-10, FR-11. Issue severity contract: a missing REQUIRED paragraph is an `error` (drives
 * the standard repair/retry); a stray EXCLUDED paragraph is a `warning` named
 * `template-excluded-paragraph` (the spec leaves stray output unspecified, plan R7).
 */
import { describe, it, expect } from 'vitest';
import { validateTemplateCompleteness } from './description-doc.completeness';
import type { ProductDescriptionDoc } from './description-doc';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';
import { filamentsDoc, accessoriesDoc, sparePartsDoc, without } from '../../test/fixtures/simplified-docs';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

type Flags = { includeFunctionality?: boolean; hasSpecs?: boolean };
const run = (doc: ProductDescriptionDoc, id: string | undefined, f: Flags = {}) =>
  validateTemplateCompleteness(doc, id, { includeFunctionality: false, hasSpecs: true, ...f });
const errors = (is: ReturnType<typeof run>) => is.filter(i => i.severity === 'error');
const pathsOf = (is: ReturnType<typeof run>) => is.map(i => i.path ?? '');
const startsWith = (is: ReturnType<typeof run>, key: string) => is.some(i => (i.path ?? '') === key || (i.path ?? '').startsWith(`${key}.`) || (i.path ?? '').startsWith(`${key}[`));

describe('Full description (templateId undefined) — the pre-Story mandatory set is restored (R2)', () => {
  it('a complete Full document yields no issues', () => {
    expect(run(v4ValidDoc(), undefined)).toEqual([]);
  });
  it.each([
    ['§2 killerSpecs', 'killerSpecs'],
    ['§2 keyBenefits', 'keyBenefits'],
    ['§3 functionality', 'functionality'],
    ['§4 applications', 'applications'],
    ['§7 specs', 'specs'],
    ['§8 cta', 'cta'],
  ])('a Full document missing %s yields an error at that path', (_label, key) => {
    const is = run(without(v4ValidDoc(), key), undefined);
    expect(errors(is).length).toBeGreaterThan(0);
    expect(startsWith(errors(is), key)).toBe(true);
  });
  it('§5 compatibility and §6 packageContents stay optional in Full, exactly as before', () => {
    expect(errors(run(without(v4ValidDoc(), 'compatibility', 'packageContents'), undefined))).toEqual([]);
  });
  it('Full requires §7 whatever hasSpecs says (Full behaviour is unchanged)', () => {
    expect(errors(run(without(v4ValidDoc(), 'specs'), undefined, { hasSpecs: false })).length).toBeGreaterThan(0);
  });
  it('an unknown or stale id is treated as Full', () => {
    expect(errors(run(without(v4ValidDoc(), 'functionality'), STALE_TEMPLATE_ID)).length).toBeGreaterThan(0);
  });
});

describe('Filaments/resins/powders (AC-3, AC-8, AC-15)', () => {
  const ID = 'filaments-resins-powders';
  it('a valid document (with and without §5) yields no issues', () => {
    expect(run(filamentsDoc(), ID)).toEqual([]);
    expect(run(filamentsDoc({ compat_present: false }), ID)).toEqual([]);
  });
  it.each(['killerSpecs', 'keyBenefits', 'applications'])('missing required %s is an error', key => {
    const is = run(without(filamentsDoc(), key), ID);
    expect(startsWith(errors(is), key)).toBe(true);
  });
  it('a stray §3 functionality is a warning named template-excluded-paragraph, never an error', () => {
    const doc = { ...(filamentsDoc() as object), functionality: [{ heading: 'Як працює', blocks: [{ kind: 'paragraph', text: 'Текст.' }] }] } as unknown as ProductDescriptionDoc;
    const is = run(doc, ID);
    expect(is.some(i => i.severity === 'warning' && i.rule === 'template-excluded-paragraph' && (i.path ?? '').startsWith('functionality'))).toBe(true);
    expect(errors(is)).toEqual([]);
  });
  it('a stray §6 packageContents is a warning, never an error', () => {
    const doc = { ...(filamentsDoc() as object), packageContents: { heading: 'Що в коробці?', items: ['Котушка'] } } as unknown as ProductDescriptionDoc;
    const is = run(doc, ID);
    expect(is.some(i => i.rule === 'template-excluded-paragraph' && i.severity === 'warning')).toBe(true);
    expect(errors(is)).toEqual([]);
  });
  it('hasSpecs true and §7 absent is an error at specs (AC-15: non-empty data -> §7 present)', () => {
    const is = run(without(filamentsDoc(), 'specs'), ID, { hasSpecs: true });
    expect(startsWith(errors(is), 'specs')).toBe(true);
  });
  it('hasSpecs false and §7 absent is fine (AC-15: empty data -> no §7)', () => {
    expect(errors(run(without(filamentsDoc(), 'specs'), ID, { hasSpecs: false }))).toEqual([]);
  });
  it('hasSpecs false and §7 present is flagged at specs (a specs table for empty source data is a defect)', () => {
    const is = run(filamentsDoc(), ID, { hasSpecs: false });
    expect(startsWith(is, 'specs')).toBe(true);
  });
});

describe('Accessories (AC-4, AC-9)', () => {
  const ID = 'accessories';
  it('flag unchecked: a document without §3 is complete', () => {
    expect(run(accessoriesDoc(), ID, { includeFunctionality: false })).toEqual([]);
  });
  it('flag checked: a document without §3 is an error at functionality', () => {
    const is = run(accessoriesDoc(), ID, { includeFunctionality: true });
    expect(startsWith(errors(is), 'functionality')).toBe(true);
  });
  it('flag checked: a document with §3 is complete', () => {
    expect(run(accessoriesDoc({ withFunctionality: true }), ID, { includeFunctionality: true })).toEqual([]);
  });
  it('flag unchecked: a §3 present anyway is a warning (excluded paragraph), never an error', () => {
    const is = run(accessoriesDoc({ withFunctionality: true }), ID, { includeFunctionality: false });
    expect(is.some(i => i.rule === 'template-excluded-paragraph' && i.severity === 'warning')).toBe(true);
    expect(errors(is)).toEqual([]);
  });
  it('a stray §4 applications is a warning, never an error', () => {
    const f = filamentsDoc() as unknown as { applications: unknown };
    const doc = { ...(accessoriesDoc() as object), applications: f.applications } as unknown as ProductDescriptionDoc;
    const is = run(doc, ID);
    expect(is.some(i => i.rule === 'template-excluded-paragraph' && (i.path ?? '').startsWith('applications'))).toBe(true);
    expect(errors(is)).toEqual([]);
  });
  it('a missing §2 is an error', () => {
    expect(startsWith(errors(run(without(accessoriesDoc(), 'killerSpecs', 'keyBenefits'), ID)), 'killerSpecs')).toBe(true);
  });
});

describe('Spare parts (AC-5)', () => {
  const ID = 'spare-parts';
  it('a §1 + §5 + §8 document is complete; so is one without §5', () => {
    expect(run(sparePartsDoc(), ID, { hasSpecs: false })).toEqual([]);
    expect(run(sparePartsDoc({ compat_present: false }), ID, { hasSpecs: false })).toEqual([]);
  });
  it.each(['killerSpecs', 'applications', 'specs', 'functionality', 'packageContents'])('a stray %s is a warning, not an error', key => {
    const donor: Record<string, unknown> = {
      killerSpecs: (filamentsDoc() as unknown as Record<string, unknown>).killerSpecs,
      applications: (filamentsDoc() as unknown as Record<string, unknown>).applications,
      specs: (filamentsDoc() as unknown as Record<string, unknown>).specs,
      functionality: (accessoriesDoc({ withFunctionality: true }) as unknown as Record<string, unknown>).functionality,
      packageContents: { heading: 'Що в коробці?', items: ['Деталь'] },
    };
    const doc = { ...(sparePartsDoc() as object), [key]: donor[key] } as unknown as ProductDescriptionDoc;
    const is = run(doc, ID, { hasSpecs: false });
    expect(is.some(i => i.rule === 'template-excluded-paragraph' && i.severity === 'warning')).toBe(true);
    expect(errors(is)).toEqual([]);
  });
});

describe('FR-8 on the Doc path — rule simplified-specs-shape (D4b)', () => {
  const shape = (is: ReturnType<typeof run>) => is.filter(i => i.rule === 'simplified-specs-shape');
  for (const [id, mk] of [
    ['filaments-resins-powders', (o: { specCategories?: number }) => filamentsDoc(o)],
    ['accessories', (o: { specCategories?: number }) => accessoriesDoc(o)],
  ] as const) {
    it(`${id}: one category passes`, () => {
      expect(shape(run(mk({ specCategories: 1 }), id))).toEqual([]);
    });
    it(`${id}: two categories is an error at specs.categories saying "exactly one category, no headings"`, () => {
      const s = shape(run(mk({ specCategories: 2 }), id));
      expect(s).toHaveLength(1);
      expect(s[0].severity).toBe('error');
      expect(s[0].path).toBe('specs.categories');
      expect(s[0].detail).toMatch(/exactly one category/i);
    });
    it(`${id}: three categories is an error`, () => {
      expect(shape(run(mk({ specCategories: 3 }), id)).map(i => i.severity)).toEqual(['error']);
    });
    it(`${id}: empty categories with a present specs is an error`, () => {
      const d = mk({}) as unknown as { specs: { heading: string } };
      const doc = { ...d, specs: { heading: d.specs.heading, categories: [] } } as unknown as ProductDescriptionDoc;
      expect(shape(run(doc, id)).map(i => i.severity)).toEqual(['error']);
    });
  }
  it('Full description with several categories is untouched by the rule', () => {
    const doc = v4ValidDoc();
    (doc as unknown as { specs: { categories: unknown[] } }).specs.categories.push({
      title: 'Друга група', rows: [{ label: 'A', value: '1' }],
    });
    expect(shape(run(doc, undefined))).toEqual([]);
  });
  it('absent specs raises no shape issue (Spare parts has no §7)', () => {
    expect(shape(run(sparePartsDoc(), 'spare-parts', { hasSpecs: false }))).toEqual([]);
  });
  it('the issue is actionable: it names no HTML tag the Doc model cannot carry', () => {
    const s = shape(run(filamentsDoc({ specCategories: 2 }), 'filaments-resins-powders'));
    expect(s[0].detail).not.toMatch(/<tbody>|<h3>/);
    expect(pathsOf(s)).toEqual(['specs.categories']);
  });
});
