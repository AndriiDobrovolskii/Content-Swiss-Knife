/**
 * image-placeholder.ts
 *
 * US-5.1: the shared core of the `[file-name.ext]` image-placeholder step. Pure, provider-free and
 * store-agnostic (NFR-6: no store or locale value lives here). It owns
 *
 *   - the marker grammar (OD-9: lowercase letters, digits and hyphens, `.jpg` or `.webp`) and the
 *     extraction of markers from text;
 *   - the manifest matcher (FR-2);
 *   - the figure parts every placement is built from (FR-4, FR-14, FR-21): the one builder that turns
 *     a manifest entry's three native-Ukrainian Vision texts into alt and caption;
 *   - the placement bookkeeping both the Doc step and the HTML step share, so the two cannot drift;
 *   - the Ukrainian user-facing messages (FR-9, FR-17, FR-18).
 *
 * The Doc step lives in image-placeholder-doc.ts, the HTML step in image-placeholder-html.ts and the
 * dropped-marker validator in image-placeholder-validate.ts.
 */
import type { ImageManifestEntry } from '../app/types';
import type { ValidationIssue } from './output-validator';

/**
 * A marker as the user types it into the Original Description. Case-sensitive on purpose (OD-17):
 * a re-cased or space-split string is ordinary text (FR-10) and is counted as a dropped marker by the
 * FR-17 rule rather than "repaired" here. Global, so callers must go through `matchAll` or reset
 * `lastIndex`; `extractPlaceholders` does.
 */
export const PLACEHOLDER_RE = /\[([a-z0-9-]+\.(?:jpg|webp))\]/g;

/** File names (without brackets) of every exact-grammar marker in `text`, in order, duplicates kept. */
export function extractPlaceholders(text: string): string[] {
  return Array.from(text.matchAll(PLACEHOLDER_RE), m => m[1]);
}

/** A manifest entry the step may place: analysed (or at least not failed) and with an output file. */
export function isUsableEntry(entry: ImageManifestEntry): boolean {
  return entry.status !== 'error'
    && entry.status !== 'pending'
    && entry.status !== 'analyzing'
    && (entry.urlFilename ?? '').trim() !== '';
}

/**
 * The first usable entry whose `originalFilename` equals the marker's file name (FR-2). The lookup key
 * is the ORIGINAL name: a `[x.webp]` marker matches although the output file ends `.jpg` (A-5).
 */
export function matchManifest(
  file: string,
  manifest: ImageManifestEntry[] | undefined,
): ImageManifestEntry | undefined {
  return (manifest ?? []).find(e => e.originalFilename === file && isUsableEntry(e));
}

/**
 * The distinct marker files in the Original Description that match a usable upload, in order of first
 * appearance. Unmatched markers never raise the dropped rule (FR-9: they are warnings), and a mangled
 * marker is not extracted at all (FR-1, OQ-3: it is plain text, and the step will not see it).
 */
export function preExtractPlaceholders(
  description: string,
  manifest: ImageManifestEntry[] | undefined,
): string[] {
  const out: string[] = [];
  for (const file of extractPlaceholders(description ?? '')) {
    if (!out.includes(file) && matchManifest(file, manifest)) out.push(file);
  }
  return out;
}

export interface FigureParts {
  /** The output file name (`urlFilename`). */
  file: string;
  alt: string;
  /** The complete Figure.caption string: `<b>{label}</b> {description}`. */
  captionText: string;
  /** FR-21 bookkeeping read by `figureCaptionWarnings`: the label without its colon, lower-cased. */
  labelKey: string;
  /** True when the label is the FR-4 fallback label (exempt from the duplicate-label rule). */
  fallbackLabel: boolean;
  /** True when a recorded, non-empty field was rejected as not native (one warning per file). */
  notNative: boolean;
}

/** Options of the figure builder (A-15). */
export interface FigureBuildOptions {
  /**
   * The Cyrillic-presence proxy of FR-21 rules 1-3. On by default; the caller turns it off for a store
   * whose master locale is not Ukrainian. This module holds no locale or store value.
   */
  cyrillicCheck?: boolean;
}

const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const collapseWs = (s: string): string => s.replace(/\s+/g, ' ').trim();
export const stripTagsText = (s: string): string => s.replace(/<[^>]*>/g, '');

/** `desk-lamp.jpg` -> `desk lamp`. */
function humanName(file: string): string {
  return file.replace(/\.[^.]+$/, '').replace(/-/g, ' ').trim();
}

/** The Ukrainian fallback label of FR-4: the only generic label this step may write (A-14). */
const FALLBACK_LABEL = 'Зображення товару:';
/** Prefix that keeps alt different from the whole figcaption text (FR-4, H-4). */
const ALT_PREFIX = 'Фото: ';
/** Generic labels FR-21 rule 1 rejects, compared trimmed, without trailing colons, in lower case. */
const GENERIC_LABELS = new Set(['image', 'product image', 'зображення', 'зображення товару']);

/** The Cyrillic-letter proxy of FR-21 rules 1-3: a cheap check, not a language detector (A-14). */
const hasCyrillic = (s: string): boolean => /[\u0400-\u04FF]/.test(s);

/** The label without its trailing colon run, trimmed ('' when nothing is left). */
const labelCore = (raw: string): string => raw.trim().replace(/(?:\s*:)+\s*$/, '').trim();

/**
 * Alt, caption and file for one placement (FR-4, FR-21). Pure and deterministic; it never throws and
 * never reads the legacy English `altText` / `visionDescription` of the entry (A-16).
 *
 * - label: the recorded Ukrainian label with exactly one trailing colon; missing or empty gives the
 *   fallback label silently; a generic label, or (check on) one without a Cyrillic letter, gives the
 *   fallback label and marks the figure not native.
 * - description and alt: the recorded text trimmed; missing or empty gives the file name (the
 *   description with a full stop) silently; (check on) one without a Cyrillic letter does the same and
 *   marks the figure not native.
 * - alt never equals the whole figcaption text including the label: the Ukrainian `Фото: ` prefix is added.
 */
export function buildFigureParts(entry: ImageManifestEntry, opts: FigureBuildOptions = {}): FigureParts {
  const check = opts.cyrillicCheck ?? true;
  const name = humanName(entry.urlFilename);
  let notNative = false;

  /** A recorded text field: its trimmed value, or undefined when empty or (check on) not Cyrillic. */
  const usable = (raw: string | undefined): string | undefined => {
    const text = (raw ?? '').trim();
    if (text === '') return undefined;
    if (check && !hasCyrillic(text)) { notNative = true; return undefined; }
    return text;
  };

  const recordedCore = labelCore(entry.visionLabelUk ?? '');
  let label = FALLBACK_LABEL;
  let labelKey = '';
  let fallbackLabel = true;
  if (recordedCore !== '') {
    const key = recordedCore.toLowerCase();
    if (GENERIC_LABELS.has(key) || (check && !hasCyrillic(recordedCore))) {
      notNative = true;
    } else {
      label = `${recordedCore}:`;
      labelKey = key;
      fallbackLabel = false;
    }
  }

  const description = usable(entry.visionDescriptionUk) ?? `${name}.`;
  let alt = usable(entry.visionAltUk) ?? name;
  if (collapseWs(alt) === collapseWs(`${label} ${description}`)) alt = `${ALT_PREFIX}${alt}`;

  return {
    file: entry.urlFilename,
    alt,
    captionText: `<b>${escapeText(label)}</b> ${escapeText(description)}`,
    labelKey,
    fallbackLabel,
    notNative,
  };
}

/** The whole figcaption as plain text, for the lead-in-equals-caption comparison (FR-6). */
export function captionPlainText(parts: FigureParts): string {
  return collapseWs(stripTagsText(parts.captionText).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

/** `src` for a placed figure: base + brand folder + model folder + file; an empty base gives a relative path (A-3). */
export function figureSrc(
  imageBase: string,
  folders: { brandFolder?: string; modelFolder?: string },
  file: string,
): string {
  const brand = folders.brandFolder ? `${folders.brandFolder}/` : '';
  const model = folders.modelFolder ? `${folders.modelFolder}/` : '';
  return `${imageBase}${brand}${model}${file}`;
}

// -- Messages (user-facing QA messages are Ukrainian; the marker is written as it appears in the text) --

export const RULE_UNMATCHED = 'unmatched-image-placeholder';
export const RULE_NOT_PLACED = 'image-placeholder-not-placed';
export const RULE_DROPPED = 'dropped-image-placeholder';

export const unmatchedMessage = (file: string): string =>
  `Маркер [${file}] не відповідає жодному завантаженому зображенню. Маркер видалено з тексту.`;

export const notPlacedMessage = (file: string): string =>
  `Зображення [${file}] не вдалося розмістити на місці маркера (немає вступного абзацу або позиція не підходить для зображення). Маркер видалено з тексту.`;

/** The error raised while the repair ladder can still fix the loss (FR-17). Carries the real marker. */
export const droppedMessage = (file: string): string =>
  `Маркер [${file}] зображення зник або був спотворений у згенерованому тексті. Збережіть маркер у тексті дослівно.`;

/** FR-18: the warning that replaces the error once the ladder is exhausted. Verbatim text from the human. */
export const exhaustedMessage = (marker: string): string =>
  `ШІ не зміг зберегти маркер ${marker} у тексті. Зображення було перенесено в кінець опису. Будь ласка, перевірте його позицію.`;

export const RULE_NOT_NATIVE = 'image-caption-not-native';
export const RULE_DUPLICATE_LABEL = 'image-caption-duplicate-label';

/** FR-21: a recorded label, description or alt was not Ukrainian (or the label was generic); the fallback was used. */
export const notNativeMessage = (file: string): string =>
  `Підпис або альтернативний текст зображення [${file}] не є українським (або мітка надто загальна), тому замість нього використано запасний варіант за назвою файлу. Перевірте підпис зображення.`;

/** FR-21 rule 5: two marker figures share a label. Names only the later file. */
export const duplicateLabelMessage = (file: string, label: string): string =>
  `Мітка «${label}» зображення [${file}] збігається з міткою попереднього зображення. Текст залишено без змін, перевірте підписи.`;

export type PlaceholderWarning = Omit<ValidationIssue, 'context'>;

/**
 * FR-21 warnings for the marker figures of one document, given in document order: one
 * `image-caption-not-native` per figure that needed a fallback, and one `image-caption-duplicate-label`
 * for every figure whose label equals that of an earlier figure (the fallback label is exempt).
 * Pure; the figures are not modified and no label is reworded. Each figure's warnings depend only on
 * the figures before it, so a caller may append figures and keep the earlier warnings unchanged.
 */
export function figureCaptionWarnings(figures: readonly FigureParts[]): PlaceholderWarning[] {
  const warnings: PlaceholderWarning[] = [];
  const earlier = new Set<string>();
  for (const f of figures) {
    if (f.notNative) {
      warnings.push({ severity: 'warning', rule: RULE_NOT_NATIVE, detail: notNativeMessage(f.file) });
    }
    if (f.fallbackLabel) continue;
    if (earlier.has(f.labelKey)) {
      const label = /^<b>([\s\S]*?)<\/b>/.exec(f.captionText)?.[1] ?? f.labelKey;
      warnings.push({ severity: 'warning', rule: RULE_DUPLICATE_LABEL, detail: duplicateLabelMessage(f.file, label) });
    }
    earlier.add(f.labelKey);
  }
  return warnings;
}

export interface PlaceholderReport {
  /** Marker files found by the exact grammar in VISIBLE text carriers, matched or not. */
  seen: Set<string>;
  /** The figures this run built for markers, in document order (hosted first, then end-appended). */
  figures: FigureParts[];
  /** Distinct marker files that matched no usable upload (FR-9). */
  unmatched: string[];
  /** Distinct marker files whose matched image was not placed at a marker (FR-6). */
  notPlaced: string[];
  warnings: PlaceholderWarning[];
}

export function emptyReport(): PlaceholderReport {
  return { seen: new Set(), figures: [], unmatched: [], notPlaced: [], warnings: [] };
}

/**
 * Placement bookkeeping shared by the Doc and HTML steps. One instance per run; a step feeds it each
 * marker in document order and acts on what it returns.
 */
export class PlaceholderTracker {
  private readonly seen = new Set<string>();
  private readonly unmatched: string[] = [];
  /** Matched marker files in first-seen order, with the entry that matched. */
  private readonly matched = new Map<string, ImageManifestEntry>();
  private readonly placed = new Set<string>();
  /** The figures built at a marker, in the order the step visited them (document order). */
  private readonly placedParts: FigureParts[] = [];

  constructor(
    private readonly manifest: ImageManifestEntry[] | undefined,
    private readonly opts: FigureBuildOptions = {},
  ) {}

  /**
   * A marker in a HOSTING position. Returns the figure parts when the marker becomes a figure now,
   * `undefined` when its text is only removed: unmatched (FR-9), already placed by an earlier marker
   * (FR-5), or demoted for lack of a usable lead-in (FR-6, FR-13). `leadIn` is the plain text that
   * would precede the figure, or undefined when there is none.
   */
  visit(file: string, leadIn: string | undefined): FigureParts | undefined {
    this.seen.add(file);
    const entry = matchManifest(file, this.manifest);
    if (!entry) {
      if (!this.unmatched.includes(file)) this.unmatched.push(file);
      return undefined;
    }
    if (!this.matched.has(file)) this.matched.set(file, entry);
    if (this.placed.has(file)) return undefined;
    const parts = buildFigureParts(entry, this.opts);
    const lead = collapseWs(leadIn ?? '');
    if (lead === '' || lead === captionPlainText(parts)) return undefined;
    this.placed.add(file);
    this.placedParts.push(parts);
    return parts;
  }

  /** A marker in a NON-hosting position: always removed, never placed here. */
  visitNonHosting(file: string): void {
    this.visit(file, undefined);
  }

  /** Matched markers that were never placed at a marker, as `[marker file, figure parts]`, in first-seen order. */
  unplaced(): Array<[string, FigureParts, ImageManifestEntry]> {
    return [...this.matched]
      .filter(([file]) => !this.placed.has(file))
      .map(([file, entry]) => [file, buildFigureParts(entry, this.opts), entry]);
  }

  report(): PlaceholderReport {
    const unplaced = this.unplaced();
    const notPlaced = unplaced.map(([file]) => file);
    const figures = [...this.placedParts, ...unplaced.map(([, parts]) => parts)];
    return {
      seen: new Set(this.seen),
      figures,
      unmatched: [...this.unmatched],
      notPlaced,
      warnings: [
        ...this.unmatched.map(f => ({ severity: 'warning' as const, rule: RULE_UNMATCHED, detail: unmatchedMessage(f) })),
        ...notPlaced.map(f => ({ severity: 'warning' as const, rule: RULE_NOT_PLACED, detail: notPlacedMessage(f) })),
        ...figureCaptionWarnings(figures),
      ],
    };
  }
}

// -- Text helpers shared by both steps --

/** Splits `text` at exact-grammar markers: `segs.length === files.length + 1`. */
export function splitAtMarkers(text: string): { segs: string[]; files: string[] } {
  const segs: string[] = [];
  const files: string[] = [];
  let last = 0;
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    segs.push(text.slice(last, m.index));
    files.push(m[1]);
    last = (m.index ?? 0) + m[0].length;
  }
  segs.push(text.slice(last));
  return { segs, files };
}

/**
 * Joins the text before a removed marker with the text after it, leaving exactly one space where the
 * marker sat between two words and none before closing punctuation ("Text [x]." -> "Text.").
 */
export function joinAroundRemoved(left: string, right: string): string {
  const leftWs = /\s$/.test(left);
  const rightWs = /^\s/.test(right);
  if (leftWs && rightWs) return `${left.replace(/\s+$/, '')} ${right.replace(/^\s+/, '')}`;
  if (leftWs && /^[.,;:!?)\]]/.test(right)) return left.replace(/\s+$/, '') + right;
  return left + right;
}

/**
 * Removes every exact-grammar marker from a NON-hosting text carrier (bullet, heading, table cell...),
 * reporting each to the tracker. Text with no marker is returned unchanged, byte for byte.
 */
export function scrubNonHosting(text: string, tracker: PlaceholderTracker): string {
  const { segs, files } = splitAtMarkers(text);
  if (files.length === 0) return text;
  let out = segs[0];
  files.forEach((file, i) => {
    tracker.visitNonHosting(file);
    out = joinAroundRemoved(out, segs[i + 1]);
  });
  return out.trim();
}
