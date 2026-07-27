/**
 * product-name-consistency.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  validateProductNameConsistency,
  validateProductNameH1SlugAgreement,
} from './product-name-consistency';
import type { SeoResponse, SlugResponse } from '../app/types';

const NAME = 'Лазерний гравер-різак Ortur H20 20 Вт';
const run = (html: string, name: string | undefined = NAME) =>
  validateProductNameConsistency(html, name, 'uk-UA', 'HTML (base)');

describe('validateProductNameConsistency', () => {
  /** The exact reported case. */
  it('flags a Latin unit in the body when the name uses a Cyrillic one', () => {
    const html = '<p>Ortur H20 20 W — лазерний гравер-різак у закритому корпусі.</p>';
    const issues = run(html);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('product-name-unit-script-drift');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toContain('20 W');
    expect(issues[0].detail).toContain('20 Вт');
  });

  it('flags the drift in a heading too', () => {
    expect(run('<h2>Як складається та живиться Ortur H20 20 W</h2>')).toHaveLength(1);
  });

  it('passes once the body matches the name', () => {
    expect(run('<p>Ortur H20 20 Вт — лазерний гравер-різак.</p>')).toEqual([]);
  });

  it('reports a drifted value once, not once per occurrence', () => {
    const html = '<p>Ortur H20 20 W.</p><h2>Що вміє Ortur H20 20 W</h2><p>Модуль 20 W.</p>';
    expect(run(html)).toHaveLength(1);
  });

  it('ignores a unit-looking fragment inside a URL', () => {
    const html = '<p>Ortur H20 20 Вт.</p><img src="https://cdn.example.com/ortur/20w/head.jpg" alt="головка">';
    expect(run(html)).toEqual([]);
  });

  describe('name absent from body', () => {
    it('flags a body that never mentions the brand or model', () => {
      const issues = run('<p>Цей верстат ріже акрил і дерево.</p>');
      expect(issues.some(i => i.rule === 'product-name-absent-from-body')).toBe(true);
    });

    it('passes when any brand/model token is present', () => {
      expect(run('<p>Ortur H20 20 Вт ріже акрил.</p>')).toEqual([]);
    });
  });

  describe('no-op guards', () => {
    it('returns nothing without a localized name', () => {
      // Called directly: passing undefined to `run` would trigger its default parameter.
      expect(validateProductNameConsistency('<p>Ortur H20 20 W.</p>', undefined, 'uk-UA', 'x')).toEqual([]);
      expect(run('<p>Ortur H20 20 W.</p>', '   ')).toEqual([]);
    });

    it('returns nothing for empty html', () => {
      expect(run('')).toEqual([]);
    });

    it('is inert for a name carrying no units', () => {
      expect(run('<p>Ortur Laser Master 3 у роботі.</p>', 'Лазерний гравер Ortur Laser Master 3')).toEqual([]);
    });
  });
});

describe('validateProductNameH1SlugAgreement', () => {
  const seo = (h1: string): SeoResponse => ({
    site_name: 'Center 3D Print',
    seo_data: [{ language: 'uk-UA', h1, meta_title: 't', meta_description: 'd' }],
  });
  const slugs = (name: string): SlugResponse => ({
    site_name: 'Center 3D Print',
    slugs: [{ language: 'uk-UA', name, slug: 'ortur-h20-20-vt' }],
  });

  it('flags an H1 that diverges from the slug name', () => {
    const issues = validateProductNameH1SlugAgreement(seo('Ortur H20 20 W'), slugs('Ortur H20 20 Вт'));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('product-name-h1-slug-mismatch');
    expect(issues[0].context).toBe('SEO (uk-UA)');
  });

  it('accepts a match differing only in whitespace or case', () => {
    expect(validateProductNameH1SlugAgreement(seo('Ortur H20 20 Вт'), slugs('ortur  h20 20 вт'))).toEqual([]);
  });

  it('accepts a non-breaking space against a regular one', () => {
    expect(validateProductNameH1SlugAgreement(seo('Ortur H20 20 Вт'), slugs('Ortur H20 20 Вт'))).toEqual([]);
  });

  it('is inert when either artifact is missing', () => {
    expect(validateProductNameH1SlugAgreement(null, slugs('x'))).toEqual([]);
    expect(validateProductNameH1SlugAgreement(seo('x'), null)).toEqual([]);
  });

  it('skips a locale that has no slug entry', () => {
    const other: SlugResponse = { site_name: 's', slugs: [{ language: 'pl-PL', name: 'X', slug: 'x' }] };
    expect(validateProductNameH1SlugAgreement(seo('Ortur H20 20 W'), other)).toEqual([]);
  });
});
