/**
 * description-metrics.ts - the pure metrics core of `tools/measure-description.ts` (US-9.1 FR-32, FR-33).
 *
 * Leaf module (D12): it has only type imports, so the CLI can load it under Node's native type stripping. The
 * parser and the deixis collector are PARAMETERS (`MeasureDeps`), the module reads no global DOM class at run time
 * and never imports `image-deixis.ts` for values.
 *
 * Metric definitions are the Specification's (FR-32). D-1 and D-2 follow FR-17, D-6 and D-10 were confirmed by the
 * owner earlier, and D-3, D-4, D-5, D-7 and the D-9 half were confirmed as written by the owner (H-OD10 answered,
 * 2026-10-18):
 *   D-1  deixis hits      = carrier instances (paragraph above / figcaption / alt) the injected collector reports.
 *   D-2  figures without a paragraph above (previous element sibling is not a <p>), and consecutive figures
 *        (previous element sibling is a <figure>); independent counts.
 *   D-3  word             = a whitespace-separated token containing a letter or a digit.
 *   D-4  prose block      = every <p> and <li> not inside a <figure>; a sentence ends at . ! ? or an ellipsis
 *        followed by whitespace and an uppercase letter, a digit, a guillemet or a double quote, or at the end of
 *        the block.
 *   D-5  mean and population standard deviation of words per sentence over all prose blocks.
 *   D-6  per-section count of sentences of at most 6 words, one entry per section after the first <h2> section
 *        and before the first top-level <hr> or <section>. Reported, never thresholded.
 *   D-7  hook word count = words of the first <p> in document order.
 *   D-8  count of the whole word "тож" (any case) plus "Тому" (capital Т) in the prose blocks.
 *   D-9  number tokens, normalisation and "absent from the input" (see `numberTokens`).
 *   D-10 the input side is the number tokens of every text given.
 * Soft items (FR-35) are reported and never change `hardViolations` (FR-33).
 */
import type { FigureDeixisHit } from './image-deixis';

/** The functions the module is given instead of importing them. */
export interface MeasureDeps {
  /** HTML text to Document (the browser's DOMParser in tests, linkedom in the CLI). */
  parse: (html: string) => Document;
  /** `collectFigureDeixisFromDocument` of `image-deixis.ts`. */
  collect: (doc: Document, locale: string) => FigureDeixisHit[];
}

export interface MeasureInput {
  /** The generated HTML. */
  html: string;
  /** Every text the script was given (description, specs, product name): the input side of D-9. */
  inputTexts: string[];
  locale: string;
}

export interface SoftItems {
  /** FR-35 item 1: the «тож» + «Тому» count is at most 2. */
  connectivesAtMostTwo: boolean;
  /** FR-35 item 2: mean sentence length is at least 12 AND the standard deviation is at least 5.5 (one item). */
  rhythmMeanAndSigma: boolean;
}

export interface DescriptionReport {
  deixisHits: number;
  deixisDetails: FigureDeixisHit[];
  figuresWithoutParagraphAbove: number;
  consecutiveFigures: number;
  connectiveCount: number;
  sentenceCount: number;
  meanSentenceWords: number;
  sigmaSentenceWords: number;
  hookWordCount: number;
  shortSentencesPerSection: number[];
  absentNumbers: string[];
  softItems: SoftItems;
  hardViolations: string[];
}

// ── D-3 word, D-4 sentence ───────────────────────────────────────────────────────────────────────────

/** D-3: tokens separated by whitespace (NBSP, thin and narrow spaces are whitespace) that hold a letter or a digit. */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter(token => /[\p{L}\p{N}]/u.test(token)).length;
}

/** D-4: the sentences of one prose block's text (whitespace runs collapsed first). Empty fragments are dropped. */
export function splitSentences(text: string): string[] {
  const collapsed = text.replace(/\s+/gu, ' ').trim();
  if (collapsed === '') return [];
  return collapsed.split(/(?<=[.!?…])\s+(?=[\p{Lu}\d«"])/u).map(s => s.trim()).filter(s => s !== '');
}

type Block = Element;

/** D-4: every <p> and <li> that is not inside a <figure>, in document order. */
function proseBlocks(root: ParentNode): Block[] {
  return Array.from(root.querySelectorAll('p, li')).filter(el => !el.closest('figure'));
}

// ── D-9 numbers ──────────────────────────────────────────────────────────────────────────────────────

const NUMBER_RE = /\d+(?:[   ]\d{3})*(?:[.,]\d+)?/gu;

/** Remove the group spaces (space, U+00A0, U+202F) and use "." as the decimal separator. */
function normaliseNumber(token: string): string {
  return token.replace(/[   ]/gu, '').replace(',', '.');
}

/**
 * D-9: number tokens of `text`, normalised. A token directly adjacent (no space) to a letter on either side is
 * not a number ("L2", "3D", "4K", "Wi-Fi6", "H20" yield none).
 */
export function numberTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const start = m.index ?? 0;
    const before = start > 0 ? text[start - 1] : '';
    const after = text[start + m[0].length] ?? '';
    if (/\p{L}/u.test(before) || /\p{L}/u.test(after)) continue;
    out.push(normaliseNumber(m[0]));
  }
  return out;
}

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);
const SKIPPED_TAGS = new Set(['script', 'style', 'template', 'noscript']);

/**
 * The visible text of the document: text nodes only (attribute values such as src, href, alt and style are never
 * read), with a line break at every block boundary so that neighbouring table cells or paragraphs cannot glue
 * their digits into one token.
 */
function visibleText(root: Node): string {
  let out = '';
  const walk = (node: Node): void => {
    if (node.nodeType === 3) { out += node.nodeValue ?? ''; return; }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).tagName.toLowerCase();
    if (SKIPPED_TAGS.has(tag)) return;
    const block = BLOCK_TAGS.has(tag);
    if (block) out += '\n';
    for (const child of Array.from(node.childNodes)) walk(child);
    if (block) out += '\n';
  };
  walk(root);
  return out;
}

// ── D-6 sections ─────────────────────────────────────────────────────────────────────────────────────

/** The §3 sections as lists of sibling elements (D-6). Empty when the document has no <h2>. */
function section3Groups(body: Element): Element[][] {
  const groups: Element[][] = [];
  let seenFirstH2 = false;
  let current: Element[] | null = null;
  for (const child of Array.from(body.children)) {
    const tag = child.tagName.toLowerCase();
    if (seenFirstH2 && (tag === 'hr' || tag === 'section')) break;
    if (tag === 'h2') {
      if (!seenFirstH2) { seenFirstH2 = true; current = null; continue; }
      current = [];
      groups.push(current);
      continue;
    }
    if (current) current.push(child);
  }
  return groups;
}

function blocksOfSiblings(siblings: Element[]): Block[] {
  const blocks: Block[] = [];
  for (const el of siblings) {
    if (el.matches('p, li') && !el.closest('figure')) blocks.push(el);
    blocks.push(...proseBlocks(el));
  }
  return blocks;
}

// ── the report ───────────────────────────────────────────────────────────────────────────────────────

const CONNECTIVE_TOZH = /(?<!\p{L})тож(?!\p{L})/giu;
const CONNECTIVE_TOMU = /(?<!\p{L})Тому(?!\p{L})/gu;

/**
 * Measures one generated description. Throws on blank HTML or a missing parser result (the caller turns that into
 * a visible failure; zeros are never reported for input that could not be read).
 */
export function measureDescription(input: MeasureInput, deps: MeasureDeps): DescriptionReport {
  if (typeof input.html !== 'string' || input.html.trim() === '') throw new Error('The generated HTML is empty.');
  const doc = deps.parse(input.html);
  const body = doc?.body;
  if (!body) throw new Error('The generated HTML could not be parsed.');

  // D-1
  const deixisDetails = deps.collect(doc, input.locale);

  // D-2
  let figuresWithoutParagraphAbove = 0;
  let consecutiveFigures = 0;
  for (const figure of Array.from(doc.querySelectorAll('figure'))) {
    const above = figure.previousElementSibling;
    const aboveTag = above ? above.tagName.toLowerCase() : '';
    if (aboveTag !== 'p') figuresWithoutParagraphAbove++;
    if (aboveTag === 'figure') consecutiveFigures++;
  }

  // D-4, D-5, D-8
  const blocks = proseBlocks(body);
  const wordCounts: number[] = [];
  let connectiveCount = 0;
  for (const block of blocks) {
    const text = block.textContent ?? '';
    for (const sentence of splitSentences(text)) wordCounts.push(countWords(sentence));
    connectiveCount += (text.match(CONNECTIVE_TOZH) ?? []).length + (text.match(CONNECTIVE_TOMU) ?? []).length;
  }
  const sentenceCount = wordCounts.length;
  const meanSentenceWords = sentenceCount === 0 ? 0 : wordCounts.reduce((a, b) => a + b, 0) / sentenceCount;
  const sigmaSentenceWords = sentenceCount === 0
    ? 0
    : Math.sqrt(wordCounts.reduce((a, w) => a + (w - meanSentenceWords) ** 2, 0) / sentenceCount);

  // D-7
  const hook = doc.querySelector('p');
  const hookWordCount = hook ? countWords(hook.textContent ?? '') : 0;

  // D-6
  const shortSentencesPerSection = section3Groups(body).map(group => {
    let short = 0;
    for (const block of blocksOfSiblings(group)) {
      for (const sentence of splitSentences(block.textContent ?? '')) {
        const words = countWords(sentence);
        if (words >= 1 && words <= 6) short++;
      }
    }
    return short;
  });

  // D-9, D-10
  const inputSide = new Set(input.inputTexts.flatMap(text => numberTokens(typeof text === 'string' ? text : '')));
  const absentNumbers: string[] = [];
  for (const token of numberTokens(visibleText(body))) {
    if (!inputSide.has(token) && !absentNumbers.includes(token)) absentNumbers.push(token);
  }

  const hardViolations: string[] = [];
  if (deixisDetails.length > 0) hardViolations.push(`${deixisDetails.length} image-deixis hit(s)`);
  if (figuresWithoutParagraphAbove > 0) hardViolations.push(`${figuresWithoutParagraphAbove} figure(s) without a paragraph above`);
  if (consecutiveFigures > 0) hardViolations.push(`${consecutiveFigures} figure(s) directly after another figure`);
  if (absentNumbers.length > 0) hardViolations.push(`number(s) absent from the input: ${absentNumbers.join(', ')}`);

  return {
    deixisHits: deixisDetails.length,
    deixisDetails,
    figuresWithoutParagraphAbove,
    consecutiveFigures,
    connectiveCount,
    sentenceCount,
    meanSentenceWords,
    sigmaSentenceWords,
    hookWordCount,
    shortSentencesPerSection,
    absentNumbers,
    softItems: {
      connectivesAtMostTwo: connectiveCount <= 2,
      rhythmMeanAndSigma: meanSentenceWords >= 12 && sigmaSentenceWords >= 5.5,
    },
    hardViolations,
  };
}
