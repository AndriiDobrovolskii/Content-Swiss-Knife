import { describe, it, expect } from 'vitest';
import { normalizeSeoNumbers } from './seo-number-format';
import { validateSeoMetadata } from './output-validator';
import type { SeoResponse } from '../app/types';

const NBSP = String.fromCharCode(0xa0);

function seo(entry: Partial<SeoResponse['seo_data'][number]>): SeoResponse {
  return {
    site_name: 'EXPERT3D',
    seo_data: [{ language: 'en-ES', h1: 'H1', meta_title: 'T', meta_description: 'D', ...entry }],
  };
}

describe('normalizeSeoNumbers', () => {
  it('inserts the unit space in meta_description (the real en-ES shape from the XGRIDS run)', () => {
    const out = normalizeSeoNumbers(seo({
      meta_description: 'Scan with the L2 Pro: 3cm RMSE accuracy, 1mm resolution, 0.5-120m range. Order now ➔',
    }));
    expect(out.seo_data[0].meta_description).toBe(
      `Scan with the L2 Pro: 3${NBSP}cm RMSE accuracy, 1${NBSP}mm resolution, 0.5-120${NBSP}m range. Order now ➔`,
    );
  });

  it('leaves meta_title and h1 byte-identical, even when they carry numbers', () => {
    // This is the wiring test. The formatter is already covered by number-format-fixer.spec.ts;
    // what can regress here is WHICH field it is pointed at. meta_title has a 55-char budget the
    // model already targets (PR #53), and h1 must match the product name verbatim — neither may
    // gain characters after generation.
    const title = 'XGRIDS L2 Pro 16/120 LiDAR Scanner 3cm';
    const out = normalizeSeoNumbers(seo({ h1: title, meta_title: title }));
    expect(out.seo_data[0].meta_title).toBe(title);
    expect(out.seo_data[0].h1).toBe(title);
  });

  it('preserves the CTA arrow and comma-decimals (es-ES shape)', () => {
    const out = normalizeSeoNumbers(seo({
      meta_description: 'Precisión RMSE de 3cm, alcance de 0,5-120m. Compra ahora ➔',
    }));
    const desc = out.seo_data[0].meta_description;
    expect(desc.endsWith('➔')).toBe(true);
    expect(desc).toContain('0,5');
  });

  it('is idempotent — the SEO path never ran this formatter before, so pin the property here', () => {
    const input = seo({ meta_description: 'Range 0.5-120m, weight 1.7kg. Buy ➔' });
    const once = normalizeSeoNumbers(input);
    expect(normalizeSeoNumbers(once)).toEqual(once);
  });

  it('leaves an already-correct description untouched (uk-UA shape)', () => {
    const desc = `точність RMSE 3${NBSP}см, дальність 0,5–120${NBSP}м. Замовте зараз ➔`;
    expect(normalizeSeoNumbers(seo({ meta_description: desc })).seo_data[0].meta_description).toBe(desc);
  });

  it('does not mutate its input', () => {
    const input = seo({ meta_description: '3cm range' });
    normalizeSeoNumbers(input);
    expect(input.seo_data[0].meta_description).toBe('3cm range');
  });

  it('formatting a description over the 155-char limit is CAUGHT, not shipped — the ordering contract', () => {
    // The point of running the formatter before validation. Built rather than typed out so the
    // length is exact and not a hand-count: 154 chars in, three unit spaces added, 157 out.
    const tail = ' 3cm 1mm 5kg ➔';
    const desc = 'x'.repeat(154 - [...tail].length) + tail;
    expect([...desc]).toHaveLength(154);

    const before = validateSeoMetadata(seo({ meta_description: desc }), '');
    expect(before.some(i => i.rule === 'meta-description-length')).toBe(false);

    const formatted = normalizeSeoNumbers(seo({ meta_description: desc }));
    expect([...formatted.seo_data[0].meta_description]).toHaveLength(157);

    const after = validateSeoMetadata(formatted, '');
    expect(after.some(i => i.rule === 'meta-description-length')).toBe(true);
  });

  it('does not truncate an over-budget description — trimming would destroy the trailing CTA', () => {
    const desc = 'y'.repeat(200) + ' 3cm ➔';
    const out = normalizeSeoNumbers(seo({ meta_description: desc })).seo_data[0].meta_description;
    expect(out.endsWith('➔')).toBe(true);
    expect([...out].length).toBeGreaterThan(155);
  });

  it('survives an empty seo_data and a missing meta_description', () => {
    expect(normalizeSeoNumbers({ site_name: 'EXPERT3D', seo_data: [] }).seo_data).toEqual([]);
    const partial = { site_name: 'EXPERT3D', seo_data: [{ language: 'en-ES' }] } as unknown as SeoResponse;
    expect(() => normalizeSeoNumbers(partial)).not.toThrow();
  });
});
