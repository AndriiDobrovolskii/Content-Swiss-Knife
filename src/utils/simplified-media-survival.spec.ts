/**
 * US-2.2 T15 — FR-22 / FR-23: images and video embeds survive in the simplified templates, including
 * Spare parts (only §1, §5, §8), where there is no §2/§3/§4 for media to live in.
 *
 * AGENTS.md §4, quoted by the spec: every image is a `<figure>` with a `<figcaption>` preceded by a
 * `<p>` lead-in; the first image has no `loading="lazy"`, every later one has it, `decoding="async"`
 * on all; no `<figure>` inside a `<p>`; "a video embed present in the input is present in the output".
 * The placement is a prompt-and-schema matter (media only inside paragraphs that ARE present); what is
 * testable deterministically is that the renderer and the coverage validators carry media wherever the
 * document puts it.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription } from '../render/render-description';
import { validateImageManifestCoverageDoc } from './image-manifest-coverage';
import { validateVideoCoverageDoc, videoKey } from './video-manifest';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import { conformanceSimplifiedDoc, lazy } from '../../test/fixtures/simplified-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', brandFolder: 'esun', modelFolder: 'pla-plus', storeName: 'EXPERT3D' };
const VIDEO_SRC = 'https://www.youtube.com/embed/abc123';
const dom = (h: string) => new DOMParser().parseFromString(h, 'text/html');

function renderOf(doc: ProductDescriptionDoc): string {
  return renderDescription(doc, CTX, { flatSpecs: true });
}

/** Filaments with TWO figures: one in §4 (lead-in + figure) and one in §5, plus the §5 video. */
function filamentsWithTwoFigures(): ProductDescriptionDoc {
  const d = conformanceSimplifiedDoc('filaments-resins-powders', 'uk-UA', { media: true }) as unknown as Record<string, any>;
  d.figures = [
    { file: 'spool.jpg', alt: 'Grey spool of filament', caption: '<b>Spool. </b>Grey filament on a reel.' },
    { file: 'print.jpg', alt: 'Printed test cube', caption: '<b>Print. </b>A calibration cube.' },
  ];
  d.applications = {
    ...d.applications,
    blocks: [{ kind: 'paragraph', text: 'The photo below shows a printed test part.' }, { kind: 'figure', ref: 1 }],
  };
  // §5 keeps the spool figure (ref 0) and the video.
  return d as unknown as ProductDescriptionDoc;
}

describe.each([
  ['Spare parts (only §1, §5, §8)', () => conformanceSimplifiedDoc('spare-parts', 'uk-UA', { media: true })],
  ['Accessories', () => conformanceSimplifiedDoc('accessories', 'uk-UA', { media: true })],
  ['Filaments/resins/powders', () => conformanceSimplifiedDoc('filaments-resins-powders', 'uk-UA', { media: true })],
])('FR-22 / FR-23 — %s', (_name, make) => {
  const docL = lazy(() => make());
  const dL = lazy(() => dom(renderOf(docL())));

  it('the document with media validates', () => {
    const r = ProductDescriptionDocSchema.safeParse(docL());
    expect(r.success, JSON.stringify(r.success ? [] : r.error.issues)).toBe(true);
  });

  it('the image is a <figure> with a <figcaption>, and is not wrapped in a <p>', () => {
    const d = dL();
    const figures = [...d.querySelectorAll('figure')].filter(f => f.querySelector('img'));
    expect(figures).toHaveLength(1);
    expect(figures[0].querySelector('figcaption')?.textContent?.trim().length).toBeGreaterThan(0);
    expect(d.querySelectorAll('p figure')).toHaveLength(0);
  });

  it('the (first) image has no loading="lazy" and every image carries decoding="async"', () => {
    const d = dL();
    const img = d.querySelector('figure img')!;
    expect(img.getAttribute('loading')).toBeNull();
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('src')).toBe('https://impresora-3d.es/image/catalog/products/esun/pla-plus/spool.jpg');
  });

  it('no orphan image: the <figure> is immediately preceded by a <p> lead-in that does not repeat the figcaption or alt', () => {
    const d = dL();
    const fig = [...d.querySelectorAll('figure')].find(f => f.querySelector('img'))!;
    const lead = fig.previousElementSibling!;
    expect(lead.tagName).toBe('P');
    const caption = fig.querySelector('figcaption')!.textContent!.trim();
    expect(lead.textContent!.trim()).not.toBe(caption);
    expect(fig.querySelector('img')!.getAttribute('alt')).not.toBe(caption);
  });

  it('the source video embed is present in the output with its verbatim src, inside a captioned figure', () => {
    const d = dL();
    const iframe = d.querySelector('iframe')!;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toContain('abc123');
    expect(iframe.closest('figure')?.querySelector('figcaption')).not.toBeNull();
    expect(d.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('the coverage validators accept the document and reject one that lost the media', () => {
    const manifest = [{ urlFilename: 'spool.jpg' }];
    const embeds = [{ src: VIDEO_SRC, key: videoKey(VIDEO_SRC) }];
    const dd = docL() as unknown as { figures: Array<{ file: string }>; videos: never[] };
    expect(validateImageManifestCoverageDoc(dd.figures, manifest, 'Doc')).toEqual([]);
    expect(validateVideoCoverageDoc(dd.videos, embeds, 'Doc')).toEqual([]);
    expect(validateImageManifestCoverageDoc([], manifest, 'Doc').length).toBeGreaterThan(0);
    expect(validateVideoCoverageDoc([], embeds, 'Doc').map(i => i.rule)).toEqual(['video-embed-missing']);
  });
});

describe('FR-22 — first eager, rest lazy across the sections a simplified document has', () => {
  const htmlL = lazy(() => renderOf(filamentsWithTwoFigures()));
  const imgsL = () => [...dom(htmlL()).querySelectorAll('figure img')];

  it('renders both figures', () => {
    expect(imgsL()).toHaveLength(2);
  });
  it('the first in DOCUMENT order (§4) is eager; the second (§5) is lazy; both decode async', () => {
    const imgs = imgsL();
    expect(imgs[0].getAttribute('src')).toContain('print.jpg');
    expect(imgs[0].getAttribute('loading')).toBeNull();
    expect(imgs[1].getAttribute('src')).toContain('spool.jpg');
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    for (const i of imgs) expect(i.getAttribute('decoding')).toBe('async');
  });
  it('§4 figure is preceded by its lead-in paragraph', () => {
    expect(imgsL()[0].closest('figure')!.previousElementSibling?.tagName).toBe('P');
  });
});
