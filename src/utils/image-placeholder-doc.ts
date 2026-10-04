/**
 * image-placeholder-doc.ts
 *
 * US-5.1: replaces `[file-name.ext]` markers in a ProductDescriptionDoc with the matching uploaded
 * image. Deterministic and provider-free; runs on the uk-UA master once per generation attempt
 * (plan D4/D5).
 *
 * WHAT IT DOES. It walks the document's text carriers in document order. A marker inside a paragraph
 * (including the hook and the CTA text) is a hosting position: the paragraph is split and a `figure`
 * block with a new `figures[]` entry takes the marker's place. A marker anywhere else (a bullet, a
 * heading, a table cell...) is non-hosting: its text is removed and a warning raised. Unmatched
 * markers are removed with a warning. A model-placed figure for the same file is dropped when the
 * marker hosts the figure, with figure refs compacted so the schema's reference check still holds.
 * Matched images that could not be placed at a marker, and that the model did not place either, are
 * appended at the end of the document (OQ-5).
 *
 * WHAT IT NEVER DOES. It never touches text that is not an exact-grammar marker (FR-10), alt text,
 * captions, video fields, specs content or anything the schema forbids, and it never mutates its input.
 */
import type { ImageManifestEntry } from '../app/types';
import type { ApplicationsBlock, Block, Figure, ProductDescriptionDoc, Subsection } from '../domain/description-doc';
import {
  PlaceholderTracker, scrubNonHosting, splitAtMarkers, joinAroundRemoved, stripTagsText,
  type FigureBuildOptions, type FigureParts, type PlaceholderReport,
} from './image-placeholder';

type ParagraphBlock = Extract<Block, { kind: 'paragraph' }>;
type FigureBlock = Extract<Block, { kind: 'figure' }>;

/** One section's lead-in memory: the plain text of the last paragraph seen in it (OQ-4). */
interface SectionState {
  lastPara: string | undefined;
}

const OPEN_CLOSE_INLINE = /<(\/?)(b|strong)>/g;

/** Inline tags still open at the end of `raw`, outermost first. */
function openInlineTags(raw: string): string[] {
  const stack: string[] = [];
  for (const m of raw.matchAll(OPEN_CLOSE_INLINE)) {
    if (m[1] === '') stack.push(m[2]);
    else if (stack[stack.length - 1] === m[2]) stack.pop();
  }
  return stack;
}

/** A half of a split paragraph, trimmed and balanced; null when it holds no visible text. */
function finishHalf(raw: string): string | null {
  const body = raw.trim();
  const closers = openInlineTags(body).reverse().map(t => `</${t}>`).join('');
  const text = body + closers;
  return stripTagsText(text).trim() === '' ? null : text;
}

const paragraphBlock = (text: string): ParagraphBlock => ({ kind: 'paragraph', text });

/**
 * Rewrites every block list of the document in document order. The callback returns the list to
 * keep; blocks inside it are shared with the input (the caller owns a clone).
 */
function rewriteBlockLists(
  doc: ProductDescriptionDoc,
  fn: <T extends Block>(blocks: T[]) => T[],
): void {
  const sub = (s: Subsection): void => {
    s.blocks = fn(s.blocks);
    s.subsections?.forEach(sub);
  };
  if (doc.hookExtra) doc.hookExtra = fn(doc.hookExtra);
  if (doc.keyBenefits) doc.keyBenefits = fn(doc.keyBenefits);
  doc.functionality?.forEach(sub);
  if (doc.applications?.blocks) doc.applications.blocks = fn(doc.applications.blocks);
  if (doc.compatibility) sub(doc.compatibility);
  if (doc.cta.extra) doc.cta.extra = fn(doc.cta.extra);
}

/**
 * Drops the figures at `removeIdx` and the blocks that reference them, then renumbers every ref.
 * Refs below `firstNewRef` index the document's own `figures[]`; refs from `firstNewRef` up index
 * `newFigures`, which are appended after the surviving ones.
 */
function reindexFigures(
  doc: ProductDescriptionDoc,
  removeIdx: Set<number>,
  firstNewRef: number,
  newFigures: Figure[],
): void {
  const survivors = doc.figures.filter((_, i) => !removeIdx.has(i));
  const remap = (ref: number): number => {
    if (ref >= firstNewRef) return survivors.length + (ref - firstNewRef);
    let shift = 0;
    for (const r of removeIdx) if (r < ref) shift++;
    return ref - shift;
  };
  rewriteBlockLists(doc, blocks =>
    blocks
      .filter(b => !(b.kind === 'figure' && removeIdx.has(b.ref)))
      .map(b => (b.kind === 'figure' ? ({ ...b, ref: remap(b.ref) } as typeof b) : b)));
  doc.figures = [...survivors, ...newFigures];
  if (doc.hookExtra?.length === 0) delete doc.hookExtra;
  if (doc.cta.extra?.length === 0) delete doc.cta.extra;
}

/** Splits one paragraph at its markers; see the module header. */
function processParagraph(
  text: string,
  st: SectionState,
  tracker: PlaceholderTracker,
  addFigure: (parts: FigureParts) => number,
): Array<ParagraphBlock | FigureBlock> {
  const { segs, files } = splitAtMarkers(text);
  if (files.length === 0) {
    if (stripTagsText(text).trim() !== '') st.lastPara = stripTagsText(text);
    return [paragraphBlock(text)];
  }

  const out: Array<ParagraphBlock | FigureBlock> = [];
  const push = (raw: string): void => {
    const piece = finishHalf(raw);
    if (piece === null) return;
    out.push(paragraphBlock(piece));
    st.lastPara = stripTagsText(piece);
  };

  let cur = segs[0];
  files.forEach((file, i) => {
    const next = segs[i + 1];
    const own = stripTagsText(cur);
    const parts = tracker.visit(file, own.trim() !== '' ? own : st.lastPara);
    if (!parts) {
      cur = joinAroundRemoved(cur, next);
      return;
    }
    const reopen = openInlineTags(cur).map(t => `<${t}>`).join('');
    push(cur);
    out.push({ kind: 'figure', ref: addFigure(parts) });
    cur = reopen + next.replace(/^\s+/, '');
  });
  push(cur);
  return out;
}

export interface ImagePlaceholderDocResult {
  doc: ProductDescriptionDoc;
  report: PlaceholderReport;
}

/**
 * Replaces markers in `doc` with figures from `manifest`. Returns a new document and a report; the
 * input is left untouched. A document with no marker comes back equal, with an empty report.
 * `opts.cyrillicCheck` (A-15, default on) switches the Cyrillic proxy of FR-21 for a non-Ukrainian master.
 */
export function applyImagePlaceholdersDoc(
  input: ProductDescriptionDoc,
  manifest: ImageManifestEntry[] | undefined,
  opts: FigureBuildOptions = {},
): ImagePlaceholderDocResult {
  const doc = structuredClone(input);
  const originalCount = doc.figures.length;
  const tracker = new PlaceholderTracker(manifest, opts);
  const newFigures: Figure[] = [];
  const addFigure = (parts: FigureParts): number => {
    newFigures.push({ file: parts.file, alt: parts.alt, caption: parts.captionText });
    return originalCount + newFigures.length - 1;
  };
  const scrub = (t: string): string => scrubNonHosting(t, tracker);

  const processList = (blocks: Block[], st: SectionState): Block[] =>
    blocks.flatMap((b): Block[] => {
      if (b.kind === 'paragraph') return processParagraph(b.text, st, tracker, addFigure);
      if (b.kind === 'bullets') {
        return [{ ...b, items: b.items.map(it => ({ ...it, lead: scrub(it.lead), text: scrub(it.text) })) }];
      }
      return [b];
    });

  const processSubsection = (s: Subsection, st: SectionState): void => {
    s.heading = scrub(s.heading);
    s.blocks = processList(s.blocks, st);
    s.subsections?.forEach(n => processSubsection(n, st));
  };

  /** The hook and the CTA hold their text in a bare string; the blocks after it live in an extra list. */
  const processCarrier = (
    text: string,
    extra: ApplicationsBlock[] | undefined,
  ): { text: string; extra: ApplicationsBlock[] } => {
    const list = processList([paragraphBlock(text), ...(extra ?? [])], { lastPara: undefined }) as ApplicationsBlock[];
    const [first, ...rest] = list;
    return first?.kind === 'paragraph' ? { text: first.text, extra: rest } : { text: '', extra: list };
  };

  // §1 hook
  {
    const r = processCarrier(doc.hook, doc.hookExtra);
    doc.hook = r.text;
    if (r.extra.length > 0 || doc.hookExtra) doc.hookExtra = r.extra;
  }
  // §2
  doc.killerSpecs?.forEach(k => {
    k.label = scrub(k.label);
    k.value = scrub(k.value);
    k.why = scrub(k.why);
  });
  if (doc.keyBenefits) doc.keyBenefits = processList(doc.keyBenefits, { lastPara: undefined });
  // §3
  doc.functionality?.forEach(s => processSubsection(s, { lastPara: undefined }));
  // §4
  if (doc.applications) {
    doc.applications.heading = scrub(doc.applications.heading);
    if (doc.applications.blocks) {
      doc.applications.blocks = processList(doc.applications.blocks, { lastPara: undefined }) as ApplicationsBlock[];
    }
    doc.applications.items.forEach(it => {
      it.scenario = scrub(it.scenario);
      it.text = scrub(it.text);
    });
  }
  // §5
  if (doc.compatibility) processSubsection(doc.compatibility, { lastPara: undefined });
  // §6
  if (doc.packageContents) {
    doc.packageContents.heading = scrub(doc.packageContents.heading);
    doc.packageContents.items = doc.packageContents.items.map(scrub);
  }
  // §7
  if (doc.specs) {
    doc.specs.heading = scrub(doc.specs.heading);
    doc.specs.categories.forEach(c => {
      c.title = scrub(c.title);
      c.rows.forEach(row => {
        row.label = scrub(row.label);
        row.value = Array.isArray(row.value) ? row.value.map(scrub) : scrub(row.value);
      });
    });
  }
  // §9
  doc.cta.heading = scrub(doc.cta.heading);
  {
    const r = processCarrier(doc.cta.text, doc.cta.extra);
    doc.cta.text = r.text;
    if (r.extra.length > 0 || doc.cta.extra) doc.cta.extra = r.extra;
  }

  // A hosting marker replaces the model's own figure for the same file (FR-5).
  const placedFiles = new Set(newFigures.map(f => f.file));
  const removeIdx = new Set<number>();
  doc.figures.forEach((f, i) => { if (placedFiles.has(f.file)) removeIdx.add(i); });

  // OQ-5: a matched image that was not placed at a marker and that the model did not place either
  // goes to the end of the document. This is the only deterministic append, and only for marker-derived images.
  for (const [, parts] of tracker.unplaced()) {
    if (doc.figures.some(f => f.file === parts.file)) continue;
    doc.cta.extra = [...(doc.cta.extra ?? []), { kind: 'figure', ref: addFigure(parts) }];
  }

  if (newFigures.length > 0 || removeIdx.size > 0) reindexFigures(doc, removeIdx, originalCount, newFigures);
  return { doc, report: tracker.report() };
}

/** Removes every figure for `file` (and its blocks), compacting refs. Returns a new document. */
export function removeFiguresByFileDoc(input: ProductDescriptionDoc, file: string): ProductDescriptionDoc {
  const doc = structuredClone(input);
  const removeIdx = new Set<number>();
  doc.figures.forEach((f, i) => { if (f.file === file) removeIdx.add(i); });
  if (removeIdx.size > 0) reindexFigures(doc, removeIdx, doc.figures.length, []);
  return doc;
}

/**
 * The Doc end-append primitive (OQ-5): a `figure` block at the end of `cta.extra`, right after the CTA
 * text. Any existing figure for the same file is removed first so the image appears exactly once.
 * Returns a new document.
 */
export function appendFigureAtEndDoc(input: ProductDescriptionDoc, parts: FigureParts): ProductDescriptionDoc {
  const doc = removeFiguresByFileDoc(input, parts.file);
  const ref = doc.figures.length;
  doc.cta.extra = [...(doc.cta.extra ?? []), { kind: 'figure', ref }];
  doc.figures = [...doc.figures, { file: parts.file, alt: parts.alt, caption: parts.captionText }];
  return doc;
}

