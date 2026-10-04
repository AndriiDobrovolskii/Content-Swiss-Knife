/**
 * description-doc.hook-cta-extra.spec.ts — US-5.1 T1: the two additive optional carriers
 * `hookExtra` and `cta.extra`, `forEachBlockInOrder`'s order across them, and `hookText` /
 * `ctaText`.
 *
 * Written BEFORE the model change, from Spec FR-6 (a figure next to hook/CTA text, OD-15),
 * FR-13 (document order drives first-eager / rest-lazy) and NFR-8 (cached documents of earlier
 * versions parse unchanged). Backward-compatibility of cached '3.0' / '4.0' documents and the two
 * corpus triples is guarded by the EXISTING specs `description-doc.schema*.spec.ts`,
 * `test/render-conformance*.spec.ts` and `test/render-reconciliation.spec.ts`, which must stay green.
 *
 * CONTRACT PINNED HERE: `hookExtra?: ApplicationsBlock[]` on the document, `cta.extra?:
 * ApplicationsBlock[]`; `hookText(doc)` / `ctaText(doc)` exported from `./description-doc`.
 * `hookText` is the hook plus the paragraph text of `hookExtra`, in order; figures contribute no
 * text. The exact separator between them is not pinned.
 */
import { describe, it, expect } from 'vitest';
import { forEachBlockInOrder, hookText, ctaText } from './description-doc';
import type { Block, ProductDescriptionDoc } from './description-doc';
import { ProductDescriptionDocSchema } from './description-doc.schema';
import { v3BaseDoc, v4ValidDoc } from '../../test/fixtures/v4-docs';

const FIG = (file: string) => ({ file, alt: `alt ${file}`, caption: `<b>Мітка:</b> caption ${file}` });
const describeBlock = (b: Block): string =>
  b.kind === 'paragraph' ? `p:${b.text}` : b.kind === 'figure' ? `fig:${b.ref}` : b.kind === 'bullets' ? 'bullets' : `video:${b.ref}`;
const order = (doc: ProductDescriptionDoc): string[] => {
  const out: string[] = [];
  forEachBlockInOrder(doc, b => out.push(describeBlock(b)));
  return out;
};

function withHookFigure(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  return {
    ...doc,
    hookExtra: [{ kind: 'figure', ref: 0 }, { kind: 'paragraph', text: 'After the hook figure.' }],
    figures: [FIG('hook.jpg')],
  };
}
function withCtaFigure(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  return {
    ...doc,
    cta: { ...doc.cta, extra: [{ kind: 'figure', ref: 0 }, { kind: 'paragraph', text: 'After the CTA figure.' }] },
    figures: [FIG('cta.jpg')],
  };
}

describe('schema accepts the new carriers (FR-6, OD-15)', () => {
  it.each([
    ['3.0', () => v3BaseDoc()],
    ['4.0', () => v4ValidDoc()],
  ])('keeps hookExtra on a %s document', (_v, make) => {
    const parsed = ProductDescriptionDocSchema.safeParse(withHookFigure(make()));
    expect(parsed.success).toBe(true);
    expect((parsed as { data: ProductDescriptionDoc }).data.hookExtra).toEqual([
      { kind: 'figure', ref: 0 },
      { kind: 'paragraph', text: 'After the hook figure.' },
    ]);
  });

  it.each([
    ['3.0', () => v3BaseDoc()],
    ['4.0', () => v4ValidDoc()],
  ])('keeps cta.extra on a %s document', (_v, make) => {
    const parsed = ProductDescriptionDocSchema.safeParse(withCtaFigure(make()));
    expect(parsed.success).toBe(true);
    expect((parsed as { data: ProductDescriptionDoc }).data.cta.extra).toEqual([
      { kind: 'figure', ref: 0 },
      { kind: 'paragraph', text: 'After the CTA figure.' },
    ]);
  });

  it('counts a figure referenced only from hookExtra or cta.extra as referenced (no unreferenced-figure error)', () => {
    expect(ProductDescriptionDocSchema.safeParse(withHookFigure(v3BaseDoc())).success).toBe(true);
    expect(ProductDescriptionDocSchema.safeParse(withCtaFigure(v3BaseDoc())).success).toBe(true);
  });

  it('rejects a dangling figure ref inside hookExtra', () => {
    const doc = { ...v3BaseDoc(), hookExtra: [{ kind: 'figure' as const, ref: 0 }], figures: [] };
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a dangling figure ref inside cta.extra', () => {
    const base = v3BaseDoc();
    const doc = { ...base, cta: { ...base.cta, extra: [{ kind: 'figure' as const, ref: 0 }] }, figures: [] };
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects one figure referenced twice across hookExtra and the body', () => {
    const doc = withHookFigure(v3BaseDoc());
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects one figure referenced twice across the body and cta.extra', () => {
    const doc = withCtaFigure(v3BaseDoc());
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a bullets block inside hookExtra (only paragraph and figure are admitted)', () => {
    const doc = {
      ...v3BaseDoc(),
      hookExtra: [{ kind: 'bullets', items: [{ lead: 'A:', text: ' b.' }] }],
    };
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });
});

describe('forEachBlockInOrder visits hookExtra first and cta.extra last (FR-13)', () => {
  it('orders hook extras, then keyBenefits, functionality, applications, then CTA extras', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'paragraph', text: 'hook-extra' }, { kind: 'figure', ref: 0 }];
    doc.cta = { ...doc.cta, extra: [{ kind: 'paragraph', text: 'cta-extra' }, { kind: 'figure', ref: 1 }] };
    doc.figures = [FIG('h.jpg'), FIG('c.jpg')];
    doc.applications = { ...doc.applications!, blocks: [{ kind: 'paragraph', text: 'app-block' }] };

    const seen = order(doc);
    expect(seen[0]).toBe('p:hook-extra');
    expect(seen[1]).toBe('fig:0');
    expect(seen[seen.length - 2]).toBe('p:cta-extra');
    expect(seen[seen.length - 1]).toBe('fig:1');
    expect(seen.indexOf('bullets')).toBeGreaterThan(1);
    expect(seen.indexOf('p:app-block')).toBeGreaterThan(seen.indexOf('bullets'));
    expect(seen.indexOf('p:app-block')).toBeLessThan(seen.length - 2);
  });

  it('visits nothing extra for a document without the new carriers', () => {
    expect(order(v3BaseDoc())).toEqual(['bullets', 'p:Діодний модуль фокусує промінь у пляму 0,08 мм.']);
  });
});

describe('hookText / ctaText', () => {
  it('equal the carrier text alone when there are no extras', () => {
    const doc = v3BaseDoc();
    expect(hookText(doc)).toBe(doc.hook);
    expect(ctaText(doc)).toBe(doc.cta.text);
  });

  it('hookText returns the hook followed by the paragraph text of hookExtra, and no figure data', () => {
    const doc = withHookFigure(v3BaseDoc());
    const text = hookText(doc);
    expect(text).toContain(doc.hook);
    expect(text).toContain('After the hook figure.');
    expect(text.indexOf(doc.hook)).toBeLessThan(text.indexOf('After the hook figure.'));
    expect(text).not.toContain('hook.jpg');
  });

  it('ctaText returns the CTA text followed by the paragraph text of cta.extra, and no figure data', () => {
    const doc = withCtaFigure(v3BaseDoc());
    const text = ctaText(doc);
    expect(text).toContain(doc.cta.text);
    expect(text).toContain('After the CTA figure.');
    expect(text.indexOf(doc.cta.text)).toBeLessThan(text.indexOf('After the CTA figure.'));
    expect(text).not.toContain('cta.jpg');
  });

  it('concatenates several extra paragraphs in order', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'paragraph', text: 'second' }, { kind: 'paragraph', text: 'third' }];
    const text = hookText(doc);
    expect(text.indexOf(doc.hook)).toBeLessThan(text.indexOf('second'));
    expect(text.indexOf('second')).toBeLessThan(text.indexOf('third'));
  });
});
