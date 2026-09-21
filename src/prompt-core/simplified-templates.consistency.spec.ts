/**
 * US-2.2 T15 (plan D11) — the four templates agree across prompt, schema, renderer and validator.
 *
 * "A consistency test iterates all four templates and checks: every paragraph the prompt requests can
 * be produced by a schema-valid doc, and the render of that doc passes the validator with zero errors."
 * That is how a prompt asking for a field the validator rejects is caught before a model is billed.
 *
 * Paragraph <-> document key map (v4): 1 hook; 2 killerSpecs+keyBenefits; 3 functionality;
 * 4 applications; 5 compatibility; 6 packageContents; 7 specs; 8 cta.
 */
import { describe, it, expect } from 'vitest';
import { SIMPLIFIED_TEMPLATE_IDS, paragraphsFor, isSimplifiedTemplateId } from './simplified-templates';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import { validateTemplateCompleteness } from '../domain/description-doc.completeness';
import { validateSimplifiedTemplateHtml } from '../utils/simplified-word-ranges';
import { validateGeneratedHtml } from '../utils/output-validator';
import { renderDescription } from '../render/render-description';
import { buildPromptADoc } from '../prompts/task-a-doc';
import { buildPromptA } from '../prompts/task-a';
import { conformanceSimplifiedDoc, lazy } from '../../test/fixtures/simplified-docs';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';
import { EXPERT3D_INPUT, LEGACY_INPUT } from '../../test/fixtures/full-description-inputs';
import { paragraphMentions, templateText } from '../../test/fixtures/prompt-clauses';

const KEYS: Record<number, string[]> = {
  1: ['hook'], 2: ['killerSpecs', 'keyBenefits'], 3: ['functionality'], 4: ['applications'],
  5: ['compatibility'], 6: ['packageContents'], 7: ['specs'], 8: ['cta'],
};
const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };
const present = (doc: object) => Object.keys(KEYS).map(Number).filter(n => KEYS[n].every(k => (doc as Record<string, unknown>)[k] != null));

const RUNS = SIMPLIFIED_TEMPLATE_IDS.flatMap(id =>
  (id === 'accessories' ? [true, false] : [false]).map(flag => ({ id, flag })));

describe.each(RUNS)('$id (functionality flag $flag)', ({ id, flag }) => {
  const required = paragraphsFor(id, { includeFunctionality: flag });
  const doc = conformanceSimplifiedDoc(id, 'uk-UA', { includeFunctionality: flag });
  const htmlL = lazy(() => renderDescription(doc, CTX, { flatSpecs: true }));

  it('the paragraph set is what the document carries (data-conditional §5 and §7 may be absent, nothing else)', () => {
    const have = present(doc);
    for (const n of have) expect(required, `doc has §${n} the template does not list`).toContain(n);
    for (const n of required.filter(n => ![5, 7].includes(n))) expect(have, `template requires §${n}`).toContain(n);
  });

  it('a document carrying exactly those paragraphs is schema-valid', () => {
    const r = ProductDescriptionDocSchema.safeParse(doc);
    expect(r.success, JSON.stringify(r.success ? [] : r.error.issues)).toBe(true);
  });

  it('the completeness gate agrees: zero issues', () => {
    expect(validateTemplateCompleteness(doc, id, { includeFunctionality: flag, hasSpecs: required.includes(7) })).toEqual([]);
  });

  it('its render passes the simplified validators with zero errors (ranges and flat-§7 shape)', () => {
    expect(validateSimplifiedTemplateHtml(htmlL(), id, 'uk-UA', 'HTML (uk-UA)').filter(i => i.severity === 'error')).toEqual([]);
  });

  it('and passes the frozen validator entry point with zero errors', () => {
    const errors = validateGeneratedHtml(htmlL(), 'HTML (uk-UA)', 'eSUN PLA+', 'uk-UA', { templateId: id }).filter(i => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
  });

  it('the Doc prompt and the legacy prompt request the same paragraphs as the registry', () => {
    const doc$ = paragraphMentions(templateText(
      buildPromptADoc({ ...EXPERT3D_INPUT, templateId: id, includeFunctionality: flag }),
      buildPromptADoc({ ...EXPERT3D_INPUT }), { includeSystemTask: true })).requested;
    const legacy$ = paragraphMentions(templateText(
      buildPromptA({ ...LEGACY_INPUT, templateId: id, includeFunctionality: flag }),
      buildPromptA({ ...LEGACY_INPUT }), { includeSystemTask: false })).requested;
    for (const n of required) {
      expect(doc$.has(n), `Doc prompt misses §${n}`).toBe(true);
      expect(legacy$.has(n), `legacy prompt misses §${n}`).toBe(true);
    }
    // Accessories' §3 is decided per run in userContent; the fixed task block may name it conditionally.
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !required.includes(n) && !(id === 'accessories' && n === 3))) {
      expect(doc$.has(n), `Doc prompt requests excluded §${n}`).toBe(false);
      expect(legacy$.has(n), `legacy prompt requests excluded §${n}`).toBe(false);
    }
  });
});

describe('Full description agrees with itself', () => {
  it('is not a simplified id, and a complete Full document passes the completeness gate', () => {
    expect(isSimplifiedTemplateId(undefined)).toBe(false);
    expect(validateTemplateCompleteness(v4ValidDoc(), undefined, { includeFunctionality: false, hasSpecs: true })).toEqual([]);
  });
});
