/**
 * faq-html.ts — US-8.1 T3: pure helpers for the single master FAQ's HTML.
 *
 * Two functions, both deterministic and free of DOM, clock and random calls (NFR-8):
 *
 *  - `convertStrongToB` (FR-7, FR-8) — the one HTML-level change the pipeline makes to the model's
 *    FAQ output: a tag-name rename `<strong>` -> `<b>`. Total, idempotent, attributes untouched, and
 *    an existing `<b>` (for example a bold lead sentence in an answer) is never touched.
 *  - `validateFaqShape` (FR-9, FR-22, FR-23) — the FAQ's own shape check, run after the conversion:
 *    well-formed, only `h3 p b ul li`, no attributes, starts with an `<h3>`, no Markdown.
 *
 * It lives in a sibling file because `output-validator.ts` is FROZEN (AGENTS.md §9). Only the
 * `ValidationIssue` TYPE is imported from there.
 *
 * Deliberately a hand-rolled, stack-based tokenizer and not `DOMParser`: a browser parser REPAIRS
 * unclosed and mismatched tags, which are exactly the defects this check must detect, and the logic
 * runner has no DOM.
 *
 * Every issue is severity 'error' and carries NO `path`, so the repair ladder resolves it to a full
 * regeneration of the FAQ (the only repair a malformed FAQ gets).
 */
import type { ValidationIssue } from './output-validator';

/** The only elements a FAQ may contain (FR-9). `<strong>` is not here: it is renamed to `<b>` first. */
export const FAQ_ALLOWED_ELEMENTS: ReadonlySet<string> = new Set(['h3', 'p', 'b', 'ul', 'li']);

const RULE_NOT_WELL_FORMED = 'faq-not-well-formed';
const RULE_ELEMENT_NOT_ALLOWED = 'faq-element-not-allowed';
const RULE_ATTRIBUTE_PRESENT = 'faq-attribute-present';
const RULE_MUST_START_WITH_H3 = 'faq-must-start-with-h3';
const RULE_MARKDOWN_SYNTAX = 'faq-markdown-syntax';

/** The five rule ids `validateFaqShape` can emit. */
export const FAQ_SHAPE_RULES: readonly string[] = [
  RULE_NOT_WELL_FORMED,
  RULE_ELEMENT_NOT_ALLOWED,
  RULE_ATTRIBUTE_PRESENT,
  RULE_MUST_START_WITH_H3,
  RULE_MARKDOWN_SYNTAX,
];

/** Elements that never take a closing tag; they are reported as not allowed but never pushed. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

/** Opening or closing `strong` tag head; the lookahead keeps `<strongest>` and a truncated `<strong` alone. */
const STRONG_TAG = /<(\/?)strong(?=[\s/>])/gi;

/** One tag: `<name attrs>`, `</name>`; quoted attribute values may contain `>`. */
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/** One exact permitted tag: no attributes, optional whitespace before ">" (the fail-closed check, B-1). */
const PERMITTED_TAG = /<\/?(?:h3|p|b|ul|li)\s*>/gi;

const MARKDOWN_BOLD =/\*\*[^*\n]+\*\*/;
const MARKDOWN_HEADING = /^[ \t]*#{1,6}[ \t]+\S/m;
const MARKDOWN_FENCE = /```/;

const MAX_DETAILS_PER_RULE = 3;

/**
 * Renames `<strong>` / `</strong>` to `<b>` / `</b>` (tag name only, case-insensitive). Attributes
 * and every other byte are left exactly as they were; the result contains no `<strong>` element, so
 * converting twice changes nothing.
 */
export function convertStrongToB(html: string): string {
  return html.replace(STRONG_TAG, '<$1b');
}

/**
 * Checks the shape of a FAQ (already converted by `convertStrongToB`). Empty or whitespace-only text
 * yields no issue — whether an empty FAQ is acceptable is not this function's question.
 *
 * Emits at most one issue per rule; its `detail` names the first few offenders.
 */
export function validateFaqShape(html: string, context: string): ValidationIssue[] {
  if (html.trim() === '') return [];

  const found = new Map<string, string[]>();
  const note = (rule: string, detail: string): void => {
    const list = found.get(rule) ?? [];
    list.push(detail);
    found.set(rule, list);
  };

  if (!/^\s*<h3(?=[\s/>])/i.test(html)) {
    note(RULE_MUST_START_WITH_H3, 'the FAQ must begin with an <h3> question');
  }

  const stack: string[] = [];
  TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG.exec(html)) !== null) {
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    const rest = match[3];
    const selfClosing = /\/\s*$/.test(rest);
    const attributes = rest.replace(/\/\s*$/, '').trim();

    if (!FAQ_ALLOWED_ELEMENTS.has(name)) {
      note(RULE_ELEMENT_NOT_ALLOWED, `<${closing ? '/' : ''}${name}> is not allowed (only h3, p, b, ul, li)`);
    }
    if (!closing && attributes !== '') {
      note(RULE_ATTRIBUTE_PRESENT, `<${name}> carries attributes`);
    }

    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at === -1) {
        if (!VOID_ELEMENTS.has(name)) note(RULE_NOT_WELL_FORMED, `</${name}> closes an element that was never opened`);
      } else {
        if (at !== stack.length - 1) {
          note(RULE_NOT_WELL_FORMED, `</${name}> arrives while <${stack[stack.length - 1]}> is still open`);
        }
        stack.length = at;
      }
    } else if (!selfClosing && !VOID_ELEMENTS.has(name)) {
      stack.push(name);
    }
  }
  if (stack.length > 0) {
    note(RULE_NOT_WELL_FORMED, `unclosed element(s): ${stack.map(n => `<${n}>`).join(', ')}`);
  }

  // Fail closed (security finding B-1): the pass above only sees tags it can tokenize. A tag with an
  // unpaired quote, a missing ">", a comment, a processing instruction or CDATA is invisible to it but a
  // browser would still build it. Once the exact permitted tags are gone no "<" may remain: a literal "<"
  // in text must be written as &lt;.
  if (html.replace(PERMITTED_TAG, '').includes('<')) {
    note(RULE_NOT_WELL_FORMED, 'markup that is not a plain <h3>, <p>, <b>, <ul> or <li> tag (use &lt; for a literal "<")');
  }

  if (MARKDOWN_BOLD.test(html)) note(RULE_MARKDOWN_SYNTAX, 'Markdown bold (**...**) must not appear in the FAQ');
  if (MARKDOWN_HEADING.test(html)) note(RULE_MARKDOWN_SYNTAX, 'a Markdown heading (# ...) must not appear in the FAQ');
  if (MARKDOWN_FENCE.test(html)) note(RULE_MARKDOWN_SYNTAX, 'a Markdown code fence must not appear in the FAQ');

  const issues: ValidationIssue[] = [];
  for (const rule of FAQ_SHAPE_RULES) {
    const details = found.get(rule);
    if (!details) continue;
    issues.push({
      severity: 'error',
      rule,
      detail: [...new Set(details)].slice(0, MAX_DETAILS_PER_RULE).join('; '),
      context,
    });
  }
  return issues;
}
