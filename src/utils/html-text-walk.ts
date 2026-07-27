/**
 * html-text-walk.ts
 *
 * The one tag-aware HTML text traversal used by every deterministic post-processing pass.
 *
 * Lifted verbatim from number-format-fixer.ts, which has shipped this splitter since the
 * beginning; that module now calls it, so there is exactly one copy. Extracted because every
 * text-rewriting pass needs the same guarantee — transform visible text, never touch a URL —
 * and a second hand-rolled splitter is how a fixer eventually corrupts an href.
 *
 * Pure function, no LLM.
 */

/**
 * Applies `fn` to every text node and to the value of each attribute named in `attrs`, leaving
 * every other attribute (src, href, class, style, id) byte-identical.
 *
 * Known limitation, inherited and unchanged: does not handle `>` inside a quoted attribute value
 * (e.g. title="a > b"). Safe for LLM-generated product HTML, which does not emit such attributes.
 *
 * @param html  any HTML string
 * @param fn    the text transform; must be idempotent, since callers re-run these passes
 * @param attrs attribute names whose values are also transformed. Default ['alt'] preserves
 *              number-format-fixer's original behaviour exactly.
 */
export function mapHtmlText(
  html: string,
  fn: (text: string) => string,
  attrs: readonly string[] = ['alt'],
): string {
  const attrRe = new RegExp(`\\b(${attrs.join('|')})="([^"]*)"`, 'g');
  return html
    .split(/(<[^>]*>)/g)
    .map((segment, i) =>
      i % 2 === 0
        ? fn(segment)
        : segment.replace(attrRe, (_, name: string, value: string) => `${name}="${fn(value)}"`),
    )
    .join('');
}
