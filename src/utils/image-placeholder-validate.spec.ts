/**
 * image-placeholder-validate.spec.ts - US-5.1 T9 (pre-extraction, dropped-marker validator and the
 * ladder-exhaustion finalisers), reworked for Specification v9.
 *
 * From Spec FR-9, FR-11, FR-17, FR-18, FR-21, NFR-9 and the plan-gate decisions OQ-3 (a mangled marker
 * counts as dropped), OQ-5 (end-append only for marker-derived images) and OQ-6 (warning context is the
 * uk-UA master label). v9 adds: the figure a finaliser appends is built by the Ukrainian builder, and the
 * FR-21 caption warnings are carried (validator) or raised (finalisers) for it. The orchestrator-facing
 * names and signatures below are unchanged.
 *
 * CONTRACT PINNED HERE (plan D4; shapes chosen by TEST_WRITING, see the test strategy section 3):
 *   preExtractPlaceholders(description, manifest)          -> iterable of distinct marker files that
 *                                                             match a usable upload (Set or array)
 *   validateDroppedPlaceholders(expected, report, context) -> ValidationIssue[]
 *        error   `dropped-image-placeholder` per expected file the step never saw, NO `path`
 *                (so the repair ladder resolves it to a full regeneration)
 *        and the report's unmatched / not-placed warnings carried through
 *        `report === undefined` (step skipped on a schema-invalid candidate) -> []
 *   finalizeDroppedPlaceholdersDoc(doc, issues, manifest)  -> { doc, issues }
 *   finalizeDroppedPlaceholdersHtml(html, issues, manifest, imageBase, folders) -> { html, issues }
 *
 * `expected` and the issues are always produced by the real functions and fed back in, so these
 * specs do not depend on whether the pre-extracted set is a Set or an array, nor on how the
 * finalisers recover the marker text from an issue.
 */
import { describe, it, expect } from 'vitest';
import {
  preExtractPlaceholders, validateDroppedPlaceholders,
  finalizeDroppedPlaceholdersDoc, finalizeDroppedPlaceholdersHtml,
} from './image-placeholder-validate';
import { applyImagePlaceholdersDoc } from './image-placeholder-doc';
import { applyImagePlaceholdersHtml } from './image-placeholder-html';
import { validateImageManifestCoverageDoc } from './image-manifest-coverage';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import type { ValidationIssue } from './output-validator';
import {
  IMAGE_BASE, FOLDERS, LAMP, MARKER, MODEL_CAPTION, baseDoc, docWithParagraphs, blocksInOrder,
  figureFilesInOrder, entry, modelFigure, legacyEntry, LAMP_ALT_UK, LAMP_LABEL_UK, LAMP_DESC_UK, FALLBACK_LABEL,
} from '../../test/fixtures/image-placeholder/fixtures';

const CTX = 'HTML (uk-UA)';
const DROPPED = 'dropped-image-placeholder';
const files = (x: Iterable<string>): string[] => [...x];
const dropped = (issues: ValidationIssue[]) => issues.filter(i => i.rule === DROPPED);
const message = (marker: string): string =>
  `ШІ не зміг зберегти маркер ${marker} у тексті. Зображення було перенесено в кінець опису. Будь ласка, перевірте його позицію.`;

describe('preExtractPlaceholders — FR-17, A-10', () => {
  it('returns the distinct marker files of the Original Description that match a usable upload', () => {
    const got = preExtractPlaceholders(`Intro ${MARKER} mid ${MARKER} and [ghost.jpg] and [note].`, [LAMP]);
    expect(files(got)).toEqual(['desk-lamp.jpg']);
  });

  it('is empty for a description with no marker, so the dropped rule can never fire (NFR-8)', () => {
    expect(files(preExtractPlaceholders('Plain description with [note] and [1].', [LAMP]))).toEqual([]);
    expect(files(preExtractPlaceholders('', [LAMP]))).toEqual([]);
  });

  it('is empty when every marker is unmatched, because those never raise the dropped rule', () => {
    expect(files(preExtractPlaceholders('[ghost.jpg] [other.webp]', [LAMP]))).toEqual([]);
    expect(files(preExtractPlaceholders(MARKER, []))).toEqual([]);
    expect(files(preExtractPlaceholders(MARKER, undefined))).toEqual([]);
  });

  it.each([
    ['status error', entry({ status: 'error' })],
    ['status pending', entry({ status: 'pending' })],
    ['no usable urlFilename', entry({ urlFilename: '' })],
  ])('does not expect a file whose entry has %s', (_label, unusable) => {
    expect(files(preExtractPlaceholders(MARKER, [unusable]))).toEqual([]);
  });

  it('matches a .webp marker by originalFilename', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    expect(files(preExtractPlaceholders('See [desk-lamp.webp].', [webp]))).toEqual(['desk-lamp.webp']);
  });

  it('does not extract a mangled marker (it is plain text, FR-1)', () => {
    expect(files(preExtractPlaceholders('See [Desk-Lamp.jpg].', [LAMP]))).toEqual([]);
  });
});

describe('validateDroppedPlaceholders — FR-17, FR-9, NFR-9', () => {
  const expected = () => preExtractPlaceholders(`Intro ${MARKER}.`, [LAMP]);

  it('raises one error naming the file when the generated document has no processed occurrence', () => {
    const { report } = applyImagePlaceholdersDoc(baseDoc(), [LAMP]);
    const issues = validateDroppedPlaceholders(expected(), report, CTX);
    const errs = dropped(issues);
    expect(errs).toHaveLength(1);
    expect(errs[0].severity).toBe('error');
    expect(errs[0].detail).toContain('desk-lamp.jpg');
    expect(errs[0].context).toBe(CTX);
  });

  it('carries no path, so the ladder resolves it to a full regeneration (plan D5)', () => {
    const { report } = applyImagePlaceholdersDoc(baseDoc(), [LAMP]);
    expect(dropped(validateDroppedPlaceholders(expected(), report, CTX))[0].path).toBeUndefined();
  });

  it('counts a file once however many times the Original Description mentions it', () => {
    const many = preExtractPlaceholders(`${MARKER} ${MARKER} ${MARKER}`, [LAMP]);
    const { report } = applyImagePlaceholdersDoc(baseDoc(), [LAMP]);
    expect(dropped(validateDroppedPlaceholders(many, report, CTX))).toHaveLength(1);
  });

  it('raises nothing when the marker was substituted by a figure', () => {
    const { report } = applyImagePlaceholdersDoc(docWithParagraphs(`Lead ${MARKER} tail.`), [LAMP]);
    expect(dropped(validateDroppedPlaceholders(expected(), report, CTX))).toEqual([]);
  });

  it('raises nothing when the marker was removed with a warning (non-hosting position)', () => {
    const doc = baseDoc();
    doc.killerSpecs![0].why += ` ${MARKER}`;
    const { report } = applyImagePlaceholdersDoc(doc, [LAMP]);
    const issues = validateDroppedPlaceholders(expected(), report, CTX);
    expect(dropped(issues)).toEqual([]);
    expect(issues.some(i => i.rule === 'image-placeholder-not-placed')).toBe(true);
  });

  it('treats a mangled marker as dropped (OQ-3)', () => {
    const { report } = applyImagePlaceholdersDoc(docWithParagraphs('Lead [Desk-Lamp.jpg] tail.'), [LAMP]);
    expect(dropped(validateDroppedPlaceholders(expected(), report, CTX))).toHaveLength(1);
  });

  it('does not count an occurrence in an attribute as processed (FR-1, H-2)', () => {
    const { report } = applyImagePlaceholdersHtml(`<p>Plain.</p><img src="https://x.test/o.jpg" alt="${MARKER}">`, [LAMP], IMAGE_BASE, FOLDERS);
    expect(dropped(validateDroppedPlaceholders(expected(), report, CTX))).toHaveLength(1);
  });

  it('works over an HTML-path report as well as a Doc-path report', () => {
    const ok = applyImagePlaceholdersHtml(`<p>Lead ${MARKER} tail.</p>`, [LAMP], IMAGE_BASE, FOLDERS).report;
    expect(dropped(validateDroppedPlaceholders(expected(), ok, CTX))).toEqual([]);
    const lost = applyImagePlaceholdersHtml('<p>Nothing here.</p>', [LAMP], IMAGE_BASE, FOLDERS).report;
    expect(dropped(validateDroppedPlaceholders(expected(), lost, CTX))).toHaveLength(1);
  });

  it('returns no issue at all when the step never ran (schema-invalid candidate, N-4)', () => {
    expect(validateDroppedPlaceholders(expected(), undefined, CTX)).toEqual([]);
  });

  it('never fires for an unmatched marker: it raises a warning, never an error (FR-9, NFR-9)', () => {
    const none = preExtractPlaceholders('[ghost.jpg]', [LAMP]);
    const { report } = applyImagePlaceholdersDoc(docWithParagraphs('Lead [ghost.jpg] tail.'), [LAMP]);
    const issues = validateDroppedPlaceholders(none, report, CTX);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
    const w = issues.filter(i => i.rule === 'unmatched-image-placeholder');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('ghost.jpg');
    expect(w[0].context).toBe(CTX);
  });

  it('is idempotent across repair attempts: the same inputs give the same issues (FR-11)', () => {
    const { report } = applyImagePlaceholdersDoc(baseDoc(), [LAMP]);
    expect(validateDroppedPlaceholders(expected(), report, CTX)).toEqual(validateDroppedPlaceholders(expected(), report, CTX));
  });
});

describe('finalizeDroppedPlaceholdersDoc — FR-18, Q-B, Q-C, NFR-9', () => {
  const droppedIssues = (description: string, manifest = [LAMP]) => {
    const { report } = applyImagePlaceholdersDoc(baseDoc(), manifest);
    return validateDroppedPlaceholders(preExtractPlaceholders(description, manifest), report, CTX);
  };

  it('moves the image to the end exactly once and downgrades the error to the Ukrainian warning', () => {
    const issues = droppedIssues(`Intro ${MARKER}.`);
    const { doc, issues: out } = finalizeDroppedPlaceholdersDoc(baseDoc(), issues, [LAMP]);

    expect(figureFilesInOrder(doc)).toEqual(['desk-lamp.jpg']);
    expect(doc.figures).toHaveLength(1);
    const blocks = blocksInOrder(doc);
    expect(blocks[blocks.length - 1].kind).toBe('figure');
    expect(JSON.stringify(doc)).not.toContain(MARKER);
    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(true);
    expect(validateImageManifestCoverageDoc(doc.figures, [LAMP], CTX)).toEqual([]);

    const mine = dropped(out);
    expect(mine).toHaveLength(1);
    expect(mine[0].severity).toBe('warning');
    expect(mine[0].detail).toBe(message(MARKER));
    expect(mine[0].context).toBe(CTX);
    expect(out.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('writes the real marker, including a .webp one, into the message', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    const issues = droppedIssues('Intro [desk-lamp.webp].', [webp]);
    const { doc, issues: out } = finalizeDroppedPlaceholdersDoc(baseDoc(), issues, [webp]);
    expect(dropped(out)[0].detail).toBe(message('[desk-lamp.webp]'));
    expect(figureFilesInOrder(doc)).toEqual(['desk-lamp.jpg']);
  });

  it('relocates a model-placed figure for the same file to the end so the image appears once (Q-B)', () => {
    const doc = docWithParagraphs('Lead.');
    doc.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
    doc.figures = [modelFigure('desk-lamp.jpg')];
    const issues = droppedIssues(`Intro ${MARKER}.`);

    const { doc: out } = finalizeDroppedPlaceholdersDoc(doc, issues, [LAMP]);
    expect(figureFilesInOrder(out)).toEqual(['desk-lamp.jpg']);
    expect(out.figures).toHaveLength(1);
    const blocks = blocksInOrder(out);
    expect(blocks[blocks.length - 1].kind).toBe('figure');
    expect(out.functionality![0].blocks.some(b => b.kind === 'figure')).toBe(false);
    expect(ProductDescriptionDocSchema.safeParse(out).success).toBe(true);
  });

  it('leaves unrelated issues exactly as they were', () => {
    const other: ValidationIssue = { severity: 'error', rule: 'some-other-rule', detail: 'x', context: CTX };
    const note: ValidationIssue = { severity: 'warning', rule: 'some-note', detail: 'y', context: CTX };
    const { issues: out } = finalizeDroppedPlaceholdersDoc(baseDoc(), [other, ...droppedIssues(`${MARKER}`), note], [LAMP]);
    expect(out).toContainEqual(other);
    expect(out).toContainEqual(note);
  });

  it('changes nothing when there is no dropped-placeholder error', () => {
    const doc = baseDoc();
    const before = structuredClone(doc);
    const warning: ValidationIssue = { severity: 'warning', rule: 'unmatched-image-placeholder', detail: 'ghost.jpg', context: CTX };
    const { doc: out, issues } = finalizeDroppedPlaceholdersDoc(doc, [warning], [LAMP]);
    expect(out).toEqual(before);
    expect(issues).toEqual([warning]);
  });

  it('produces one figure and one warning per dropped file', () => {
    const kettle = entry({ id: 'k', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', order: 1 });
    const manifest = [LAMP, kettle];
    const { report } = applyImagePlaceholdersDoc(baseDoc(), manifest);
    const issues = validateDroppedPlaceholders(preExtractPlaceholders(`${MARKER} [kettle-side.jpg]`, manifest), report, CTX);
    const { doc, issues: out } = finalizeDroppedPlaceholdersDoc(baseDoc(), issues, manifest);
    expect([...figureFilesInOrder(doc)].sort()).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    expect(dropped(out)).toHaveLength(2);
    expect(dropped(out).every(i => i.severity === 'warning')).toBe(true);
  });
});

describe('finalizeDroppedPlaceholdersHtml — FR-18, Q-B, Q-C, NFR-9', () => {
  const LD = '<script type="application/ld+json">{"@type":"Product"}</script>';
  const PAGE = `<h1>Lamp</h1><p>One.</p><p class="cta">Buy now.</p>${LD}`;
  const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');

  const droppedIssues = (html: string, description: string, manifest = [LAMP]) => {
    const { report } = applyImagePlaceholdersHtml(html, manifest, IMAGE_BASE, FOLDERS);
    return validateDroppedPlaceholders(preExtractPlaceholders(description, manifest), report, CTX);
  };

  it('appends the figure at the end before trailing JSON-LD and downgrades the error to the Ukrainian warning', () => {
    const issues = droppedIssues(PAGE, `Intro ${MARKER}.`);
    const { html, issues: out } = finalizeDroppedPlaceholdersHtml(PAGE, issues, [LAMP], IMAGE_BASE, FOLDERS);

    const imgs = Array.from(dom(html).querySelectorAll('img'));
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toBe(`${IMAGE_BASE}acme/lamp/desk-lamp.jpg`);
    expect(html.lastIndexOf('<figure')).toBeGreaterThan(html.indexOf('Buy now.'));
    expect(html.lastIndexOf('<figure')).toBeLessThan(html.indexOf('<script'));
    expect(html.trimEnd().endsWith(LD)).toBe(true);
    expect(html).not.toContain(MARKER);

    const mine = dropped(out);
    expect(mine).toHaveLength(1);
    expect(mine[0].severity).toBe('warning');
    expect(mine[0].detail).toBe(message(MARKER));
    expect(out.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('removes a model-emitted figure for the same file so the image appears exactly once (Q-B)', () => {
    const withModel =
      `<h1>Lamp</h1><p>One.</p>` +
      `<figure><img src="${IMAGE_BASE}acme/lamp/desk-lamp.jpg" alt="old"><figcaption><b>Photo:</b> ${MODEL_CAPTION}</figcaption></figure>` +
      `<p class="cta">Buy now.</p>${LD}`;
    const issues = droppedIssues(withModel, MARKER);
    const { html } = finalizeDroppedPlaceholdersHtml(withModel, issues, [LAMP], IMAGE_BASE, FOLDERS);
    expect(dom(html).querySelectorAll('img')).toHaveLength(1);
    expect(html).not.toContain(MODEL_CAPTION);
    expect(html.lastIndexOf('<figure')).toBeGreaterThan(html.indexOf('Buy now.'));
  });

  it('uses a relative src for an empty image base', () => {
    const issues = droppedIssues(PAGE, MARKER);
    const { html } = finalizeDroppedPlaceholdersHtml(PAGE, issues, [LAMP], '', FOLDERS);
    expect(dom(html).querySelector('img')!.getAttribute('src')).toBe('acme/lamp/desk-lamp.jpg');
  });

  it('leaves unrelated issues and the HTML untouched when no dropped error remains', () => {
    const note: ValidationIssue = { severity: 'warning', rule: 'some-note', detail: 'y', context: CTX };
    const { html, issues } = finalizeDroppedPlaceholdersHtml(PAGE, [note], [LAMP], IMAGE_BASE, FOLDERS);
    expect(html).toBe(PAGE);
    expect(issues).toEqual([note]);
  });
});

/**
 * v9 (FR-21, NFR-9, NFR-11, OI-7): the figure a finaliser appends goes through the same Ukrainian builder
 * as every other marker figure, so no English string can reach a figure that a marker named, and the same
 * caption warnings are raised for it.
 */
describe('finalisers build the Ukrainian figure and raise the FR-21 caption warnings (OI-7, AC-9 h, i)', () => {
  const LD = '<script type="application/ld+json">{"@type":"Product"}</script>';
  const PAGE = `<h1>Lamp</h1><p>One.</p><p class="cta">Buy now.</p>${LD}`;
  const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');
  const ENGLISH_STRINGS = /Image:|Product image|\bView\b/;
  const rulesOf = (issues: ValidationIssue[]): string[] => issues.map(i => i.rule);

  const droppedDocIssues = (manifest: ReturnType<typeof entry>[], description = MARKER) =>
    validateDroppedPlaceholders(preExtractPlaceholders(description, manifest), applyImagePlaceholdersDoc(baseDoc(), manifest).report, CTX);
  const droppedHtmlIssues = (manifest: ReturnType<typeof entry>[], description = MARKER) =>
    validateDroppedPlaceholders(preExtractPlaceholders(description, manifest), applyImagePlaceholdersHtml(PAGE, manifest, IMAGE_BASE, FOLDERS).report, CTX);

  it('Doc: the appended figure carries the recorded Ukrainian alt and caption', () => {
    const { doc } = finalizeDroppedPlaceholdersDoc(baseDoc(), droppedDocIssues([LAMP]), [LAMP]);
    expect(doc.figures[0].alt).toBe(LAMP_ALT_UK);
    expect(doc.figures[0].caption).toBe(`<b>${LAMP_LABEL_UK}</b> ${LAMP_DESC_UK}`);
  });

  it('Doc: an entry created before this Story takes the Ukrainian fallbacks, with only the FR-18 warning and no English string', () => {
    const e = legacyEntry();
    const { doc, issues } = finalizeDroppedPlaceholdersDoc(baseDoc(), droppedDocIssues([e]), [e]);
    expect(doc.figures[0].caption).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(doc.figures[0].alt).toBe('desk lamp');
    expect(JSON.stringify(doc.figures)).not.toMatch(ENGLISH_STRINGS);
    expect(rulesOf(issues)).toEqual([DROPPED]);
  });

  it('Doc: a non-native recorded field raises one image-caption-not-native warning next to the FR-18 warning', () => {
    const e = entry({ visionAltUk: 'English alt only' });
    const { doc, issues } = finalizeDroppedPlaceholdersDoc(baseDoc(), droppedDocIssues([e]), [e]);
    expect(doc.figures[0].alt).toBe('desk lamp');
    const w = issues.filter(i => i.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('desk-lamp.jpg');
    expect(w[0].context).toBe(CTX);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
    expect(dropped(issues)).toHaveLength(1);
  });

  it('Doc: the figure it appends stays schema-valid for a fallback or non-native entry', () => {
    for (const e of [legacyEntry(), entry({ visionLabelUk: 'Image:' })]) {
      const { doc } = finalizeDroppedPlaceholdersDoc(baseDoc(), droppedDocIssues([e]), [e]);
      expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(true);
    }
  });

  it('Html: the appended figure carries the recorded Ukrainian alt, caption and the max-content layout', () => {
    const { html } = finalizeDroppedPlaceholdersHtml(PAGE, droppedHtmlIssues([LAMP]), [LAMP], IMAGE_BASE, FOLDERS);
    const figure = dom(html).querySelector('figure')!;
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe(LAMP_ALT_UK);
    expect(figure.querySelector('figcaption b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(figure.getAttribute('style')).toBe('display: block; width: max-content; max-width: 100%; margin: 4px auto;');
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe('text-align: left;');
  });

  it('Html: an entry created before this Story takes the Ukrainian fallbacks and no English string', () => {
    const e = legacyEntry();
    const { html, issues } = finalizeDroppedPlaceholdersHtml(PAGE, droppedHtmlIssues([e]), [e], IMAGE_BASE, FOLDERS);
    const figure = dom(html).querySelector('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(FALLBACK_LABEL);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe('desk lamp');
    expect(figure.outerHTML).not.toMatch(ENGLISH_STRINGS);
    expect(rulesOf(issues)).toEqual([DROPPED]);
  });

  it('Html: a non-native recorded field raises one image-caption-not-native warning next to the FR-18 warning', () => {
    const e = entry({ visionDescriptionUk: 'A lamp on a table.' });
    const { issues } = finalizeDroppedPlaceholdersHtml(PAGE, droppedHtmlIssues([e]), [e], IMAGE_BASE, FOLDERS);
    expect(issues.filter(i => i.rule === 'image-caption-not-native')).toHaveLength(1);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });
});

describe('validateDroppedPlaceholders carries the FR-21 caption warnings of the step report (NFR-9)', () => {
  it('passes image-caption-not-native through with the gate context and warning severity', () => {
    const e = entry({ visionAltUk: 'English alt only' });
    const { report } = applyImagePlaceholdersDoc(docWithParagraphs(`Lead ${MARKER} tail.`), [e]);
    const issues = validateDroppedPlaceholders(preExtractPlaceholders(MARKER, [e]), report, CTX);
    const w = issues.filter(i => i.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ severity: 'warning', context: CTX });
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('passes image-caption-duplicate-label through with the gate context and warning severity', () => {
    const kettle = entry({ id: 'k', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', visionLabelUk: LAMP_LABEL_UK });
    const manifest = [LAMP, kettle];
    const { report } = applyImagePlaceholdersDoc(docWithParagraphs('Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.'), manifest);
    const issues = validateDroppedPlaceholders(preExtractPlaceholders('[desk-lamp.jpg] [kettle-side.jpg]', manifest), report, CTX);
    const w = issues.filter(i => i.rule === 'image-caption-duplicate-label');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ severity: 'warning', context: CTX });
    expect(w[0].detail).toContain('kettle-side.jpg');
  });
});
