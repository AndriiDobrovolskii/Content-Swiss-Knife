import { describe, it, expect } from 'vitest';
import { validateSlugs } from './slug-validator';
import type { SlugResponse } from '../app/types';

describe('validateSlugs', () => {
  it('flags slug-empty when there is no slug data', () => {
    const issues = validateSlugs(null);
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'slug-empty', severity: 'error' }),
    ]);
  });

  it('flags slug-empty when slugs array is empty', () => {
    const issues = validateSlugs({ site_name: 'Drukarka 3D', slugs: [] });
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'slug-empty', severity: 'error' }),
    ]);
  });

  it('flags slug-blank for an empty slug string', () => {
    const response: SlugResponse = {
      site_name: 'Drukarka 3D',
      slugs: [{ language: 'pl-PL', name: 'Drukarka 3D X1', slug: '' }],
    };
    const issues = validateSlugs(response);
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'slug-blank', context: 'Slug (pl-PL)' }),
    ]);
  });

  it('flags slug-charset for uppercase or non-latin characters', () => {
    const response: SlugResponse = {
      site_name: 'Drukarka 3D',
      slugs: [{ language: 'uk-UA', name: 'Drukarka 3D X1', slug: 'Принтер-X1' }],
    };
    const issues = validateSlugs(response);
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'slug-charset', context: 'Slug (uk-UA)' }),
    ]);
  });

  it('flags slug-duplicate when two languages share the same slug', () => {
    const response: SlugResponse = {
      site_name: 'Drukarka 3D',
      slugs: [
        { language: 'pl-PL', name: 'Drukarka 3D X1', slug: 'drukarka-3d-x1' },
        { language: 'uk-UA', name: 'Принтер X1', slug: 'drukarka-3d-x1' },
      ],
    };
    const issues = validateSlugs(response);
    expect(issues).toEqual([
      expect.objectContaining({ rule: 'slug-duplicate', context: 'Slug (uk-UA)' }),
    ]);
  });

  it('reports no issues for a clean response', () => {
    const response: SlugResponse = {
      site_name: 'Drukarka 3D',
      slugs: [
        { language: 'pl-PL', name: 'Drukarka 3D X1', slug: 'drukarka-3d-x1' },
        { language: 'uk-UA', name: 'Принтер X1', slug: 'printer-x1-uk' },
      ],
    };
    expect(validateSlugs(response)).toEqual([]);
  });
});

/**
 * slug-name-designator-lost — the "32/300" regression, caught where it starts.
 *
 * Task SLUG turned "XGRIDS L2 Pro 32/300 Standard Package" into "… 32 300" in all five
 * locales. That name is then authoritative downstream: it feeds Task B (h1, meta_title,
 * meta_description) and the Task C H1 LOCK, and the number normalizer collapses it further to
 * "32300". Nothing later in the pipeline can tell the original apart, so the check belongs here.
 */
describe('validateSlugs — model-designator fidelity', () => {
  const NAME = 'XGRIDS L2 Pro 32/300 Standard Package';
  const withNames = (...names: string[]): SlugResponse => ({
    site_name: 'Center 3D Print',
    slugs: names.map((name, i) => ({ language: `l${i}`, name, slug: `slug-${i}` })),
  });
  const designator = (r: SlugResponse, source = NAME) =>
    validateSlugs(r, source).filter(x => x.rule === 'slug-name-designator-lost');

  it('accepts localized names that keep the invariant core', () => {
    expect(designator(withNames(
      'XGRIDS L2 Pro 32/300 3D Scanner Standard Package',
      '3D сканер XGRIDS L2 Pro 32/300 Стандартний комплект',
      'Skaner 3D XGRIDS L2 Pro 32/300 Zestaw Standardowy',
    ))).toEqual([]);
  });

  it('flags the slash replaced by a space — the exact observed failure', () => {
    const issues = designator(withNames('XGRIDS L2 Pro 32 300 3D Scanner Standard Package'));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('slugs[0].name');
  });

  it('flags the slash deleted entirely', () => {
    expect(designator(withNames('XGRIDS L2 Pro 32300 3D Scanner')).length).toBeGreaterThan(0);
  });

  it('flags a bare NNN NNN group even when the core survives elsewhere', () => {
    const issues = designator(withNames('XGRIDS L2 Pro 32/300 з роздільністю 1 000 точок'));
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('NNN NNN');
  });

  it('reports one issue per offending locale, addressed by path', () => {
    const issues = designator(withNames(
      'XGRIDS L2 Pro 32/300 Scanner',
      'XGRIDS L2 Pro 32 300 Scanner',
      'XGRIDS L2 Pro 32 300 Skaner',
    ));
    expect(issues.map(i => i.path)).toEqual(['slugs[1].name', 'slugs[1].name', 'slugs[2].name', 'slugs[2].name']);
  });

  it('is inert without a source name, so the check cannot fire spuriously', () => {
    expect(designator(withNames('anything at all'), '')).toEqual([]);
  });
});
