/**
 * image-placeholder-html.ts
 *
 * US-5.1: replaces `[file-name.ext]` markers in generated HTML (the legacy, non-Doc path) with the
 * matching uploaded image. The twin of image-placeholder-doc.ts, working on a string.
 *
 * It is a tag-aware text walk, not a DOM round trip: only TEXT is ever read, so a marker inside an
 * attribute, a `<meta>` tag, a comment, JSON-LD, `<script>` or `<style>` is not visible text and is
 * left alone and unreported (plan-review binding note 2). Output is the input with only the touched
 * paragraphs rewritten, so a document with no visible marker comes back byte-identical (FR-11).
 *
 * Hosting = text inside a `<p>`. A paragraph is split into `<p>`, `<figure>`, `<p>` so a figure never
 * nests inside a paragraph. Every other text (headings, list items, table cells, loose text) is
 * non-hosting: the marker is removed with a warning. The lead-in of a figure is the text before the
 * marker in its own paragraph, or the nearest preceding paragraph in the same section; a section
 * boundary is any `<h1>`, `<h2>`, `<hr>`, `<section>` or `</section>` (OQ-4; `<h3>` is not one).
 */
import type { ImageManifestEntry } from '../app/types';
import {
  PlaceholderTracker, PLACEHOLDER_RE, figureSrc, joinAroundRemoved, scrubNonHosting, splitAtMarkers,
  stripTagsText, type FigureBuildOptions, type FigureParts, type PlaceholderReport,
} from './image-placeholder';
import { wrapImageFigures } from './image-figure';

export interface HtmlFolders {
  brandFolder?: string;
  modelFolder?: string;
}

const VOID_TAGS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'track']);
/** A `<p>` nested in one of these is left alone: splitting it would not produce valid markup. */
const NON_HOSTING_CONTAINERS = new Set(['li', 'td', 'th', 'caption', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'dt', 'dd']);
const BOUNDARY_TAGS = new Set(['h1', 'h2', 'hr', 'section']);

const TOKEN_RE =
  /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-zA-Z](?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+|</gi;

interface TagInfo {
  name: string;
  closing: boolean;
  selfClosing: boolean;
}

function tagInfo(token: string): TagInfo | undefined {
  const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(token);
  if (!m) return undefined;
  const name = m[2].toLowerCase();
  return { name, closing: m[1] === '/', selfClosing: /\/>$/.test(token) || VOID_TAGS.has(name) };
}

const isTag = (t: string): boolean => t.startsWith('<') && /^<\/?[a-zA-Z]/.test(t) && !/^<(script|style)\b/i.test(t);
const isOpaque = (t: string): boolean => t.startsWith('<!--') || /^<(script|style)\b/i.test(t);
const isText = (t: string): boolean => !t.startsWith('<') || t === '<';

const escAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The canonical figure for one placement, normalised by the same pass the legacy pipeline runs later. */
function buildFigureHtml(parts: FigureParts, imageBase: string, folders: HtmlFolders): string {
  const src = figureSrc(imageBase, folders, parts.file);
  return wrapImageFigures(
    `<figure><img src="${escAttr(src)}" alt="${escAttr(parts.alt)}"><figcaption>${parts.captionText}</figcaption></figure>`,
  );
}

function srcBasename(imgTag: string): string | undefined {
  const m = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(imgTag);
  const value = m?.[1] ?? m?.[2];
  return value === undefined ? undefined : value.split(/[?#]/)[0].split('/').pop();
}

const hasImageFor = (html: string, file: string): boolean =>
  Array.from(html.matchAll(/<img\b[^>]*>/gi)).some(m => srcBasename(m[0]) === file);

/** Removes every `<figure>` or bare `<img>` that shows `file`. Used when a marker takes over the image (FR-5, Q-B). */
export function removeFiguresByFileHtml(html: string, file: string): string {
  return html
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure\s*>/gi, f => (hasImageFor(f, file) ? '' : f))
    .replace(/<img\b[^>]*>/gi, t => (srcBasename(t) === file ? '' : t));
}

/**
 * The HTML end-append primitive (OQ-5, review F-4): inserts the built figure after the last visible
 * block and before any trailing `<script>`, `<style>`, `<meta>`, `<link>` or comment block, so JSON-LD
 * stays last. The caller decides whether an image for the file already exists.
 */
export function appendFigureAtEndHtml(
  html: string,
  parts: FigureParts,
  imageBase: string,
  folders: HtmlFolders,
): string {
  let head = html;
  for (;;) {
    head = head.replace(/\s+$/, '');
    const lower = head.toLowerCase();
    let start = -1;
    if (lower.endsWith('</script>')) start = lower.lastIndexOf('<script');
    else if (lower.endsWith('</style>')) start = lower.lastIndexOf('<style');
    else if (head.endsWith('-->')) start = head.lastIndexOf('<!--');
    else {
      const m = /<(?:meta|link)\b[^>]*>$/i.exec(head);
      if (m) start = m.index;
    }
    if (start < 0) break;
    head = head.slice(0, start);
  }
  return head + buildFigureHtml(parts, imageBase, folders) + html.slice(head.length);
}

const sentinel = (n: number): string => `\u0000FIG${n}\u0000`;

interface Ctx {
  tracker: PlaceholderTracker;
  figures: string[];
  lastPara: string | undefined;
  imageBase: string;
  folders: HtmlFolders;
}

/** Rewrites one `<p>`: `open` is its opening tag, `inner` the tokens between it and `</p>`. */
function processParagraph(open: string, inner: string[], ctx: Ctx): string[] {
  const plain = stripTagsText(inner.filter(isText).join(''));
  const hasMarker = inner.some(t => isText(t) && Array.from(t.matchAll(PLACEHOLDER_RE)).length > 0);
  if (!hasMarker) {
    if (plain.trim() !== '') ctx.lastPara = plain;
    return [open, ...inner, '</p>'];
  }

  const out: string[] = [];
  /** Opening tags of the inline elements open at the current point, outermost first. */
  const openStack: Array<{ name: string; token: string }> = [];
  let cur = '';

  const finish = (raw: string): string | null => {
    const body = raw.trim();
    const closers = [...openStack].reverse().map(e => `</${e.name}>`).join('');
    const text = body + closers;
    const visible = stripTagsText(text).trim() !== '' || /<(?:img|iframe|video|figure)\b/i.test(text);
    return visible ? text : null;
  };
  const emit = (raw: string): void => {
    const text = finish(raw);
    if (text === null) return;
    out.push(`${open}${text}</p>`);
    ctx.lastPara = stripTagsText(text);
  };

  for (const tok of inner) {
    if (!isText(tok)) {
      const info = isTag(tok) ? tagInfo(tok) : undefined;
      if (info && !info.selfClosing) {
        if (!info.closing) openStack.push({ name: info.name, token: tok });
        else {
          const at = openStack.map(e => e.name).lastIndexOf(info.name);
          if (at >= 0) openStack.splice(at);
        }
      }
      cur += tok;
      continue;
    }
    const { segs, files } = splitAtMarkers(tok);
    cur += segs[0];
    files.forEach((file, i) => {
      const next = segs[i + 1];
      const own = stripTagsText(cur);
      const parts = ctx.tracker.visit(file, own.trim() !== '' ? own : ctx.lastPara);
      if (!parts) {
        cur = joinAroundRemoved(cur, next);
        return;
      }
      const reopen = openStack.map(e => e.token).join('');
      emit(cur);
      ctx.figures.push(buildFigureHtml(parts, ctx.imageBase, ctx.folders));
      out.push(sentinel(ctx.figures.length - 1));
      cur = reopen + next.replace(/^\s+/, '');
    });
  }
  emit(cur);
  return out;
}

export interface ImagePlaceholderHtmlResult {
  html: string;
  report: PlaceholderReport;
}

/**
 * Replaces markers in `html` with figures from `manifest`. `imageBase` and `folders` build the `src`;
 * an empty base yields a relative path. A document with no visible marker is returned unchanged.
 * `opts.cyrillicCheck` (A-15, default on) switches the Cyrillic proxy of FR-21 for a non-Ukrainian master.
 */
export function applyImagePlaceholdersHtml(
  html: string,
  manifest: ImageManifestEntry[] | undefined,
  imageBase: string,
  folders: HtmlFolders,
  opts: FigureBuildOptions = {},
): ImagePlaceholderHtmlResult {
  const tracker = new PlaceholderTracker(manifest, opts);
  const ctx: Ctx = { tracker, figures: [], lastPara: undefined, imageBase, folders };
  const tokens = html.match(TOKEN_RE) ?? [];
  const stack: string[] = [];
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (isOpaque(tok)) { out.push(tok); continue; }
    if (isText(tok)) { out.push(scrubNonHosting(tok, tracker)); continue; }
    const info = tagInfo(tok);
    if (!info) { out.push(tok); continue; }

    if (!info.closing && info.name === 'p' && !info.selfClosing && !stack.some(n => NON_HOSTING_CONTAINERS.has(n))) {
      let j = i + 1;
      while (j < tokens.length && !(isTag(tokens[j]) && tagInfo(tokens[j])?.name === 'p')) j++;
      const closed = j < tokens.length && tagInfo(tokens[j])?.closing === true;
      if (closed) {
        out.push(...processParagraph(tok, tokens.slice(i + 1, j), ctx));
        i = j;
        continue;
      }
    }

    if (BOUNDARY_TAGS.has(info.name)) ctx.lastPara = undefined;
    if (!info.selfClosing) {
      if (!info.closing) stack.push(info.name);
      else {
        const at = stack.lastIndexOf(info.name);
        if (at >= 0) stack.splice(at);
      }
    }
    out.push(tok);
  }

  const report = tracker.report();
  if (report.seen.size === 0) return { html, report };

  let result = out.join('');
  // A hosting marker replaces the model's own figure for the same file (FR-5).
  for (const fig of ctx.figures) {
    const file = /\bsrc\s*=\s*"([^"]*)"/.exec(fig)?.[1].split('/').pop();
    if (file) result = removeFiguresByFileHtml(result, file);
  }
  result = result.replace(/\u0000FIG(\d+)\u0000/g, (_, n: string) => ctx.figures[Number(n)]);

  // OQ-5: a matched image not placed at a marker and not placed by the model either goes to the end.
  for (const [, parts] of tracker.unplaced()) {
    if (hasImageFor(result, parts.file)) continue;
    result = appendFigureAtEndHtml(result, parts, imageBase, folders);
  }
  return { html: result, report };
}
