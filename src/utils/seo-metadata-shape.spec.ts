/**
 * seo-metadata-shape.spec.ts
 *
 * US-3.1 T9 (FR-8, FR-9; plan D6). `src/utils/seo-metadata-shape.ts` does not exist yet — this
 * whole file is RED on module resolution until so-builder creates it (OD-4's resolution: a new
 * sibling module beside the FROZEN `output-validator.ts`, never inside it).
 *
 * Contract asserted here, from Implementation Plan D6
 * (docs/plans/US-3.1-implementation-plan.md#4):
 *   validateSeoMetadataShape(seo: SeoResponse | null, context: string): ValidationIssue[]
 *
 * Two checks, per seo_data[i] entry, skipped silently when `h1` is absent
 * (product-name-consistency.ts:124's convention):
 *   - meta-title-h1-identical      (error) — meta_title === h1 byte-for-byte.
 *   - meta-title-template-shape    (error) — fires when (1) meta_title contains a ' | ' segment
 *     anywhere, (2) meta_title does not start with h1 verbatim (includes a mid-word truncation of
 *     the H1 core), or (3) meta_title is not strictly longer than h1 with a dash separator
 *     immediately after the h1 prefix.
 *
 * Both are addressed by `path: seo_data[i].meta_title` — the same addressing
 * `meta-title-length` already uses (AGENTS.md's repair-ladder path grammar).
 */
import { describe, it, expect } from 'vitest';
import { validateSeoMetadataShape } from './seo-metadata-shape';
import type { SeoResponse } from '../app/types';

const seoOf = (h1: string, meta_title: string, language = 'en-US'): SeoResponse => ({
  site_name: 'StoreName',
  seo_data: [{ language, h1, meta_title, meta_description: 'd ➔' }],
});

const shapeIssues = (seo: SeoResponse) =>
  validateSeoMetadataShape(seo, 'SEO meta').filter(i => i.rule === 'meta-title-template-shape');
const identityIssues = (seo: SeoResponse) =>
  validateSeoMetadataShape(seo, 'SEO meta').filter(i => i.rule === 'meta-title-h1-identical');

describe('validateSeoMetadataShape — meta-title-template-shape', () => {
  it('passes a title built to the approved template: "[H1] - [Localized Category] [Spec]"', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max - CoreXY 3D Printer 600mm/s');
    expect(shapeIssues(seo)).toEqual([]);
  });

  it('fails a meta_title carrying a "| {site_name}" suffix', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max - CoreXY 3D Printer | StoreName');
    const issues = shapeIssues(seo);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('seo_data[0].meta_title');
  });

  it('fails a meta_title that does not start with the h1 verbatim', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 - CoreXY 3D Printer 600mm/s');
    expect(shapeIssues(seo)).toHaveLength(1);
  });

  /** The exact regression this check exists to catch: es-ES dropping "Collector" mid-word. */
  it('fails a mid-word truncation of the H1 core', () => {
    const seo = seoOf(
      'Makera Cyclone Dust Collector',
      'Makera Cyclone Dust Collec - Colector de Polvo 6 L',
    );
    expect(shapeIssues(seo)).toHaveLength(1);
  });

  it('fails when meta_title has no dash separator after the h1 prefix (an appended, unseparated tail)', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max Genuine 3D Printer');
    expect(shapeIssues(seo)).toHaveLength(1);
  });

  it('fails when meta_title is not strictly longer than h1 (equal length, no template tail)', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max');
    expect(shapeIssues(seo)).toHaveLength(1);
  });

  /**
   * Anchored on h1, not on the QA sample's invariant/brand name — a category-first localized h1
   * (uk-UA) must drive the same prefix check as a brand-first one, proving condition 2 reads h1
   * itself rather than some other derived "product name".
   */
  it('is anchored on h1 for a category-first, locale-specific name (uk-UA)', () => {
    const passing = seoOf('Сопло Bambu Lab 0,4 мм', 'Сопло Bambu Lab 0,4 мм - Латунне сопло 5 шт', 'uk-UA');
    expect(shapeIssues(passing)).toEqual([]);

    const failing = seoOf('Сопло Bambu Lab 0,4 мм', 'Сопло Bambu Lab 0,4мм - Латунне сопло 5 шт', 'uk-UA');
    expect(shapeIssues(failing)).toHaveLength(1);
  });

  it('is silent when h1 is absent — the product-name-consistency.ts:124 convention', () => {
    const seo: SeoResponse = {
      site_name: 'StoreName',
      seo_data: [{ language: 'en-US', h1: '', meta_title: 'Anything | StoreName', meta_description: 'd ➔' }],
    };
    expect(validateSeoMetadataShape(seo, 'SEO meta')).toEqual([]);
  });

  it('addresses each entry of a multi-locale seo_data array by its own index', () => {
    const seo: SeoResponse = {
      site_name: 'StoreName',
      seo_data: [
        { language: 'en-US', h1: 'H', meta_title: 'H - Cat Spec', meta_description: 'd ➔' },
        { language: 'pl-PL', h1: 'H', meta_title: 'H | StoreName', meta_description: 'd ➔' },
      ],
    };
    const issues = shapeIssues(seo);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('seo_data[1].meta_title');
  });
});

describe('validateSeoMetadataShape — meta-title-h1-identical', () => {
  it('fails when meta_title is byte-identical to h1', () => {
    const seo = seoOf('Bambu Lab PETG Translucent Orange 1.75mm 1kg', 'Bambu Lab PETG Translucent Orange 1.75mm 1kg');
    const issues = identityIssues(seo);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('seo_data[0].meta_title');
  });

  it('is independent of FR-8 — a template-shaped title must still differ from h1', () => {
    // Even a title that otherwise satisfies the template shape must not equal h1 verbatim; a
    // byte-identical pair by definition also fails to add a genuine "- [Localized Category]"
    // tail, but the two rules are asserted here as two separate, independently-firing findings.
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max');
    expect(identityIssues(seo)).toHaveLength(1);
    expect(shapeIssues(seo)).toHaveLength(1);
  });

  it('does not fire when meta_title genuinely differs from h1', () => {
    const seo = seoOf('Creality K1 Max', 'Creality K1 Max - CoreXY 3D Printer');
    expect(identityIssues(seo)).toEqual([]);
  });

  it('is silent when h1 is absent', () => {
    const seo: SeoResponse = {
      site_name: 'StoreName',
      seo_data: [{ language: 'en-US', h1: '', meta_title: '', meta_description: 'd ➔' }],
    };
    expect(validateSeoMetadataShape(seo, 'SEO meta')).toEqual([]);
  });
});

describe('validateSeoMetadataShape — defensive input handling', () => {
  it('returns no issues for a null response (a separate rule already reports seo-empty)', () => {
    expect(validateSeoMetadataShape(null, 'SEO meta')).toEqual([]);
  });

  it('returns no issues for an empty seo_data array', () => {
    expect(validateSeoMetadataShape({ site_name: 'S', seo_data: [] }, 'SEO meta')).toEqual([]);
  });
});
