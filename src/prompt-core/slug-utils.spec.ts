import { describe, it, expect } from 'vitest';
import { normalizeSlug, ensureUniqueSlugs, SLUG_PATTERN } from './slug-utils';

describe('normalizeSlug', () => {
  it('transliterates Ukrainian Cyrillic to latin', () => {
    expect(normalizeSlug('Станція хімічного згладжування')).toBe('stantsiya-khimichnoho-zhladzhuvannya');
  });

  it('strips Spanish diacritics', () => {
    expect(normalizeSlug('Máquina de impresión')).toBe('maquina-de-impresion');
  });

  it('strips Polish diacritics', () => {
    expect(normalizeSlug('Wygładzania parą')).toBe('wygladzania-para');
  });

  it('lowercases mixed-case input', () => {
    expect(normalizeSlug('Bambu Lab X1 Carbon')).toBe('bambu-lab-x1-carbon');
  });

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(normalizeSlug('  --3D Printer!!  ')).toBe('3d-printer');
  });

  it('always produces output matching SLUG_PATTERN', () => {
    const result = normalizeSlug('Étape  de  finissage—vapeur (V2)');
    expect(result).toMatch(SLUG_PATTERN);
  });
});

describe('ensureUniqueSlugs', () => {
  it('returns slugs unchanged when already unique', () => {
    const items = [
      { language: 'en-GB', slug: 'vapour-smoothing-machine' },
      { language: 'uk-UA', slug: 'stantsiya-zglazhuvannya' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'vapour-smoothing-machine',
      'stantsiya-zglazhuvannya',
    ]);
  });

  it('appends a language descriptor on collision', () => {
    const items = [
      { language: 'en-GB', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'smoothing-machine',
      'smoothing-machine-us',
    ]);
  });

  it('appends a numeric suffix when the descriptor still collides', () => {
    const items = [
      { language: 'en-US', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'smoothing-machine',
      'smoothing-machine-us',
      'smoothing-machine-2',
    ]);
  });
});
