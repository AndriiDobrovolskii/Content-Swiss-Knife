import { describe, it, expect } from 'vitest';
import { validateSlugs } from './slug-validator';
import type { SlugResponse } from '../app/types';
import { REPAIR_STRATEGIES, resolveLadder, getAtPath, setAtPath } from './repair-strategy';

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

  /**
   * The EXPERT3D regression: a raw source name that is category-first even in English
   * ("3D printer Elegoo Centauri Carbon 2"). Task Slug correctly translated the category noun
   * per locale; the repair gate then reverted those correct translations back to English
   * because this check computed the invariant core as the whole untranslated name. Confirms the
   * fix in product-name-core.ts closes it at the validator level.
   */
  it('accepts a correct translation of a category-first source name', () => {
    const issues = designator(withNames(
      'Impresora 3D Elegoo Centauri Carbon 2',
      '3D-принтер Elegoo Centauri Carbon 2',
    ), '3D printer Elegoo Centauri Carbon 2');
    expect(issues).toEqual([]);
  });
});

/**
 * US-3.1 T11 (FR-11, AC-6, plan D8) — `slug-name-designator-lost` gets a targeted, actually-
 * reachable repair-ladder entry instead of always falling through to a full-document regeneration.
 * `slug-validator.ts`'s own check logic is unchanged by this Story — only its repairability.
 */
describe('validateSlugs — slug-name-designator-lost is repairable via the tiered ladder (T11)', () => {
  const SOURCE = 'XGRIDS L2 Pro 32/300 Standard Package';

  it('resolves through a field-scoped rung, not the implicit full-regen-only fallback', () => {
    const response: SlugResponse = {
      site_name: 'Center 3D Print',
      slugs: [{ language: 'pl-PL', name: 'XGRIDS L2 Pro 32 300 Skaner 3D Standardowy', slug: 'xgrids-l2-pro' }],
    };
    const [issue] = validateSlugs(response, SOURCE).filter(i => i.rule === 'slug-name-designator-lost');
    expect(issue).toBeDefined();
    expect(resolveLadder(issue)).toEqual(['field-scoped', 'full-regen']);
    expect(resolveLadder(issue)).not.toEqual(['full-regen']);
  });

  /** Applying the ladder's own path-addressing to the real artifact shape, end to end — a
   *  field-scoped rewrite of `slugs[i].name` alone repairs the finding without touching any other
   *  field, mirroring how `slug-charset`'s existing entry already behaves on this same artifact. */
  it('a field-scoped rewrite of only the addressed slugs[i].name field clears the finding', () => {
    const response: SlugResponse = {
      site_name: 'Center 3D Print',
      slugs: [{ language: 'pl-PL', name: 'XGRIDS L2 Pro 32 300 Skaner 3D Standardowy', slug: 'xgrids-l2-pro' }],
    };
    const [issue] = validateSlugs(response, SOURCE).filter(i => i.rule === 'slug-name-designator-lost');
    expect(issue.path).toBe('slugs[0].name');

    const strategy = REPAIR_STRATEGIES.get('slug-name-designator-lost');
    expect(strategy).toBeDefined();

    const current = getAtPath(response, issue.path!);
    expect(typeof current).toBe('string');
    const repaired = setAtPath(response, issue.path!, 'XGRIDS L2 Pro 32/300 Skaner 3D Standardowy');

    expect(validateSlugs(repaired, SOURCE).filter(i => i.rule === 'slug-name-designator-lost')).toEqual([]);
    // Only the addressed field changed — the slug itself is untouched.
    expect(repaired.slugs[0].slug).toBe(response.slugs[0].slug);
  });
});
