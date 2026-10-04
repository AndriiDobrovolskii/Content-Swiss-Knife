/**
 * image-figure-style.spec.ts - US-5.1 T8: the structural figure layout of FR-22 / FR-14 (H-8) on the
 * THREE production surfaces that emit an image figure, and agreement between them.
 *
 * Written BEFORE `./image-figure-style` exists, from Specification FR-14, FR-22, AC-9 (g), (l), (n),
 * (o) and plan D6.
 *
 * The expected layout is written out here as literals taken from the Specification
 * (`display: block; width: max-content; max-width: 100%; margin: 4px auto;`, figcaption
 * `text-align: left;`), NOT read back from the constants under test, so a surface that still says
 * `fit-content` fails for the right reason (a wrong value), not for a missing import. The cases that
 * name the shared constants import `./image-figure-style` lazily, so only they fail while the module
 * is absent.
 *
 * Surfaces (plan D6): (1) the structured-document renderer, (2) `wrapImageFigures` (the legacy path
 * and the editor copy step), (3) the TipTap `imageFigure` node default. A model-written raw figure on
 * the legacy path is deliberately not asserted (A-17). The two master-prompt example lines are covered
 * by `image-figure-style.prompt-examples.spec.ts`, which belongs to the FROZEN-file task.
 */
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { renderDescription } from '../render/render-description';
import { wrapImageFigures } from './image-figure';
import { cleanHtmlStructure } from './html-cleaner';
import { TIPTAP_EXTENSIONS } from '../app/components/html-editor/extensions';
import { v3BaseDoc, v3WithVideo } from '../../test/fixtures/v4-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';

/**
 * Local helpers on purpose: this file is committed by T8, and `test/fixtures/image-placeholder/` is committed whole by
 * T9 (task breakdown v8), so it may import only fixtures that are already tracked (`v4-docs`).
 */
const IMAGE_BASE = 'https://cdn.test/img/';
const FOLDERS = { brandFolder: 'acme', modelFolder: 'lamp' } as const;
const baseDoc = (): ProductDescriptionDoc => structuredClone(v3BaseDoc());
function docWithParagraphs(...texts: string[]): ProductDescriptionDoc {
  const doc = baseDoc();
  doc.functionality = [{ heading: 'Як працює лампа', blocks: texts.map(text => ({ kind: 'paragraph' as const, text })) }];
  return doc;
}
const modelFigure = (file: string): ProductDescriptionDoc['figures'][number] =>
  ({ file, alt: 'model alt text', caption: '<b>Photo:</b> MODEL-AUTHORED CAPTION' });

const FIGURE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';
const IMG = 'max-width: 100%; height: auto; display: block;';
const FIGCAPTION = 'text-align: left;';
const VIDEO_FIGURE = 'width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;';

const renderCtx = { imageBaseUrl: IMAGE_BASE, ...FOLDERS, storeName: 'EXPERT3D' };
/**
 * Lazy import through a variable specifier: a static one would stop the whole file from loading while the
 * module is absent, hiding the surface cases that fail for the right reason.
 */
const STYLE_MODULE = './image-figure-style';
const loadStyleModule = (): Promise<typeof import('./image-figure-style')> => import(/* @vite-ignore */ STYLE_MODULE);
const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

/** A document with a model-placed figure in a functionality paragraph block and one in applications. */
function docWithTwoFigures() {
  const doc = docWithParagraphs('Lead paragraph.');
  doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
  doc.applications!.blocks = [{ kind: 'paragraph', text: 'Applications lead.' }, { kind: 'figure', ref: 1 }];
  doc.figures = [modelFigure('desk-lamp.jpg'), modelFigure('kettle-side.jpg')];
  return doc;
}

describe('surface 1 - the structured-document renderer (FR-22, AC-9 g, l)', () => {
  const html = renderDescription(docWithTwoFigures(), renderCtx);
  const dom = parse(html);
  const figures = Array.from(dom.querySelectorAll('figure'));

  it('emits one figure per document figure', () => {
    expect(figures).toHaveLength(2);
  });

  it.each([0, 1])('figure %i has the max-content figure style, the img style and a left-aligned figcaption', i => {
    const figure = figures[i];
    expect(figure.getAttribute('style')).toBe(FIGURE);
    expect(figure.querySelector('img')!.getAttribute('style')).toBe(IMG);
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe(FIGCAPTION);
  });

  it('keeps the first image eager (no loading attribute), later ones lazy, all decoding="async"', () => {
    const imgs = Array.from(dom.querySelectorAll('img'));
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    imgs.forEach(img => expect(img.getAttribute('decoding')).toBe('async'));
  });

  it('produces no fit-content anywhere in a document with image figures', () => {
    expect(html).not.toContain('fit-content');
  });
});

describe('surface 2 - wrapImageFigures (legacy path, standard fallback, editor copy step)', () => {
  it('gives a bare <img> the max-content figure style, the img style and decoding="async"', () => {
    const out = parse(wrapImageFigures('<p>Lead-in.</p><img src="a.jpg" alt="A">'));
    const figure = out.querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe(FIGURE);
    expect(figure.querySelector('img')!.getAttribute('style')).toBe(IMG);
    expect(figure.querySelector('img')!.getAttribute('decoding')).toBe('async');
  });

  it('gives an existing figcaption text-align: left and keeps its inner HTML', () => {
    const out = parse(wrapImageFigures('<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption><b>Мітка:</b> Опис.</figcaption></figure>'));
    const caption = out.querySelector('figcaption')!;
    expect(caption.getAttribute('style')).toBe(FIGCAPTION);
    expect(caption.innerHTML).toBe('<b>Мітка:</b> Опис.');
  });

  it('restyles a figure that arrives with the former fit-content width (a model-emitted legacy figure follows as a side effect, U-13)', () => {
    const legacy = '<p>Lead-in.</p><figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">'
      + '<img src="a.jpg" alt="A"><figcaption style="text-align: left;">Caption</figcaption></figure>';
    const out = wrapImageFigures(legacy);
    expect(out).not.toContain('fit-content');
    expect(parse(out).querySelector('figure')!.getAttribute('style')).toBe(FIGURE);
  });

  it('is idempotent on already-wrapped figures', () => {
    const once = wrapImageFigures('<p>Lead-in.</p><img src="a.jpg" alt="A"><img src="b.jpg" alt="B">');
    expect(wrapImageFigures(once)).toBe(once);
  });

  it('keeps first-eager / rest-lazy', () => {
    const imgs = Array.from(parse(wrapImageFigures('<p>x</p><img src="a.jpg" alt="A"><img src="b.jpg" alt="B">')).querySelectorAll('img'));
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
  });
});

describe('surface 3 - the TipTap imageFigure node defaults (AC-9 n)', () => {
  const schema = getSchema(TIPTAP_EXTENSIONS);
  const attrDefault = (node: string, attr: string): unknown => schema.nodes[node].spec.attrs?.[attr]?.default;

  it('defaults a hand-inserted figure to the max-content figure style', () => {
    expect(attrDefault('imageFigure', 'style')).toBe(FIGURE);
  });

  it('defaults the image and the figcaption to the shared img style and left-aligned caption', () => {
    expect(attrDefault('figureImg', 'style')).toBe(IMG);
    expect(attrDefault('figcaption', 'style')).toBe(FIGCAPTION);
  });
});

describe('cleaning keeps the layout (AC-9 n)', () => {
  it('cleanHtmlStructure leaves the figure, img and figcaption styles of a max-content figure unchanged', () => {
    const html = `<p>Lead-in.</p><figure style="${FIGURE}"><img src="a.jpg" alt="A" decoding="async" style="${IMG}">`
      + `<figcaption style="${FIGCAPTION}"><b>Мітка:</b> Опис.</figcaption></figure>`;
    const dom = parse(cleanHtmlStructure(html));
    expect(dom.querySelector('figure')!.getAttribute('style')).toBe(FIGURE);
    expect(dom.querySelector('img')!.getAttribute('style')).toBe(IMG);
    expect(dom.querySelector('figcaption')!.getAttribute('style')).toBe(FIGCAPTION);
  });
});

describe('video figures are unchanged (FR-22 consequence 5, FR-15)', () => {
  it('a rendered video figure keeps its own style and never takes the image figure style', () => {
    const html = renderDescription(v3WithVideo(), renderCtx);
    const videoFigure = Array.from(parse(html).querySelectorAll('figure')).find(f => f.querySelector('iframe'))!;
    expect(videoFigure.getAttribute('style')).toBe(VIDEO_FIGURE);
    expect(videoFigure.getAttribute('style')).not.toContain('max-content');
  });

  it('wrapImageFigures does not restyle a video figure', () => {
    const video = `<figure style="${VIDEO_FIGURE}"><iframe src="https://youtube.invalid/embed/x" title="T"></iframe><figcaption>Cap</figcaption></figure>`;
    const out = parse(wrapImageFigures(`<p>x</p>${video}`));
    expect(out.querySelector('figure')!.getAttribute('style')).toBe(VIDEO_FIGURE);
  });
});

describe('agreement between the surfaces and the shared module (plan D6)', () => {
  it('exports the three constants with exactly the specified literals', async () => {
    const m = await loadStyleModule();
    expect(m.IMAGE_FIGURE_STYLE).toBe(FIGURE);
    expect(m.IMAGE_IMG_STYLE).toBe(IMG);
    expect(m.IMAGE_FIGCAPTION_STYLE).toBe(FIGCAPTION);
  });

  it('renderer, wrapImageFigures and the editor node all carry the one IMAGE_FIGURE_STYLE', async () => {
    const m = await loadStyleModule();
    const rendered = parse(renderDescription(docWithTwoFigures(), renderCtx)).querySelector('figure')!.getAttribute('style');
    const wrapped = parse(wrapImageFigures('<p>x</p><img src="a.jpg" alt="A">')).querySelector('figure')!.getAttribute('style');
    const node = getSchema(TIPTAP_EXTENSIONS).nodes['imageFigure'].spec.attrs?.['style']?.default;
    expect(rendered).toBe(m.IMAGE_FIGURE_STYLE);
    expect(wrapped).toBe(m.IMAGE_FIGURE_STYLE);
    expect(node).toBe(m.IMAGE_FIGURE_STYLE);
  });

  it('a document without any figure does not need the layout and emits none', () => {
    const html = renderDescription(baseDoc(), renderCtx);
    expect(html).not.toContain('max-content');
    expect(html).not.toContain('fit-content');
  });
});
