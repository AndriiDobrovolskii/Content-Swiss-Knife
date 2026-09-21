/**
 * US-2.2 T15 — FR-19: a simplified master that omits §3, §6 and §9 (and, for Spare parts, everything
 * but §1/§5/§8) must travel through the translation-side utilities without any of them "restoring",
 * flagging or reshaping an omission, and a translation that ADDS a paragraph the master lacks must be
 * caught.
 *
 * Utilities pinned: structural-parity, spec-category-merge, legacy-specs-wrap, translation-integrity,
 * llm-output-integrity, image-manifest-coverage (plan D6). "Translation" here is a pure text swap over
 * the master's own HTML, which keeps the structure identical by construction: what is under test is
 * that the utilities agree with that, not that a model translates well.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription } from '../render/render-description';
import { validateStructuralParity, restoreMediaSrcs } from './structural-parity';
import { mergeSmallSpecCategories } from './spec-category-merge';
import { wrapLegacySpecTables } from './legacy-specs-wrap';
import { validateTranslationIntegrity } from './translation-integrity';
import { normalizeForIntegrityCheck, stripLeakedPreamble, scanForLeakedPreamble } from './llm-output-integrity';
import { validateImageManifestCoverageDoc } from './image-manifest-coverage';
import { conformanceSimplifiedDoc, lazy } from '../../test/fixtures/simplified-docs';

const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', brandFolder: 'esun', modelFolder: 'pla-plus', storeName: 'EXPERT3D' };
const TEMPLATES = ['filaments-resins-powders', 'accessories', 'spare-parts'] as const;

/** A "translation": text swapped, every tag, attribute and src untouched. */
const translate = (html: string) =>
  html.replace(/>([^<]+)</g, (_m, t: string) => `>${t.replace(/[Tt]he /g, 'Der ').replace(/spool/gi, 'Spule').replace(/Diameter/g, 'Durchmesser')}<`);

describe.each(TEMPLATES)('%s — master with omitted paragraphs vs its translation', template => {
  const docL = lazy(() => conformanceSimplifiedDoc(template, 'uk-UA', { media: true }));
  const masterL = lazy(() => renderDescription(docL(), CTX, { flatSpecs: true }));
  const translatedL = lazy(() => translate(masterL()));

  it('structural parity reports nothing (no §3, §6 or §9 is expected, none is missing)', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    expect(validateStructuralParity(master, translated, 'HTML (de-DE)')).toEqual([]);
  });

  it('the media restore is a no-op on a faithful translation (nothing restored, nothing changed)', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    const r = restoreMediaSrcs(translated, master);
    expect(r.restored).toBe(0);
    expect(r.html).toBe(translated);
  });

  it('a corrupted media src is still restored from the master (FR-23 survives translation)', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    const broken = translated.replace('pla-plus', 'pla–plus');
    const r = restoreMediaSrcs(broken, master);
    expect(r.restored).toBeGreaterThan(0);
    expect(r.html).toContain('esun/pla-plus/spool.jpg');
    expect(validateStructuralParity(master, r.html, 'HTML (de-DE)')).toEqual([]);
  });

  it('spec-category merge and legacy table wrapping leave the master untouched (no h3-less table is "fixed")', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    expect(mergeSmallSpecCategories(master)).toBe(master);
    expect(mergeSmallSpecCategories(translated, 3, 'de-de')).toBe(translated);
    expect(wrapLegacySpecTables(master)).toBe(master);
  });

  it('translation integrity sees a clean translation of the master', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    expect(validateTranslationIntegrity(translated, master)).toEqual([]);
  });

  it('the leaked-preamble utilities do not disturb a clean simplified master', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    expect(stripLeakedPreamble(master, true)).toBe(master);
    expect(scanForLeakedPreamble({ html: master })).toEqual([]);
    expect(normalizeForIntegrityCheck(master).length).toBeGreaterThan(0);
  });

  it('image coverage: the manifest is covered by the master doc', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    const figures = (doc as unknown as { figures: Array<{ file: string }> }).figures;
    expect(validateImageManifestCoverageDoc(figures, [{ urlFilename: 'spool.jpg' }], 'Doc')).toEqual([]);
  });

  it('FR-19 defect detector: a translation that ADDS a paragraph the master omits is an error', () => {
    const master = masterL(); const translated = translatedL(); const doc = docL();
    // A re-added §3 (a heading + paragraph) and a §9-style FAQ block.
    const withExtras = translated.replace(
      /(<h2>[^<]*<\/h2>\s*<p class="cta">)/,
      '<h2>Wie es funktioniert</h2>\n<p>Zusätzlicher Absatz.</p>\n$1',
    );
    expect(withExtras).not.toBe(translated);
    const issues = validateStructuralParity(master, withExtras, 'HTML (de-DE)');
    expect(issues.some(i => i.rule === 'structural-parity-count' && /<h2>/.test(i.detail))).toBe(true);
  });
});
