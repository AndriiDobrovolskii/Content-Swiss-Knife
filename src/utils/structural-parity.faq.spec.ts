/**
 * structural-parity.faq.spec.ts — US-8.1 T4: `validateFaqStructuralParity` (AC-3, AC-19, FR-3).
 *
 * TABLE A SPEC, OWNED BY T4. `structural-parity.ts` does not export `validateFaqStructuralParity` yet:
 * `tsc` reports TS2305 in this file only, and every call below fails at runtime with
 * "validateFaqStructuralParity is not a function" (vitest does not check exports). The final block
 * pins the UNCHANGED description comparison and is green by design.
 *
 * Signature (task breakdown T4):
 *   validateFaqStructuralParity(master, translated, context): ValidationIssue[]
 *   same parameter order and issue shape (severity 'error', rule 'structural-parity-count', no `path`)
 *   as the existing `validateStructuralParity`.
 *
 * FR-3: a translated FAQ has the same number of <h3>, <p> and <li> as the uk-UA master, and (OD-3
 * default, approved) the same number of <ul>. Prose is never compared; nothing about <b> is compared.
 */
import { describe, it, expect } from 'vitest';
import { validateFaqStructuralParity, validateStructuralParity } from './structural-parity';

const CTX = 'FAQ (es-ES)';
// 2 questions (h3), 2 paragraphs (p), 1 list (ul) with 2 items (li).
const MASTER =
  '<h3>Чи потрібен підігрів столу?</h3><p><b>Так, рекомендовано.</b> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості — 0,4 мм:</p><ul><li><b>0,4 мм:</b> швидкість;</li><li><b>0,2 мм:</b> деталі.</li></ul>';
const TRANSLATED =
  '<h3>¿Hace falta cama caliente?</h3><p><b>Sí, se recomienda.</b> Caliente la cama a 60 °C.</p>'
  + '<h3>¿Qué boquilla elegir?</h3><p>Para velocidad, 0,4 mm:</p><ul><li><b>0,4 mm:</b> velocidad;</li><li><b>0,2 mm:</b> detalle.</li></ul>';

const parity = (translated: string) => validateFaqStructuralParity(MASTER, translated, CTX);
const mentions = (translated: string, tag: string) =>
  parity(translated).filter(i => i.detail.includes(tag));

describe('FR-3 / AC-3 / AC-19: the FAQ comparison accepts matching counts', () => {
  it('identical structure with different prose gives no issue', () => {
    expect(parity(TRANSLATED)).toEqual([]);
  });

  it('a master compared with itself gives no issue', () => {
    expect(validateFaqStructuralParity(MASTER, MASTER, CTX)).toEqual([]);
  });

  it('prose length and the number of <b> are not compared (OD-7: no <b> parity)', () => {
    const extraBold = TRANSLATED.replace('Caliente la cama', '<b>Caliente</b> la cama');
    const noBold = TRANSLATED.replace(/<\/?b>/g, '');
    expect(parity(extraBold)).toEqual([]);
    expect(parity(noBold)).toEqual([]);
  });

  it('an element that only starts with the letter p (<pre>) is not counted as a paragraph', () => {
    expect(parity(`${TRANSLATED}<pre>x</pre>`)).toEqual([]);
  });
});


describe('FR-3 / AC-19: the FAQ comparison rejects a dropped or an added element', () => {
  it.each([
    ['<h3>', TRANSLATED.replace(/<h3>¿Qué boquilla elegir\?<\/h3>/, '')],
    ['<p>', TRANSLATED.replace('<p>Para velocidad, 0,4 mm:</p>', '')],
    ['<ul>', TRANSLATED.replace('<ul>', '').replace('</ul>', '')],
    ['<li>', TRANSLATED.replace('<li><b>0,2 mm:</b> detalle.</li>', '')],
  ])('a dropped %s is reported with rule structural-parity-count', (tag, translated) => {
    const issues = mentions(translated, tag);
    expect(issues.length, `an issue naming ${tag}`).toBeGreaterThanOrEqual(1);
    for (const i of issues) {
      expect(i.rule).toBe('structural-parity-count');
      expect(i.severity).toBe('error');
      expect(i.context).toBe(CTX);
    }
  });

  it.each([
    ['<h3>', `${TRANSLATED}<h3>Extra question?</h3>`],
    ['<p>', `${TRANSLATED}<p>An invented closing paragraph.</p>`],
    ['<ul>', `${TRANSLATED}<ul><li>x</li></ul>`],
    ['<li>', TRANSLATED.replace('</ul>', '<li>third item</li></ul>')],
  ])('an added %s is reported with rule structural-parity-count', (tag, translated) => {
    expect(mentions(translated, tag).length, `an issue naming ${tag}`).toBeGreaterThanOrEqual(1);
    expect(parity(translated).every(i => i.rule === 'structural-parity-count')).toBe(true);
  });

  it('each issue states the actual and the expected count so the repair prompt can be specific', () => {
    const [issue] = mentions(TRANSLATED.replace('<p>Para velocidad, 0,4 mm:</p>', ''), '<p>');
    expect(issue.detail).toMatch(/\b1\b/);
    expect(issue.detail).toMatch(/\b2\b/);
  });

  it('an empty translation is a parity failure: counts 0 against the master counts, not a pass', () => {
    for (const empty of ['', '   \n\t']) {
      const issues = parity(empty);
      for (const tag of ['<h3>', '<p>', '<ul>', '<li>']) {
        expect(issues.some(i => i.detail.includes(tag)), `empty ${JSON.stringify(empty)} flags ${tag}`).toBe(true);
      }
    }
  });

  it('the issue carries no path, so the repair ladder is full regeneration', () => {
    for (const i of parity('')) expect(i.path).toBeUndefined();
  });

  it('is pure: the same inputs give the same issues', () => {
    expect(parity('')).toEqual(parity(''));
  });
});

describe('NFR-7: the DESCRIPTION comparison is unchanged (green by design)', () => {
  it('validateStructuralParity still ignores <p> and <ul> counts, which only the FAQ comparison adds', () => {
    // 2 <p> against 1 <p> and 1 <ul> against 0 <ul>: the description comparison never counted either.
    expect(validateStructuralParity(MASTER, '<h3>a</h3><p>x</p><h3>b</h3><li>x</li><li>y</li>', 'HTML (es-ES)')
      .some(i => /<p>|<ul>/.test(i.detail))).toBe(false);
  });

  it('validateStructuralParity still counts <h3> and <li>', () => {
    const issues = validateStructuralParity(MASTER, '<p>only a paragraph</p>', 'HTML (es-ES)');
    expect(issues.some(i => i.detail.includes('<h3>'))).toBe(true);
    expect(issues.some(i => i.detail.includes('<li>'))).toBe(true);
  });
});
