/**
 * image-placeholder-doc.spec.ts - US-5.1 T9: marker substitution on the structured document, reworked
 * for Specification v9.
 *
 * v9 changes (FR-4, FR-14, FR-21, FR-22, A-14, A-16): the figure's label, description and alt are the three
 * native-Ukrainian Vision texts of the manifest entry, with Ukrainian fallbacks; the rendered figure is
 * `max-content`; the step also reports the two FR-21 caption warnings. The marker algorithm (hosting,
 * same-section lead-in per OQ-4, split, duplicate removal, idempotence, OQ-3 mangled markers, OQ-5
 * end-append) is unchanged and is re-verified here.
 *
 * CONTRACT PINNED HERE (plan D4; shapes chosen by TEST_WRITING, see the test strategy):
 *   applyImagePlaceholdersDoc(doc, manifest, opts?) -> { doc, report }   (opts = { cyrillicCheck? }, A-15, default on)
 *   report = { seen: Set<string>, unmatched: string[], notPlaced: string[], warnings: ValidationIssue-like[] }
 *     · `seen`       marker file names found by the exact grammar in visible text carriers
 *     · `unmatched`  distinct marker files that matched no usable upload (FR-9), once each
 *     · `notPlaced`  distinct marker files whose matched image could not be placed at the marker (FR-6)
 *     · `warnings`   items carrying `rule`, `severity: 'warning'` and a `detail` naming the file
 *
 * Section model (OQ-4): a section is one top-level group — {hook + hookExtra}, keyBenefits, each
 * top-level functionality subsection with its nested subsections, applications blocks, compatibility,
 * {CTA text + cta.extra}.
 */
import { describe, it, expect } from 'vitest';
import { applyImagePlaceholdersDoc } from './image-placeholder-doc';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import { renderDescription } from '../render/render-description';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { v3WithCompatibilityAndPackageContents, v3WithVideo } from '../../test/fixtures/v4-docs';
import {
  IMAGE_BASE, FOLDERS, LAMP, KETTLE, MARKER, LAMP_ALT, LAMP_VISION, LAMP_LABEL_UK, LAMP_DESC_UK, LAMP_ALT_UK, FALLBACK_LABEL,
  MODEL_CAPTION, baseDoc, docWithParagraphs, blocksInOrder, figureFilesInOrder, collapse, stripTags, modelFigure, entry,
  legacyEntry, hasCyrillic,
} from '../../test/fixtures/image-placeholder/fixtures';

const run = (doc: ProductDescriptionDoc, manifest = [LAMP]) => applyImagePlaceholdersDoc(doc, manifest);
const valid = (doc: ProductDescriptionDoc): boolean => ProductDescriptionDocSchema.safeParse(doc).success;
const wholeText = (doc: ProductDescriptionDoc): string => JSON.stringify(doc);
const kinds = (blocks: { kind: string }[]): string[] => blocks.map(b => b.kind);
const renderCtx = { imageBaseUrl: IMAGE_BASE, ...FOLDERS, storeName: 'EXPERT3D' };
const paragraphs = (blocks: { kind: string; text?: string }[]): string[] =>
  blocks.filter(b => b.kind === 'paragraph').map(b => collapse(b.text ?? ''));

describe('hosting positions — FR-3 (AC-2), FR-4, FR-6', () => {
  it('splits a functionality paragraph at the marker: lead-in, figure, continuation, marker text gone', () => {
    const doc = docWithParagraphs(`Before text ${MARKER} after text.`);
    const { doc: out, report } = run(doc);

    const blocks = out.functionality![0].blocks;
    expect(kinds(blocks)).toEqual(['paragraph', 'figure', 'paragraph']);
    expect(collapse((blocks[0] as { text: string }).text)).toBe('Before text');
    expect(collapse((blocks[2] as { text: string }).text)).toBe('after text.');
    expect(out.figures.map(f => f.file)).toEqual(['desk-lamp.jpg']);
    expect(wholeText(out)).not.toContain(MARKER);
    expect(report.unmatched).toEqual([]);
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('gives the figure the Ukrainian alt, caption and file from the manifest entry (FR-4, FR-21, A-16)', () => {
    const { doc: out } = run(docWithParagraphs(`Before ${MARKER} after.`));
    expect(out.figures[0].alt).toBe(LAMP_ALT_UK);
    expect(out.figures[0].caption).toBe(`<b>${LAMP_LABEL_UK}</b> ${LAMP_DESC_UK}`);
    expect(out.figures[0].file).toBe('desk-lamp.jpg');
  });

  it('never puts the legacy English altText or caption into a marker figure (A-16, NFR-11)', () => {
    const { doc: out } = run(docWithParagraphs(`Before ${MARKER} after.`));
    const text = JSON.stringify(out.figures);
    expect(text).not.toContain(LAMP_ALT);
    expect(text).not.toContain(LAMP_VISION);
    expect(text).not.toMatch(/Image:|Product image|\bView\b/);
  });

  it('keeps the figure alt non-empty and different from the whole figcaption text (FR-13)', () => {
    const { doc: out } = run(docWithParagraphs(`Before ${MARKER} after.`), [legacyEntry()]);
    expect(out.figures[0].alt.trim()).not.toBe('');
    expect(out.figures[0].alt).not.toBe(stripTags(out.figures[0].caption).trim());
    expect(stripTags(out.figures[0].caption).trim()).not.toBe('');
  });

  it('uses the preceding paragraph as lead-in when the marker starts its own paragraph', () => {
    const { doc: out, report } = run(docWithParagraphs('Lead-in sentence.', `${MARKER} Tail sentence.`));
    const blocks = out.functionality![0].blocks;
    expect(kinds(blocks)).toEqual(['paragraph', 'figure', 'paragraph']);
    expect(paragraphs(blocks)).toEqual(['Lead-in sentence.', 'Tail sentence.']);
    expect(report.notPlaced).toEqual([]);
  });

  it('emits no empty paragraph when the marker is the whole paragraph', () => {
    const { doc: out } = run(docWithParagraphs('Lead-in sentence.', MARKER));
    const blocks = out.functionality![0].blocks;
    expect(kinds(blocks)).toEqual(['paragraph', 'figure']);
    for (const b of blocks) if (b.kind === 'paragraph') expect(b.text.trim()).not.toBe('');
  });

  it('emits no empty paragraph when the marker ends the paragraph', () => {
    const { doc: out } = run(docWithParagraphs(`Lead-in sentence. ${MARKER}`));
    expect(kinds(out.functionality![0].blocks)).toEqual(['paragraph', 'figure']);
  });

  it('accepts a lead-in that is not adjacent: a bullet list may sit between lead-in and figure (H-5)', () => {
    const doc = docWithParagraphs('Lead-in sentence.');
    doc.functionality![0].blocks.push(
      {
        kind: 'bullets',
        items: [
          { lead: 'Перший:', text: ' текст.' },
          { lead: 'Другий:', text: ' текст.' },
          { lead: 'Третій:', text: ' текст.' },
        ],
      },
      { kind: 'paragraph', text: MARKER },
    );
    const { doc: out, report } = run(doc);
    expect(kinds(out.functionality![0].blocks)).toEqual(['paragraph', 'bullets', 'figure']);
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('places the figure in an applications paragraph block', () => {
    const doc = baseDoc();
    doc.applications!.blocks = [{ kind: 'paragraph', text: `Applications lead ${MARKER} and more.` }];
    const { doc: out, report } = run(doc);
    expect(kinds(out.applications!.blocks!)).toEqual(['paragraph', 'figure', 'paragraph']);
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('places the figure in a compatibility paragraph block', () => {
    const doc = v3WithCompatibilityAndPackageContents();
    doc.compatibility!.blocks.push({ kind: 'paragraph', text: `Compatible lead ${MARKER} and more.` });
    const { doc: out, report } = run(doc);
    expect(kinds(out.compatibility!.blocks)).toEqual(['bullets', 'paragraph', 'figure', 'paragraph']);
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('places the figure in a nested functionality subsection paragraph', () => {
    const doc = docWithParagraphs('Top paragraph.');
    doc.functionality![0].subsections = [
      { heading: 'Під-функція', blocks: [{ kind: 'paragraph', text: `Nested lead ${MARKER} nested tail.` }] },
    ];
    const { doc: out } = run(doc);
    expect(kinds(out.functionality![0].subsections![0].blocks)).toEqual(['paragraph', 'figure', 'paragraph']);
  });

  it('hosts a figure in the hook: text before stays in hook, the figure and the rest go to hookExtra (OD-15)', () => {
    const doc = baseDoc();
    doc.hook = `Hook sentence one. ${MARKER} Hook sentence two.`;
    const { doc: out, report } = run(doc);
    expect(collapse(out.hook)).toBe('Hook sentence one.');
    expect(kinds(out.hookExtra!)).toEqual(['figure', 'paragraph']);
    expect(collapse((out.hookExtra![1] as { text: string }).text)).toBe('Hook sentence two.');
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);

    // Rendered order is hook, figure, continuation, and nothing of the marker is left.
    const html = renderDescription(out, renderCtx);
    const hookAt = html.indexOf('Hook sentence one.');
    const figureAt = html.indexOf('<figure');
    const tailAt = html.indexOf('Hook sentence two.');
    expect(hookAt).toBeGreaterThan(-1);
    expect(figureAt).toBeGreaterThan(hookAt);
    expect(tailAt).toBeGreaterThan(figureAt);
    expect(html).not.toContain(MARKER);
  });

  it('hosts a figure in the CTA text: the figure and the rest go to cta.extra (OD-15)', () => {
    const doc = baseDoc();
    doc.cta.text = `Order today. ${MARKER} Thank you.`;
    const { doc: out, report } = run(doc);
    expect(collapse(out.cta.text)).toBe('Order today.');
    expect(kinds(out.cta.extra!)).toEqual(['figure', 'paragraph']);
    expect(collapse((out.cta.extra![1] as { text: string }).text)).toBe('Thank you.');
    expect(report.notPlaced).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('processes several markers in one paragraph in order of appearance (FR-6)', () => {
    const doc = docWithParagraphs(`Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.`);
    const { doc: out } = run(doc, [LAMP, KETTLE]);
    const blocks = out.functionality![0].blocks;
    expect(kinds(blocks)).toEqual(['paragraph', 'figure', 'paragraph', 'figure', 'paragraph']);
    expect(paragraphs(blocks)).toEqual(['Alpha', 'Beta', 'Gamma.']);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    expect(valid(out)).toBe(true);
  });

  it('closes and reopens an inline <b> so no half of a split paragraph is unbalanced', () => {
    const { doc: out } = run(docWithParagraphs(`<b>Bold start ${MARKER} bold end</b> plain tail.`));
    for (const b of out.functionality![0].blocks) {
      if (b.kind !== 'paragraph') continue;
      expect((b.text.match(/<b>/g) ?? []).length).toBe((b.text.match(/<\/b>/g) ?? []).length);
    }
    expect(valid(out)).toBe(true);
    expect(wholeText(out)).not.toContain(MARKER);
  });

  it('never loses a text fragment other than the marker', () => {
    const { doc: out } = run(docWithParagraphs(`Alpha beta ${MARKER} gamma delta.`));
    const text = collapse(paragraphs(out.functionality![0].blocks).join(' '));
    expect(text).toBe('Alpha beta gamma delta.');
  });
});

describe('lead-in rules — FR-6, plan-review binding note 1, OQ-4', () => {
  it('treats a marker with no lead-in inside its section as non-hosting (the lead-in may not cross a section boundary)', () => {
    const doc = baseDoc();
    doc.functionality = [
      { heading: 'Перша секція', blocks: [{ kind: 'paragraph', text: 'First section paragraph.' }] },
      { heading: 'Друга секція', blocks: [{ kind: 'paragraph', text: `${MARKER} Tail of the second section.` }] },
    ];
    const { doc: out, report } = run(doc);
    // Not placed at the marker: marker removed, the surrounding text kept, the warning raised.
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(kinds(out.functionality![1].blocks)).toEqual(['paragraph']);
    expect(collapse((out.functionality![1].blocks[0] as { text: string }).text)).toBe('Tail of the second section.');
    expect(wholeText(out)).not.toContain(MARKER);
    expect(valid(out)).toBe(true);
  });

  it('treats a marker with text before it in its own paragraph as hosting even when it is the first block of its section', () => {
    const doc = baseDoc();
    doc.functionality = [
      { heading: 'Перша секція', blocks: [{ kind: 'paragraph', text: 'First section paragraph.' }] },
      { heading: 'Друга секція', blocks: [{ kind: 'paragraph', text: `Own lead-in ${MARKER} tail.` }] },
    ];
    const { doc: out, report } = run(doc);
    expect(kinds(out.functionality![1].blocks)).toEqual(['paragraph', 'figure', 'paragraph']);
    expect(report.notPlaced).toEqual([]);
  });

  it('treats a marker at the very start of the document (hook, no text before) as non-hosting (FR-6)', () => {
    const doc = baseDoc();
    const original = doc.hook;
    doc.hook = `${MARKER} ${original}`;
    const { doc: out, report } = run(doc);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(collapse(out.hook)).toBe(collapse(original));
    expect(wholeText(out)).not.toContain(MARKER);
    expect(valid(out)).toBe(true);
  });

  it('demotes a marker whose lead-in text would equal the figcaption text (FR-6, FR-13)', () => {
    const lookalike = stripTags(`<b>${LAMP_LABEL_UK}</b> ${LAMP_DESC_UK}`);
    const { doc: out, report } = run(docWithParagraphs(lookalike, MARKER));
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    // The lead-in paragraph is untouched and no figure sits right after it.
    expect(collapse((out.functionality![0].blocks[0] as { text: string }).text)).toBe(lookalike);
    expect(wholeText(out)).not.toContain(MARKER);
  });

  it('always leaves a preceding paragraph before any figure it places', () => {
    const { doc: out } = run(docWithParagraphs('Lead.', `${MARKER} Tail.`));
    const blocks = blocksInOrder(out);
    blocks.forEach((b, i) => {
      if (b.kind !== 'figure') return;
      expect(blocks.slice(0, i).some(prev => prev.kind === 'paragraph')).toBe(true);
    });
  });
});

describe('non-hosting positions — FR-6, FR-5 (H-3)', () => {
  /** [label, mutate the document so the carrier holds the marker, read the carrier text back] */
  const CARRIERS: Array<[string, (d: ProductDescriptionDoc) => void, (d: ProductDescriptionDoc) => string]> = [
    ['key-benefits bullet text',
      d => { (d.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`; },
      d => (d.keyBenefits![0] as { items: { text: string }[] }).items[0].text],
    ['killer-spec text',
      d => { d.killerSpecs![0].why += ` ${MARKER}`; },
      d => d.killerSpecs![0].why],
    ['applications item text',
      d => { d.applications!.items[0].text += ` ${MARKER}`; },
      d => d.applications!.items[0].text],
    ['specification table cell',
      d => { d.specs!.categories[0].rows[0].value += ` ${MARKER}`; },
      d => d.specs!.categories[0].rows[0].value as string],
    ['package-contents item',
      d => { d.packageContents!.items[0] += ` ${MARKER}`; },
      d => d.packageContents!.items[0]],
    ['heading',
      d => { d.functionality![0].heading += ` ${MARKER}`; },
      d => d.functionality![0].heading],
    ['compatibility bullet text',
      d => { (d.compatibility!.blocks[0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`; },
      d => (d.compatibility!.blocks[0] as { items: { text: string }[] }).items[0].text],
  ];

  it.each(CARRIERS)('removes a marker in a %s, warns, and leaves the surrounding text unchanged', (_label, put, read) => {
    const doc = v3WithCompatibilityAndPackageContents();
    const before = collapse(read(doc));
    put(doc);
    const { doc: out, report } = run(doc);

    expect(collapse(read(out))).toBe(before);
    expect(wholeText(out)).not.toContain(MARKER);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(report.unmatched).toEqual([]);
    const warning = report.warnings.find(w => w.rule === 'image-placeholder-not-placed');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
    expect(warning!.detail).toContain('desk-lamp.jpg');
    expect(valid(out)).toBe(true);
  });

  it('falls back to the end of the document for the image when the marker is non-hosting and no figure exists (OQ-5)', () => {
    const doc = baseDoc();
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`;
    const { doc: out } = run(doc);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg']);
    const blocks = blocksInOrder(out);
    expect(blocks[blocks.length - 1].kind).toBe('figure');
    // The CTA text is the lead-in of the appended figure.
    expect(out.cta.extra!.map(b => b.kind)).toEqual(['figure']);
    expect(out.figures).toHaveLength(1);
    expect(valid(out)).toBe(true);
  });

  it('keeps a model-placed figure for the file when the marker is non-hosting: the image appears exactly once (H-3)', () => {
    const doc = docWithParagraphs('Lead.');
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    doc.figures = [modelFigure('desk-lamp.jpg')];
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`;

    const { doc: out, report } = run(doc);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg']);
    expect(out.figures).toHaveLength(1);
    expect(out.figures[0].caption).toContain(MODEL_CAPTION);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(wholeText(out)).not.toContain(MARKER);
    expect(valid(out)).toBe(true);
  });
});

describe('single rendering per marker and model-placed duplicates — FR-5, FR-11', () => {
  it('renders the first marker for a file and only removes the marker text of later ones (Story Q2)', () => {
    const doc = docWithParagraphs(`Alpha ${MARKER} Beta.`, `Gamma ${MARKER} Delta.`);
    const { doc: out } = run(doc);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg']);
    expect(out.figures).toHaveLength(1);
    const text = paragraphs(out.functionality![0].blocks).join(' | ');
    expect(text).toContain('Gamma');
    expect(text).toContain('Delta.');
    expect(wholeText(out)).not.toContain(MARKER);
    expect(valid(out)).toBe(true);
  });

  it('drops a model-placed figure for the same file when the marker is hosting, and compacts the figure refs', () => {
    const doc = docWithParagraphs('Lead.', `Marker lead ${MARKER} marker tail.`);
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    doc.applications!.blocks = [{ kind: 'paragraph', text: 'App lead.' }, { kind: 'figure', ref: 1 }];
    doc.figures = [modelFigure('desk-lamp.jpg'), modelFigure('kettle-side.jpg')];

    const { doc: out } = run(doc, [LAMP, KETTLE]);

    expect([...figureFilesInOrder(out)].sort()).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    expect(out.figures).toHaveLength(2);
    // The model's figure for the lamp is gone; the marker's figure carries the manifest caption.
    const lamp = out.figures.find(f => f.file === 'desk-lamp.jpg')!;
    expect(lamp.caption).not.toContain(MODEL_CAPTION);
    expect(lamp.caption).toContain(LAMP_DESC_UK);
    // The kettle figure the model placed is untouched.
    expect(out.figures.find(f => f.file === 'kettle-side.jpg')!.caption).toContain(MODEL_CAPTION);
    // No dangling or duplicate reference: the schema's ref-integrity check accepts the document.
    expect(valid(out)).toBe(true);
    const refs = blocksInOrder(out).flatMap(b => (b.kind === 'figure' ? [b.ref] : []));
    expect([...refs].sort()).toEqual([0, 1]);
  });

  it('is idempotent: a second run changes nothing and adds no figure or warning (FR-11)', () => {
    const doc = docWithParagraphs(`Alpha ${MARKER} Beta.`, 'Plain paragraph [ghost.jpg] end.');
    const first = run(doc);
    const second = run(first.doc);
    expect(second.doc).toEqual(first.doc);
    expect(second.report.unmatched).toEqual([]);
    expect(second.report.notPlaced).toEqual([]);
    expect(second.report.warnings).toEqual([]);
    expect(second.doc.figures).toHaveLength(1);
  });
});

describe('unmatched placeholders — FR-9 (AC-5)', () => {
  it('removes an unmatched marker, keeps the text around it, adds no figure, and reports it once', () => {
    const doc = docWithParagraphs('First [ghost.jpg] paragraph.', 'Second [ghost.jpg] paragraph.');
    const { doc: out, report } = run(doc, []);
    expect(wholeText(out)).not.toContain('[ghost.jpg]');
    expect(paragraphs(out.functionality![0].blocks)).toEqual(['First paragraph.', 'Second paragraph.']);
    expect(out.figures).toEqual([]);
    expect(report.unmatched).toEqual(['ghost.jpg']);
    const warnings = report.warnings.filter(w => w.rule === 'unmatched-image-placeholder');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].detail).toContain('ghost.jpg');
    expect(valid(out)).toBe(true);
  });

  it.each([
    ['status error', entry({ status: 'error' })],
    ['status pending', entry({ status: 'pending' })],
    ['no usable urlFilename', entry({ urlFilename: '' })],
  ])('treats an entry with %s as unmatched', (_label, unusable) => {
    const { doc: out, report } = run(docWithParagraphs(`Alpha ${MARKER} Beta.`), [unusable]);
    expect(report.unmatched).toEqual(['desk-lamp.jpg']);
    expect(out.figures).toEqual([]);
    expect(wholeText(out)).not.toContain(MARKER);
  });

  it('matches a .webp marker by originalFilename and places the .jpg output file (A-5)', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    const { doc: out, report } = run(docWithParagraphs('Alpha [desk-lamp.webp] Beta.'), [webp]);
    expect(report.unmatched).toEqual([]);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg']);
    expect(wholeText(out)).not.toContain('[desk-lamp.webp]');
  });
});

describe('text that is not a placeholder, and non-text content — FR-10 (AC-6), FR-1, H-2', () => {
  it.each(['[note]', '[1]', '[Image.jpg]', '[my image.jpg]', '[a.png]', '[desk-lamp.JPG]'])(
    'leaves %s exactly as written, with no figure and no warning',
    text => {
      const doc = docWithParagraphs(`Alpha ${text} Beta.`);
      const before = structuredClone(doc);
      const { doc: out, report } = run(doc);
      expect(out).toEqual(before);
      expect(report.warnings).toEqual([]);
      expect(report.unmatched).toEqual([]);
      expect(report.notPlaced).toEqual([]);
    },
  );

  it('leaves a mangled marker as plain text and does not count it as seen (OQ-3)', () => {
    const { doc: out, report } = run(docWithParagraphs('Alpha [Desk-Lamp.jpg] Beta.'));
    expect(wholeText(out)).toContain('[Desk-Lamp.jpg]');
    expect(report.seen.size).toBe(0);
    expect(out.figures).toEqual([]);
  });

  it('ignores a marker inside a figure alt attribute value: not removed, not reported (H-2)', () => {
    const doc = docWithParagraphs('Lead.');
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    doc.figures = [{ file: 'kettle-side.jpg', alt: 'Alt mentions [ghost.jpg]', caption: '<b>Photo:</b> Caption.' }];
    const { doc: out, report } = run(doc);
    expect(out.figures[0].alt).toBe('Alt mentions [ghost.jpg]');
    expect(report.unmatched).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('ignores a marker in a video title attribute value (H-2)', () => {
    const doc = v3WithVideo();
    doc.videos[0].title = 'Review [ghost.jpg]';
    const { doc: out, report } = run(doc);
    expect(out.videos[0].title).toBe('Review [ghost.jpg]');
    expect(report.unmatched).toEqual([]);
  });
});

describe('seen set — what the dropped-marker rule (FR-17) relies on', () => {
  it('records every exact-grammar marker file found in visible text, matched or not', () => {
    const { report } = run(docWithParagraphs(`A ${MARKER} B [ghost.jpg] C [note].`));
    expect([...report.seen].sort()).toEqual(['desk-lamp.jpg', 'ghost.jpg']);
  });

  it('records a non-hosting marker as seen, because it was processed (removed with a warning)', () => {
    const doc = baseDoc();
    doc.killerSpecs![0].why += ` ${MARKER}`;
    expect([...run(doc).report.seen]).toEqual(['desk-lamp.jpg']);
  });
});

describe('rendered output satisfies the AGENTS.md section 4 image criteria — FR-13, FR-14 (AC-3)', () => {
  const render = (doc: ProductDescriptionDoc) => new DOMParser().parseFromString(renderDescription(doc, renderCtx), 'text/html');

  it('wraps the image in a styled figure with a <b>-labelled figcaption and decoding="async"', () => {
    const { doc: out } = run(docWithParagraphs(`Lead ${MARKER} tail.`));
    const dom = render(out);
    const figure = dom.querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe('display: block; width: max-content; max-width: 100%; margin: 4px auto;');
    const img = figure.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(`${IMAGE_BASE}acme/lamp/desk-lamp.jpg`);
    expect(img.getAttribute('alt')).toBe(LAMP_ALT_UK);
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('style')).toBe('max-width: 100%; height: auto; display: block;');
    const caption = figure.querySelector('figcaption')!;
    expect(caption.getAttribute('style')).toBe('text-align: left;');
    expect(caption.querySelector('b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(caption.textContent).toContain(LAMP_DESC_UK);
    expect(caption.textContent!.trim()).not.toBe(img.getAttribute('alt'));
  });

  it('makes the first image in document order eager and every later one lazy, wherever the marker sits', () => {
    const doc = docWithParagraphs(`Body lead [kettle-side.jpg] body tail.`);
    doc.hook = `Hook lead ${MARKER} hook tail.`;
    const { doc: out } = run(doc, [LAMP, KETTLE]);
    const imgs = Array.from(render(out).querySelectorAll('img'));
    expect(imgs.map(i => i.getAttribute('src')!.split('/').pop())).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    imgs.forEach(i => expect(i.getAttribute('decoding')).toBe('async'));
  });

  it('never nests a figure inside a paragraph and never leaves a figure without a preceding paragraph', () => {
    const { doc: out } = run(docWithParagraphs(`Lead ${MARKER} tail.`));
    const html = renderDescription(out, renderCtx);
    expect(html).not.toMatch(/<p[^>]*>(?:(?!<\/p>)[\s\S])*<figure/);
    const figure = new DOMParser().parseFromString(html, 'text/html').querySelector('figure')!;
    let prev = figure.previousElementSibling;
    while (prev && prev.tagName !== 'P') prev = prev.previousElementSibling;
    expect(prev).not.toBeNull();
    expect(prev!.textContent!.trim()).not.toBe(figure.querySelector('figcaption')!.textContent!.trim());
  });
});

describe('what the step must not touch — FR-15, FR-16', () => {
  it('leaves specs, killer specs, meta-bearing fields, videos and their blocks exactly as they were', () => {
    const doc = v3WithVideo();
    doc.functionality![0].blocks.unshift({ kind: 'paragraph', text: `Lead ${MARKER} tail.` });
    const before = structuredClone(doc);
    const { doc: out } = run(doc);
    expect(out.specs).toEqual(before.specs);
    expect(out.killerSpecs).toEqual(before.killerSpecs);
    expect(out.videos).toEqual(before.videos);
    expect(blocksInOrder(out).filter(b => b.kind === 'video')).toHaveLength(1);
    expect(out.localizedName).toBe(before.localizedName);
    expect(out.cta.heading).toBe(before.cta.heading);
  });

  it('introduces no Markdown and no <br> into any text it writes', () => {
    const { doc: out } = run(docWithParagraphs(`Alpha ${MARKER} Beta.`));
    const text = wholeText(out);
    expect(text).not.toMatch(/<br/i);
    expect(text).not.toMatch(/\*\*|^#{1,6}\s/m);
  });
});

describe('a document without markers behaves as before — NFR-8', () => {
  it('returns an equal document and an empty report', () => {
    const doc = baseDoc();
    const before = structuredClone(doc);
    const { doc: out, report } = run(doc);
    expect(out).toEqual(before);
    expect(report.seen.size).toBe(0);
    expect(report.unmatched).toEqual([]);
    expect(report.notPlaced).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('does not mutate its input', () => {
    const doc = docWithParagraphs(`Alpha ${MARKER} Beta.`);
    const before = structuredClone(doc);
    run(doc);
    expect(doc).toEqual(before);
  });
});

describe('determinism — NFR-2', () => {
  it('returns the same output for the same input', () => {
    const a = run(docWithParagraphs(`Alpha ${MARKER} Beta.`, 'Next [ghost.jpg].'));
    const b = run(docWithParagraphs(`Alpha ${MARKER} Beta.`, 'Next [ghost.jpg].'));
    expect(b.doc).toEqual(a.doc);
    expect(b.report.warnings).toEqual(a.report.warnings);
  });
});

describe('FR-21 caption rules through the Doc step (AC-9 h, i; NFR-9, NFR-11)', () => {
  const SAME_LABEL_KETTLE = entry({
    ...KETTLE, visionLabelUk: LAMP_LABEL_UK,
  });
  const twoMarkers = () => docWithParagraphs('Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.');

  it('uses the Ukrainian fallbacks, silently, for an entry created before this Story (FR-4, AC-9 i)', () => {
    const { doc: out, report } = run(docWithParagraphs(`Before ${MARKER} after.`), [legacyEntry()]);
    expect(out.figures[0].alt).toBe('desk lamp');
    expect(out.figures[0].caption).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(report.warnings).toEqual([]);
    expect(valid(out)).toBe(true);
  });

  it('raises one image-caption-not-native warning and uses the fallback for a non-Cyrillic recorded field', () => {
    const { doc: out, report } = run(docWithParagraphs(`Before ${MARKER} after.`), [entry({ visionDescriptionUk: 'A lamp on a table.' })]);
    expect(out.figures[0].caption).toBe(`<b>${LAMP_LABEL_UK}</b> desk lamp.`);
    const w = report.warnings.filter(x => x.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('desk-lamp.jpg');
    expect(hasCyrillic(w[0].detail)).toBe(true);
  });

  it('treats a recorded generic label as non-native: the fallback label plus one warning', () => {
    const { doc: out, report } = run(docWithParagraphs(`Before ${MARKER} after.`), [entry({ visionLabelUk: 'Зображення:' })]);
    expect(out.figures[0].caption.startsWith(`<b>${FALLBACK_LABEL}</b>`)).toBe(true);
    expect(report.warnings.map(w => w.rule)).toEqual(['image-caption-not-native']);
  });

  it('raises one image-caption-duplicate-label warning for the LATER figure and keeps both captions (rule 5)', () => {
    const { doc: out, report } = run(twoMarkers(), [LAMP, SAME_LABEL_KETTLE]);
    const w = report.warnings.filter(x => x.rule === 'image-caption-duplicate-label');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('kettle-side.jpg');
    expect(out.figures.map(f => f.caption.startsWith(`<b>${LAMP_LABEL_UK}</b>`))).toEqual([true, true]);
  });

  it('does not rename the later label automatically (no rewording)', () => {
    const { doc: out } = run(twoMarkers(), [LAMP, SAME_LABEL_KETTLE]);
    expect(out.figures[1].caption).toBe(`<b>${LAMP_LABEL_UK}</b> Сталевий чайник, вигляд збоку.`);
  });

  it('exempts the generic fallback label: two legacy entries repeat it with no warning', () => {
    const k = legacyEntry({ id: 'img-2', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg' });
    const { report } = run(twoMarkers(), [legacyEntry(), k]);
    expect(report.warnings).toEqual([]);
  });

  it('counts a figure appended at the end (non-hosting marker) in document order for the duplicate check', () => {
    const doc = docWithParagraphs(`Alpha ${MARKER} Beta.`);
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ' [kettle-side.jpg]';
    const { doc: out, report } = run(doc, [LAMP, SAME_LABEL_KETTLE]);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    const w = report.warnings.filter(x => x.rule === 'image-caption-duplicate-label');
    expect(w).toHaveLength(1);
    expect(w[0].detail).toContain('kettle-side.jpg');
  });

  it('gives the figure appended at the end the Ukrainian builder output, never an English string (OI-7)', () => {
    const doc = baseDoc();
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`;
    const { doc: out } = run(doc, [legacyEntry()]);
    expect(out.figures).toHaveLength(1);
    expect(out.figures[0].caption).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(out.figures[0].alt).toBe('desk lamp');
    expect(JSON.stringify(out.figures)).not.toMatch(/Image:|Product image|\bView\b/);
  });

  it('with cyrillicCheck off the English text is used as recorded and raises no caption warning (A-15)', () => {
    const english = entry({ visionLabelUk: 'Green laser result:', visionDescriptionUk: 'A laser burns wood.', visionAltUk: 'Laser on wood' });
    const { doc: out, report } = applyImagePlaceholdersDoc(docWithParagraphs(`Before ${MARKER} after.`), [english], { cyrillicCheck: false });
    expect(out.figures[0].alt).toBe('Laser on wood');
    expect(out.figures[0].caption).toBe('<b>Green laser result:</b> A laser burns wood.');
    expect(report.warnings).toEqual([]);
  });

  it('is idempotent for the caption warnings: a second run raises none (FR-11)', () => {
    const manifest = [LAMP, SAME_LABEL_KETTLE];
    const first = run(twoMarkers(), manifest);
    const second = run(first.doc, manifest);
    expect(second.doc).toEqual(first.doc);
    expect(second.report.warnings).toEqual([]);
  });

  it('writes a caption the schema accepts for every recorded-field shape', () => {
    const shapes = [
      LAMP,
      legacyEntry(),
      entry({ visionLabelUk: 'Лазер <b> & тест:', visionDescriptionUk: 'Потужність <20 Вт & більше.' }),
      entry({ visionAltUk: 'English' }),
    ];
    for (const e of shapes) expect(valid(run(docWithParagraphs(`Before ${MARKER} after.`), [e]).doc)).toBe(true);
  });
});

describe('the layout of every non-video figure the renderer emits (FR-22, AC-9 l)', () => {
  const render = (doc: ProductDescriptionDoc) => new DOMParser().parseFromString(renderDescription(doc, renderCtx), 'text/html');

  it('a model-placed figure kept by FR-5 (non-hosting marker) is rendered with max-content and a left-aligned figcaption', () => {
    const doc = docWithParagraphs('Lead.');
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    doc.figures = [modelFigure('desk-lamp.jpg')];
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`;
    const { doc: out } = run(doc);
    const figure = render(out).querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe('display: block; width: max-content; max-width: 100%; margin: 4px auto;');
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe('text-align: left;');
    // The label and language rules of FR-21 do not reach a model-placed figure (Out of scope): its caption is untouched.
    expect(figure.querySelector('figcaption')!.textContent).toContain(MODEL_CAPTION);
  });

  it('a figure appended at the end is rendered with max-content, a left-aligned figcaption and no fit-content anywhere', () => {
    const doc = baseDoc();
    (doc.keyBenefits![0] as { items: { text: string }[] }).items[0].text += ` ${MARKER}`;
    const html = renderDescription(run(doc).doc, renderCtx);
    expect(html).not.toContain('fit-content');
    const figure = new DOMParser().parseFromString(html, 'text/html').querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe('display: block; width: max-content; max-width: 100%; margin: 4px auto;');
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe('text-align: left;');
  });
});
