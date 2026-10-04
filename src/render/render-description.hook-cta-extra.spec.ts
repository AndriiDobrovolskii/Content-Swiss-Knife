/**
 * render-description.hook-cta-extra.spec.ts — US-5.1 T2: the renderer emits `hookExtra` right after
 * the hook paragraph and `cta.extra` right after the CTA paragraph, and `normalizeDocProse`
 * normalises their paragraph text.
 *
 * Written BEFORE the renderer change, from Spec FR-3, FR-13 (first image eager across hook, body and
 * CTA; later ones lazy; decoding async) and FR-14 (figure style, <b> label, no nesting). The two
 * corpus triples rendering byte-identically (NFR-8) stays guarded by the existing
 * `test/render-conformance*.spec.ts` and `test/render-reconciliation.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription } from './render-description';
import { normalizeDocProse } from './doc-prose-transforms';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { v3BaseDoc } from '../../test/fixtures/v4-docs';

const CTX = { imageBaseUrl: 'https://cdn.test/img/', brandFolder: 'acme', modelFolder: 'lamp', storeName: 'EXPERT3D' };
const FIG = (file: string) => ({ file, alt: `alt of ${file}`, caption: `<b>Мітка:</b> caption of ${file}` });
const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const FIGURE_STYLE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';

function docWithExtras(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.hookExtra = [{ kind: 'figure', ref: 1 }, { kind: 'paragraph', text: 'Paragraph after the hook figure.' }];
  doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
  doc.cta = { ...doc.cta, extra: [{ kind: 'figure', ref: 2 }, { kind: 'paragraph', text: 'Paragraph after the CTA figure.' }] };
  // Refs are deliberately NOT in document order: ref 1 is the first image on the page.
  doc.figures = [FIG('body.jpg'), FIG('hook.jpg'), FIG('cta.jpg')];
  return doc;
}

describe('hookExtra rendering — FR-3, FR-13', () => {
  it('renders the hook paragraph, then the extras in order, before the next section', () => {
    const html = renderDescription(docWithExtras(), CTX);
    const hookAt = html.indexOf('лазерний гравер із потужністю 20 Вт');
    const figureAt = html.indexOf('src="https://cdn.test/img/acme/lamp/hook.jpg"');
    const tailAt = html.indexOf('Paragraph after the hook figure.');
    const nextSectionAt = html.indexOf('Потужність лазера');
    expect(hookAt).toBeGreaterThan(-1);
    expect(figureAt).toBeGreaterThan(hookAt);
    expect(tailAt).toBeGreaterThan(figureAt);
    expect(nextSectionAt).toBeGreaterThan(tailAt);
  });

  it('wraps the hook figure in the styled <figure> with a <figcaption>, decoding async and no nesting in <p>', () => {
    const html = renderDescription(docWithExtras(), CTX);
    const figure = Array.from(dom(html).querySelectorAll('figure')).find(f => f.querySelector('img')!.getAttribute('src')!.endsWith('hook.jpg'))!;
    expect(figure.getAttribute('style')).toBe(FIGURE_STYLE);
    expect(figure.querySelector('figcaption')!.querySelector('b')!.textContent).toBe('Мітка:');
    expect(figure.querySelector('img')!.getAttribute('decoding')).toBe('async');
    expect(html).not.toMatch(/<p[^>]*>(?:(?!<\/p>)[\s\S])*<figure/);
  });
});

describe('cta.extra rendering — FR-3, FR-13', () => {
  it('renders the extras after the CTA paragraph, in order', () => {
    const html = renderDescription(docWithExtras(), CTX);
    const ctaAt = html.indexOf('<p class="cta">');
    const figureAt = html.indexOf('src="https://cdn.test/img/acme/lamp/cta.jpg"');
    const tailAt = html.indexOf('Paragraph after the CTA figure.');
    expect(ctaAt).toBeGreaterThan(-1);
    expect(figureAt).toBeGreaterThan(ctaAt);
    expect(tailAt).toBeGreaterThan(figureAt);
  });

  it('keeps the CTA paragraph itself carrying class="cta" and the extra paragraph outside it', () => {
    const d = dom(renderDescription(docWithExtras(), CTX));
    expect(d.body.textContent).toContain('Paragraph after the CTA figure.');
    const cta = d.querySelector('p.cta')!;
    expect(cta.textContent).not.toContain('Paragraph after the CTA figure.');
    expect(cta.querySelector('figure')).toBeNull();
  });
});

describe('first image eager, later images lazy across hook, body and CTA — FR-13', () => {
  it('keys the rule off document position, not off the ref number', () => {
    const imgs = Array.from(dom(renderDescription(docWithExtras(), CTX)).querySelectorAll('img'));
    expect(imgs.map(i => i.getAttribute('src')!.split('/').pop())).toEqual(['hook.jpg', 'body.jpg', 'cta.jpg']);
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    expect(imgs[2].getAttribute('loading')).toBe('lazy');
    imgs.forEach(i => expect(i.getAttribute('decoding')).toBe('async'));
  });

  it('makes a hook figure the eager one even when the body also has a figure', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'figure', ref: 0 }];
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 1 });
    doc.figures = [FIG('hook.jpg'), FIG('body.jpg')];
    const imgs = Array.from(dom(renderDescription(doc, CTX)).querySelectorAll('img'));
    expect(imgs[0].getAttribute('src')).toContain('hook.jpg');
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
  });
});

describe('a document without the new carriers renders as before — NFR-8', () => {
  it('emits no extra figure or paragraph', () => {
    const html = renderDescription(v3BaseDoc(), CTX);
    expect(html).not.toContain('<figure');
    expect(html).toContain('<p class="cta">');
  });
});

describe('normalizeDocProse reaches the new carriers — FR-3', () => {
  // The hook and its extras carry the SAME raw text, so whatever normalisation does to the hook
  // it must also do to the extras: a field the walk forgets would keep the raw form.
  const RAW = 'Потужність 1.5 W та ємність 2 kg.';

  it('normalises hookExtra paragraph text exactly as it normalises the hook', () => {
    const doc = v3BaseDoc();
    doc.hook = RAW;
    doc.hookExtra = [{ kind: 'paragraph', text: RAW }];
    const out = normalizeDocProse(doc, 'uk-UA');
    expect(out.hook).not.toBe(RAW);
    expect(out.hookExtra![0]).toEqual({ kind: 'paragraph', text: out.hook });
  });

  it('normalises cta.extra paragraph text exactly as it normalises the CTA text', () => {
    const doc = v3BaseDoc();
    doc.cta = { ...doc.cta, text: RAW, extra: [{ kind: 'paragraph', text: RAW }] };
    const out = normalizeDocProse(doc, 'uk-UA');
    expect(out.cta.text).not.toBe(RAW);
    expect(out.cta.extra![0]).toEqual({ kind: 'paragraph', text: out.cta.text });
  });

  it('keeps figure refs in the extras untouched', () => {
    const doc = v3BaseDoc();
    doc.hookExtra = [{ kind: 'figure', ref: 0 }];
    doc.figures = [FIG('hook.jpg')];
    const out = normalizeDocProse(doc, 'uk-UA');
    expect(out.hookExtra).toEqual([{ kind: 'figure', ref: 0 }]);
    expect(out.figures[0].file).toBe('hook.jpg');
  });

  it('does not add the carriers to a document that has none', () => {
    const out = normalizeDocProse(v3BaseDoc(), 'uk-UA');
    expect('hookExtra' in out).toBe(false);
    expect('extra' in out.cta).toBe(false);
  });
});
