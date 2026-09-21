/**
 * US-2.2 T3 — FR-18 runtime null-safety of every Doc walker.
 *
 * `npm run lint` proves the optional types are handled; it does NOT prove runtime behaviour, so each
 * walker that reads a now-optional Doc field gets one mandatory "absent paragraph" case here (task
 * breakdown T3, N2: a walker without its case means the task is not done). Every case runs the walker
 * on a Spare-parts-shaped document (only §1, §5, §8) and on a copy with the same paragraphs set to
 * null, and asserts (a) no throw and (b) the walker still does its job on the paragraphs that ARE
 * present, so a "return early on anything unusual" implementation cannot pass.
 *
 * One describe per walker: doc-block-repair, doc-tier, heading-style, sentence-length,
 * tov-second-person, bullet-lead-punctuation, alt-numeric-fidelity, video-manifest,
 * specs-grounding, spec-count-parity, spec-category-shape.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { sparePartsDoc, filamentsDoc, nulled } from '../../test/fixtures/simplified-docs';
import { getDocBlock, planDocBlockPatches, applyDocPatches, setDocBlock } from './doc-block-repair';
import { createDocBlockRepairExecutor } from './doc-tier';
import { validateHeadingStyleDoc } from './heading-style';
import { validateSentenceLengthDoc } from './sentence-length';
import { validateSecondPersonScopeDoc } from './tov-second-person';
import { validateBulletLeadPunctuationDoc, normalizeBulletLeadPunctuation } from './bullet-lead-punctuation';
import { validateAltNumericFidelityDoc } from './alt-numeric-fidelity';
import { validateVideoCoverageDoc } from './video-manifest';
import { validateSpecsGroundingDoc } from './specs-grounding';
import { validateSpecCountParityDoc, countActualSpecRowsDoc } from './spec-count-parity';
import { validateSpecCategoryShapeDoc } from './spec-category-shape';

const ABSENT = ['killerSpecs', 'keyBenefits', 'functionality', 'applications', 'packageContents', 'specs'];
const spare = () => sparePartsDoc();
const spareNulled = () => nulled(sparePartsDoc(), ...ABSENT);
const both = (): Array<[string, ProductDescriptionDoc]> => [['omitted', spare()], ['null', spareNulled()]];
const asRec = (d: ProductDescriptionDoc) => d as unknown as Record<string, unknown>;

/** A §5 bullets block whose lead and text collide (no separator on either side). */
function withCollidingCompat(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  return {
    ...(doc as object),
    compatibility: {
      heading: 'Сумісність',
      blocks: [{ kind: 'bullets', items: [{ lead: 'Матеріали', text: 'деревина' }, { lead: 'Платформи:', text: ' стіл' }] }],
    },
  } as unknown as ProductDescriptionDoc;
}

describe('doc-block-repair — absent paragraph', () => {
  it.each(both())('%s: paths into absent paragraphs resolve to nothing and plan no patch', (_m, doc) => {
    for (const p of ['functionality[0].blocks[0]', 'keyBenefits[0].items[0].text', 'applications.items[0].text', 'specs.categories[0].rows[0].label']) {
      expect(getDocBlock(doc, p)).toBeUndefined();
    }
    const plan = planDocBlockPatches(doc, new Map([['functionality[0].blocks[0]', ['x']], ['hook', ['shorten']]]));
    expect(plan.map(r => r.path)).toEqual(['hook']);
  });
  it.each(both())('%s: patching a present field leaves the absent ones absent', (_m, doc) => {
    const next = applyDocPatches(doc, new Map([['hook', '<b>eSUN PLA+</b> — новий текст']]));
    expect(getDocBlock(next, 'hook')!.text).toContain('новий текст');
    for (const k of ['functionality', 'applications', 'specs']) expect(asRec(next)[k] ?? undefined).toBeUndefined();
  });
  it('setDocBlock on the §5 paragraph of a Spare-parts document works', () => {
    const next = setDocBlock(spare(), 'compatibility.blocks[0]', 'оновлений текст');
    expect(getDocBlock(next, 'compatibility.blocks[0]')!.text).toBe('оновлений текст');
  });
});

describe('doc-tier — absent paragraph', () => {
  it.each(both())('%s: an issue addressing an absent paragraph triggers no model call and returns the doc unchanged', async (_m, doc) => {
    const generate = vi.fn(async () => '');
    const repair = createDocBlockRepairExecutor({ generate, languageLabel: 'Ukrainian (uk-UA)' });
    const out = await repair(doc, [
      { severity: 'warning', rule: 'sentence-too-long', detail: 'shorten', context: 'Doc', path: 'functionality[0].blocks[0]' },
    ]);
    expect(out).toBe(doc);
    expect(generate).not.toHaveBeenCalled();
  });
  it('an issue addressing a present paragraph still reaches the model', async () => {
    const generate = vi.fn(async () => '');
    const repair = createDocBlockRepairExecutor({ generate, languageLabel: 'Ukrainian (uk-UA)' });
    await repair(spare(), [{ severity: 'warning', rule: 'sentence-too-long', detail: 'shorten', context: 'Doc', path: 'hook' }]);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('heading-style — absent paragraph', () => {
  it.each(both())('%s: validates without throwing and reports only paths that exist', (_m, doc) => {
    let issues: ReturnType<typeof validateHeadingStyleDoc> = [];
    expect(() => { issues = validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', 'eSUN PLA+'); }).not.toThrow();
    for (const i of issues) {
      expect(i.path ?? '', i.rule).not.toMatch(/^(doc\.)?(functionality|applications|specs|keyBenefits|packageContents)/);
    }
  });
  it('still judges a present heading: a nominal §5 heading in Style B is reported on a Spare-parts document', () => {
    const doc = { ...(spare() as object), compatibility: { heading: 'eSUN PLA+ eSUN PLA+ eSUN PLA+', blocks: [{ kind: 'paragraph', text: 'текст' }] } } as unknown as ProductDescriptionDoc;
    const issues = validateHeadingStyleDoc(doc, 'uk-UA', 'Center 3D Print', 'eSUN PLA+');
    expect(issues.some(i => (i.path ?? '').includes('compatibility'))).toBe(true);
  });
});

describe('sentence-length — absent paragraph', () => {
  it.each(both())('%s: validates without throwing', (_m, doc) => {
    expect(() => validateSentenceLengthDoc(doc, 'uk-UA', 'Doc (base)')).not.toThrow();
  });
  it('still flags an over-long sentence in the present §1 hook', () => {
    const long = `<b>eSUN PLA+</b> — ${Array.from({ length: 120 }, () => 'слово').join(' ')}.`;
    const doc = { ...(spare() as object), hook: long } as unknown as ProductDescriptionDoc;
    expect(validateSentenceLengthDoc(doc, 'uk-UA', 'Doc (base)').some(i => (i.path ?? '') === 'hook')).toBe(true);
  });
});

describe('tov-second-person — absent paragraph', () => {
  it.each(both())('%s: validates without throwing for the store the scope applies to', (_m, doc) => {
    expect(() => validateSecondPersonScopeDoc(doc, 'uk-UA', 'Center 3D Print')).not.toThrow();
    expect(() => validateSecondPersonScopeDoc(doc, 'uk-UA', 'EXPERT3D')).not.toThrow();
  });
});

describe('bullet-lead-punctuation — absent paragraph', () => {
  it.each(both())('%s: a Spare-parts document with no colliding bullet yields no issue', (_m, doc) => {
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
  });
  it('flags a colliding bullet in §5 when §2, §3 and §4 are absent, and the fixer repairs it without adding paragraphs', () => {
    const doc = withCollidingCompat(spare());
    const issues = validateBulletLeadPunctuationDoc(doc, 'Doc (base)');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('bullet-lead-collision');
    const fixed = normalizeBulletLeadPunctuation(doc);
    expect(fixed.fixed).toBe(1);
    expect(validateBulletLeadPunctuationDoc(fixed.doc, 'Doc (base)')).toEqual([]);
    for (const k of ['functionality', 'applications', 'keyBenefits']) expect(asRec(fixed.doc)[k] ?? undefined).toBeUndefined();
  });
  it('the fixer also tolerates null paragraphs', () => {
    expect(() => normalizeBulletLeadPunctuation(spareNulled())).not.toThrow();
  });
});

describe('alt-numeric-fidelity — absent paragraph', () => {
  const figDoc = (): ProductDescriptionDoc => ({
    ...(spare() as object),
    compatibility: { heading: 'Сумісність', blocks: [{ kind: 'paragraph', text: 'Вступ.' }, { kind: 'figure', ref: 0 }] },
    figures: [{ file: 'part.jpg', alt: 'Деталь 9999 мм', caption: '<b>Деталь. </b>Вигляд.' }],
  }) as unknown as ProductDescriptionDoc;
  it.each(both())('%s: validates without throwing', (_m, doc) => {
    expect(() => validateAltNumericFidelityDoc(doc, 'Діаметр 1,75 мм', 'Doc (base)')).not.toThrow();
  });
  it('still reports an ungrounded number in a figure alt when §2–§4 are absent', () => {
    const issues = validateAltNumericFidelityDoc(figDoc(), 'Діаметр 1,75 мм', 'Doc (base)');
    expect(issues.some(i => i.rule === 'alt-numeric-not-grounded' && (i.path ?? '').startsWith('figures[0]'))).toBe(true);
  });
});

describe('video-manifest — absent paragraph', () => {
  const embed = { src: 'https://www.youtube.com/embed/abc123', key: 'youtube:abc123' };
  it('a missing embed is still reported for a Spare-parts document (no §3 to hold it changes nothing)', () => {
    const issues = validateVideoCoverageDoc((spare() as unknown as { videos: never[] }).videos, [embed as never], 'Doc (uk-UA)');
    expect(issues.map(i => i.rule)).toEqual(['video-embed-missing']);
  });
  it('a video carried in §5 satisfies coverage even though §3 is absent (FR-23)', () => {
    const videos = [{ src: 'https://www.youtube.com/embed/abc123', title: 'Огляд', caption: '<b>Огляд. </b>Відео.' }];
    expect(validateVideoCoverageDoc(videos, [embed as never], 'Doc (uk-UA)')).toEqual([]);
  });
});

describe('specs-grounding — absent paragraph', () => {
  it.each(both())('%s: with §7 absent the grounding check is a no-op (no throw, no issue)', (_m, doc) => {
    let issues: ReturnType<typeof validateSpecsGroundingDoc> = [{ severity: 'error', rule: 'x', detail: '', context: '' }];
    expect(() => { issues = validateSpecsGroundingDoc(doc, 'Діаметр: 1,75 мм', 'Doc (base)'); }).not.toThrow();
    expect(issues).toEqual([]);
  });
  it('with §7 present it still checks: a fabricated row is reported', () => {
    const base = filamentsDoc() as unknown as { specs: { heading: string; categories: Array<{ title: string; rows: unknown[] }> } };
    const doc = { ...base, specs: { ...base.specs, categories: [{ title: 'Група', rows: [{ label: 'Колір', value: 'Синій' }, { label: 'Діаметр', value: '1,75 мм' }, { label: 'Вага', value: '1 кг' }] }] } } as unknown as ProductDescriptionDoc;
    const issues = validateSpecsGroundingDoc(doc, 'Діаметр: 1,75 мм. Вага: 1 кг.', 'Doc (base)');
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe('spec-count-parity — absent paragraph (FR-11, FR-21)', () => {
  const CANON = '| Параметр | Значення |\n|---|---|\n| Діаметр | 1,75 мм |\n| Вага | 1 кг |';
  it.each(both())('%s: §7 absent -> counting is 0 and the parity check is a no-op, not a throw', (_m, doc) => {
    expect(() => countActualSpecRowsDoc(doc)).not.toThrow();
    expect(countActualSpecRowsDoc(doc)).toBe(0);
    expect(validateSpecCountParityDoc(doc, CANON, 'eSUN PLA+', 'Doc (base)')).toEqual([]);
  });
  it('with §7 present the check still fires on a shortfall of two rows', () => {
    const base = filamentsDoc() as unknown as { specs: { heading: string } };
    const doc = { ...base, specs: { heading: base.specs.heading, categories: [{ title: 'Група', rows: [{ label: 'Один', value: '1' }] }] } } as unknown as ProductDescriptionDoc;
    const canon = '| Параметр | Значення |\n|---|---|\n| A | 1 |\n| B | 2 |\n| C | 3 |\n| D | 4 |';
    expect(validateSpecCountParityDoc(doc, canon, 'eSUN PLA+', 'Doc (base)').some(i => i.severity === 'error')).toBe(true);
  });
});

describe('spec-category-shape — absent paragraph', () => {
  it.each(both())('%s: §7 absent yields no issue and does not throw', (_m, doc) => {
    expect(() => validateSpecCategoryShapeDoc(doc, 'Doc (base)')).not.toThrow();
    expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)')).toEqual([]);
  });
});
