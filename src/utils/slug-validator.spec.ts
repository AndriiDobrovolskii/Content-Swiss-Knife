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
