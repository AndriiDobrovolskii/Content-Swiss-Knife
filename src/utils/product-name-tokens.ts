/**
 * product-name-tokens.ts
 *
 * Tokenisation T of the US-7.1 token-preservation check (FR-5, OD-13 default). One tokeniser is
 * shared by the classifier and by both parts of the preservation check, so the typed name and the
 * generated text are always compared on the same terms.
 *
 * Pure functions: no model call, no clock, no randomness (NFR-5). Imports only the unit table;
 * it must never import a prompt module (keeps the task-a import-cycle spec green).
 */
import { LATIN_TO_CYRILLIC_UNITS } from './unit-tables';

export interface Token {
  text: string;
  /** True when a hard break (block boundary or sentence punctuation) follows this token. */
  hardBreakAfter: boolean;
}

export interface TokenizeOptions {
  /** Treat the input as HTML: strip tags, skip attributes/script/style, block boundaries break. */
  html?: boolean;
}

const BLOCK_TAGS = new Set([
  'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'tr', 'td', 'th',
  'caption', 'blockquote', 'dt', 'dd', 'dl', 'div', 'figure', 'figcaption', 'br',
  'thead', 'tbody', 'tfoot', 'section', 'article', 'header', 'footer', 'hr',
]);

const BREAK_MARK = '\u0001';
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** HTML to text with BREAK_MARK at every block boundary. Attributes and script/style are dropped. */
function htmlToBrokenText(html: string): string {
  const withoutBlocks = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, BREAK_MARK);
  const replaced = withoutBlocks.replace(TAG_RE, (_whole, name: string) =>
    BLOCK_TAGS.has(name.toLowerCase()) ? BREAK_MARK : '');
  return decodeEntities(replaced);
}

// ── Number and unit vocabulary ─────────────────────────────────────────────────────────────────

const stripDot = (s: string) => s.replace(/\.$/, '');

/** Every unit spelling (Latin key, uk, ru) mapped to one canonical (uk) form. */
const UNIT_CANONICAL = new Map<string, string>();
for (const [latin, m] of Object.entries(LATIN_TO_CYRILLIC_UNITS)) {
  const canon = stripDot(m.uk);
  UNIT_CANONICAL.set(latin, canon);
  UNIT_CANONICAL.set(canon, canon);
  if (m.ru) UNIT_CANONICAL.set(stripDot(m.ru), canon);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNIT_ALTERNATION = [...UNIT_CANONICAL.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRe)
  .join('|');
const NUMBER_UNIT_RE = new RegExp(`^(\\d+(?:[.,]\\d+)?)(${UNIT_ALTERNATION})$`, 'u');
const NUMBER_RE = /^\d+(?:[.,]\d+)?$/;

export function isNumberToken(token: string): boolean {
  return NUMBER_RE.test(token);
}

export function isUnitToken(token: string): boolean {
  return UNIT_CANONICAL.has(token);
}

/** `0.4mm` -> `['0.4', 'mm']`; any other token -> `[token]`. */
export function splitNumberUnit(token: string): string[] {
  const m = NUMBER_UNIT_RE.exec(token);
  return m ? [m[1], m[2]] : [token];
}

// ── Tokenisation ────────────────────────────────────────────────────────────────────────────────

const EDGE_PUNCT = '\\p{P}|';
const LEADING_RE = new RegExp(`^[${EDGE_PUNCT}]+`, 'u');
const TRAILING_RE = new RegExp(`[${EDGE_PUNCT}]+$`, 'u');
const HARD_BREAK_CHARS = /[,;:!?.()/|]/;
const OPENING_BRACKET_RE = /^[(\[{]/;

function tokenizeSegment(segment: string): Token[] {
  const out: Token[] = [];
  const raw = segment.split(/\s+/).filter(Boolean);
  for (const word of raw) {
    const lead = LEADING_RE.exec(word)?.[0] ?? '';
    if (OPENING_BRACKET_RE.test(word) && out.length > 0) out[out.length - 1].hardBreakAfter = true;
    const core = word.slice(lead.length);
    const trail = TRAILING_RE.exec(core)?.[0] ?? '';
    const text = core.slice(0, core.length - trail.length).normalize('NFC');
    const breaks = HARD_BREAK_CHARS.test(trail);
    if (!text) {
      // A bare punctuation token carries its break to the previous token.
      if (breaks && out.length > 0) out[out.length - 1].hardBreakAfter = true;
      continue;
    }
    const parts = splitNumberUnit(text);
    parts.forEach((part, i) => {
      out.push({ text: part, hardBreakAfter: i === parts.length - 1 ? breaks : false });
    });
  }
  return out;
}

export function tokenize(input: string, opts: TokenizeOptions = {}): Token[] {
  const text = opts.html ? htmlToBrokenText(input) : input;
  const out: Token[] = [];
  const segments = text.split(BREAK_MARK);
  segments.forEach((segment, idx) => {
    const tokens = tokenizeSegment(segment);
    if (tokens.length === 0) return;
    // A block boundary follows the last token of every segment except the final one.
    if (idx < segments.length - 1) tokens[tokens.length - 1].hardBreakAfter = true;
    out.push(...tokens);
  });
  // A boundary right after the last non-empty segment still counts for the tokens before it.
  return out;
}

/** FR-5 rule 3 for one token pair: NFC, case-sensitive, decimal separator and unit equivalence. */
export function tokensEqual(a: string, b: string): boolean {
  const x = a.normalize('NFC');
  const y = b.normalize('NFC');
  if (x === y) return true;
  if (isNumberToken(x) && isNumberToken(y)) return x.replace(',', '.') === y.replace(',', '.');
  const ux = UNIT_CANONICAL.get(x);
  const uy = UNIT_CANONICAL.get(y);
  return ux !== undefined && uy !== undefined && ux === uy;
}
