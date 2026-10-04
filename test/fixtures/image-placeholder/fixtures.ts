/**
 * fixtures.ts — hand-authored inputs for the US-5.1 image-placeholder specs.
 *
 * WHY A SEPARATE SET. `test/fixtures/corpus/` is two artifacts of the same product and is a pure
 * regression guard for the renderer; marker cases are authored here so the corpus stays unmoved
 * (implementation plan section 4). The base document is `v3BaseDoc()` from `../v4-docs` — reused,
 * not copied — so a marker case differs from a valid document in exactly the field a test mutates.
 *
 * v9 (Specification v9, FR-21, OD-25 = A): a marker figure takes its label, description and alt from the
 * three Ukrainian Vision fields of the manifest entry (visionLabelUk, visionDescriptionUk, visionAltUk).
 * The legacy English `visionDescription` (the English caption) and `altText` are deliberately kept
 * DIFFERENT, recognisable English strings, so a test that sees one of them in a marker figure has caught
 * a builder that still reads the wrong field (A-16).
 *
 * Nothing here asserts anything; every expected value lives in the spec that uses it, written from
 * the Story's acceptance criteria and the Specification, not from an implementation.
 */
import type { ImageManifestEntry } from '../../../src/app/types';
import type { Block, ProductDescriptionDoc } from '../../../src/domain/description-doc';
import { forEachBlockInOrder } from '../../../src/domain/description-doc';
import { v3BaseDoc } from '../v4-docs';

/** A store image base as STORE_REGISTRY carries it for a Doc-pipeline store. */
export const IMAGE_BASE = 'https://cdn.test/img/';
export const FOLDERS = { brandFolder: 'acme', modelFolder: 'lamp' } as const;

/** The legacy English fields. A marker figure must NEVER show these (A-16). */
export const LAMP_VISION = 'A desk lamp on a walnut table.';
export const LAMP_ALT = 'Desk lamp on a walnut table';

/** The three native-Ukrainian Vision texts of the lamp (FR-21). Label, description and alt all differ. */
export const LAMP_LABEL_UK = 'Лампа на столі:';
export const LAMP_DESC_UK = 'Настільна лампа стоїть на горіховому столі.';
export const LAMP_ALT_UK = 'Настільна лампа біля вікна на горіховому столі';
/** The Ukrainian fallback label of FR-4: the only generic label allowed (A-14). */
export const FALLBACK_LABEL = 'Зображення товару:';

/** A usable, analysed upload carrying the three Ukrainian Vision texts. */
export function entry(over: Partial<ImageManifestEntry> = {}): ImageManifestEntry {
  return {
    id: 'img-1',
    originalFilename: 'desk-lamp.jpg',
    urlFilename: 'desk-lamp.jpg',
    previewUrl: 'blob:preview-1',
    visionDescription: LAMP_VISION,
    altText: LAMP_ALT,
    visionLabelUk: LAMP_LABEL_UK,
    visionDescriptionUk: LAMP_DESC_UK,
    visionAltUk: LAMP_ALT_UK,
    order: 0,
    status: 'done',
    ...over,
  };
}

export const LAMP = entry();
export const KETTLE = entry({
  id: 'img-2',
  originalFilename: 'kettle-side.jpg',
  urlFilename: 'kettle-side.jpg',
  visionDescription: 'A steel kettle seen from the side.',
  altText: 'Steel kettle, side view',
  visionLabelUk: 'Чайник збоку:',
  visionDescriptionUk: 'Сталевий чайник, вигляд збоку.',
  visionAltUk: 'Сталевий чайник збоку на кухонній стільниці',
  order: 1,
});

export const MARKER = '[desk-lamp.jpg]';

/** A manifest entry as it existed before this Story: no Ukrainian fields at all (FR-21 failure path, NFR-12). */
export function legacyEntry(over: Partial<ImageManifestEntry> = {}): ImageManifestEntry {
  const { visionLabelUk: _l, visionDescriptionUk: _d, visionAltUk: _a, ...rest } = entry(over);
  return rest;
}

/** Deep copy so a test can mutate freely. */
export function baseDoc(): ProductDescriptionDoc {
  return structuredClone(v3BaseDoc());
}

/** The base document with its single functionality subsection replaced by these paragraph texts. */
export function docWithParagraphs(...texts: string[]): ProductDescriptionDoc {
  const doc = baseDoc();
  doc.functionality = [{ heading: 'Як працює лампа', blocks: texts.map(text => ({ kind: 'paragraph' as const, text })) }];
  return doc;
}

/** Every block in document order, through the model's own traversal. */
export function blocksInOrder(doc: ProductDescriptionDoc): Block[] {
  const out: Block[] = [];
  forEachBlockInOrder(doc, b => out.push(b));
  return out;
}

/** The `figures[].file` of each figure block, in document order. */
export function figureFilesInOrder(doc: ProductDescriptionDoc): string[] {
  return blocksInOrder(doc).flatMap(b => (b.kind === 'figure' ? [doc.figures[b.ref].file] : []));
}

/** The Cyrillic-letter proxy of FR-21 rules 1-3, written independently of the production helper. */
export const hasCyrillic = (s: string): boolean => /[Ѐ-ӿ]/.test(s);
export const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '');
export const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** A model-placed figure entry, recognisable by its caption. */
export const MODEL_CAPTION = 'MODEL-AUTHORED CAPTION';
export function modelFigure(file: string): ProductDescriptionDoc['figures'][number] {
  return { file, alt: 'model alt text', caption: `<b>Photo:</b> ${MODEL_CAPTION}` };
}
