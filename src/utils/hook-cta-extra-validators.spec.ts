/**
 * hook-cta-extra-validators.spec.ts — US-5.1 T3: the validators that measure the hook and the CTA
 * measure the WHOLE carrier (text plus its extras) after a marker split.
 *
 * Written BEFORE the validator change, from Spec FR-6 and the plan's D1 (`hookText` / `ctaText`).
 * Without it a split hook is measured as only its first half, raises a word-range error the model
 * cannot repair, and burns the repair ladder on marker inputs (plan Risk 2).
 *
 * Each case has a control: the same carrier WITHOUT the extras is still reported, so the assertion
 * is proven sensitive to the thing under test.
 */
import { describe, it, expect } from 'vitest';
import { validateSimplifiedRangesDoc } from './simplified-word-ranges';
import { validateSentenceLengthDoc } from './sentence-length';
import { validateSecondPersonScopeDoc } from './tov-second-person';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { filamentsDoc, words } from '../../test/fixtures/simplified-docs';
import { v3BaseDoc } from '../../test/fixtures/v4-docs';

const ID = 'filaments-resins-powders';
const errs = <T extends { severity: string }>(is: T[]) => is.filter(i => i.severity === 'error');
const ranges = (d: ProductDescriptionDoc) => errs(validateSimplifiedRangesDoc(d, ID, 'uk-UA', 'Doc (uk-UA)'));
const FIG = { file: 'x.jpg', alt: 'alt', caption: '<b>Мітка:</b> caption' };

describe('simplified word ranges count the whole hook and CTA (hook 40-85, CTA 50-100)', () => {
  it('does not flag a hook whose words are split across hook and hookExtra', () => {
    const doc = filamentsDoc();
    doc.hook = words(30);
    doc.hookExtra = [{ kind: 'figure', ref: 0 }, { kind: 'paragraph', text: words(30) }];
    doc.figures = [FIG];
    expect(ranges(doc).filter(i => /^hook/.test(i.path ?? ''))).toEqual([]);
  });

  it('control: the same 30-word hook with no extras IS flagged as below the minimum', () => {
    const doc = filamentsDoc();
    doc.hook = words(30);
    expect(ranges(doc).filter(i => /^hook/.test(i.path ?? ''))).not.toEqual([]);
  });

  it('still flags a split hook whose combined words exceed the maximum', () => {
    const doc = filamentsDoc();
    doc.hook = words(60);
    doc.hookExtra = [{ kind: 'paragraph', text: words(60) }];
    expect(ranges(doc).filter(i => /^hook/.test(i.path ?? ''))).not.toEqual([]);
  });

  it('does not flag a CTA whose words are split across cta.text and cta.extra', () => {
    const doc = filamentsDoc();
    doc.cta = { ...doc.cta, text: words(30), extra: [{ kind: 'figure', ref: 0 }, { kind: 'paragraph', text: words(30) }] };
    doc.figures = [FIG];
    expect(ranges(doc).filter(i => /cta/i.test(i.path ?? ''))).toEqual([]);
  });

  it('control: the same 30-word CTA with no extras IS flagged as below the minimum', () => {
    const doc = filamentsDoc();
    doc.cta = { ...doc.cta, text: words(30) };
    expect(ranges(doc).filter(i => /cta/i.test(i.path ?? ''))).not.toEqual([]);
  });
});

describe('sentence length covers the extras — uk-UA ceiling', () => {
  const LONG = `${Array.from({ length: 45 }, () => 'слово').join(' ')}.`;
  const run = (d: ProductDescriptionDoc) => validateSentenceLengthDoc(d, 'uk-UA', 'Doc (uk-UA)');

  it('flags a too-long sentence that sits in hookExtra', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'paragraph', text: LONG }];
    expect(run(doc).some(i => i.rule === 'sentence-too-long')).toBe(true);
  });

  it('flags a too-long sentence that sits in cta.extra', () => {
    const doc = v3BaseDoc();
    doc.cta = { ...doc.cta, extra: [{ kind: 'paragraph', text: LONG }] };
    expect(run(doc).some(i => i.rule === 'sentence-too-long')).toBe(true);
  });

  it('control: short extras raise nothing', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'paragraph', text: 'Коротке речення.' }];
    doc.cta = { ...doc.cta, extra: [{ kind: 'paragraph', text: 'Ще одне коротке.' }] };
    expect(run(doc).filter(i => i.rule === 'sentence-too-long')).toEqual([]);
  });
});

describe('second-person scope — hook extras are in scope, CTA extras share the CTA exemption', () => {
  const run = (d: ProductDescriptionDoc) => validateSecondPersonScopeDoc(d, 'uk-UA', 'Center 3D Print');

  it('flags «ваше» in a hookExtra paragraph', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'paragraph', text: 'Це прискорить ваше виробництво.' }];
    expect(run(doc).some(i => i.rule === 'tov-second-person-outside-scope' && i.detail.includes('ваше'))).toBe(true);
  });

  it('does not flag «ваше» in a cta.extra paragraph (the CTA is exempt)', () => {
    const doc = v3BaseDoc();
    doc.cta = { ...doc.cta, extra: [{ kind: 'paragraph', text: 'Це прискорить ваше виробництво.' }] };
    expect(run(doc).filter(i => i.rule === 'tov-second-person-outside-scope')).toEqual([]);
  });
});
