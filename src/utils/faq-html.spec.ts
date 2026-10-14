/**
 * faq-html.spec.ts — US-8.1 T3: `convertStrongToB` and `validateFaqShape` (AC-7, AC-8, AC-9; FR-7,
 * FR-8, FR-9, FR-22, FR-23).
 *
 * TABLE A SPEC, OWNED BY T3. The module `./faq-html` does not exist yet, so this file is RED BY ABSENT
 * MODULE, BY DESIGN (task breakdown, constraint 4): vitest reports "Failed to resolve import
 * './faq-html'" and `tsc` reports TS2307 in this file only.
 *
 * Signatures (fixed by the task breakdown, T3):
 *   FAQ_ALLOWED_ELEMENTS: ReadonlySet<string>    // 'h3','p','b','ul','li'
 *   FAQ_SHAPE_RULES: readonly string[]           // the five rule ids
 *   convertStrongToB(html): string
 *   validateFaqShape(html, context): ValidationIssue[]   // every issue: severity 'error', no `path`,
 *                                                        // `context` = the argument
 *
 * Every assertion is written from the Specification: FR-7 (rename only, total, idempotent, attributes
 * untouched), FR-8 (bold lead sentence untouched), FR-9 (well-formed, only h3/p/b/ul/li, begins with an
 * <h3>, no attributes; empty is not evaluated), FR-22 (no Markdown, no <br>), FR-23 (no itemtype).
 */
import { describe, it, expect } from 'vitest';
import { convertStrongToB, validateFaqShape, FAQ_ALLOWED_ELEMENTS, FAQ_SHAPE_RULES } from './faq-html';

const CTX = 'FAQ (pl-PL)';
const VALID = '<h3>Czy potrzebny jest podgrzewany stół?</h3><p><b>Tak, zalecany.</b> Rozgrzej stół do 60 °C.</p>'
  + '<h3>Jaką dyszę wybrać?</h3><p>Do szybkości:</p><ul><li><b>0,4 mm:</b> szybkość;</li><li><b>0,2 mm:</b> detale.</li></ul>';
const rules = (html: string) => validateFaqShape(html, CTX).map(i => i.rule);

describe('the exported contract constants', () => {
  it('FAQ_ALLOWED_ELEMENTS is exactly h3, p, b, ul, li (AC-9)', () => {
    expect([...FAQ_ALLOWED_ELEMENTS].sort()).toEqual(['b', 'h3', 'li', 'p', 'ul']);
  });
  it('FAQ_SHAPE_RULES names the five shape rules', () => {
    expect([...FAQ_SHAPE_RULES].sort()).toEqual([
      'faq-attribute-present', 'faq-element-not-allowed', 'faq-markdown-syntax', 'faq-must-start-with-h3', 'faq-not-well-formed',
    ]);
  });
});

describe('convertStrongToB — AC-7 / FR-7: a deterministic tag rename, total and idempotent', () => {
  it('renames an opening and a closing <strong>, keeping the emphasised text inside <b>', () => {
    expect(convertStrongToB('<p><strong>Yes, it works.</strong> More.</p>')).toBe('<p><b>Yes, it works.</b> More.</p>');
  });

  it('matches the tag name case-insensitively', () => {
    expect(convertStrongToB('<p><STRONG>A</STRONG> <Strong>B</Strong></p>')).toBe('<p><b>A</b> <b>B</b></p>');
  });

  it('leaves attributes exactly as they were (OD-7): the rename never adds or removes one', () => {
    expect(convertStrongToB('<p><strong class="x" id="y">A</strong></p>')).toBe('<p><b class="x" id="y">A</b></p>');
  });

  it('converts nested and repeated <strong> elements', () => {
    expect(convertStrongToB('<p><strong>A <strong>B</strong> C</strong> <strong>D</strong></p>'))
      .toBe('<p><b>A <b>B</b> C</b> <b>D</b></p>');
  });

  it('leaves an element that merely starts with the letters "strong" alone', () => {
    expect(convertStrongToB('<p><strongest>x</strongest></p>')).toBe('<p><strongest>x</strongest></p>');
  });

  it('does not touch the word "strong" in running text', () => {
    expect(convertStrongToB('<p>A strong and <b>bold</b> claim: STRONG.</p>')).toBe('<p>A strong and <b>bold</b> claim: STRONG.</p>');
  });

  it('is idempotent: converting the result again changes nothing', () => {
    const once = convertStrongToB('<p><strong>A</strong> <STRONG class="k">B</STRONG></p>');
    expect(convertStrongToB(once)).toBe(once);
  });

  it('is total: any input yields a string with no <strong> element and never throws', () => {
    const garbage = ['', '   ', '<strong', '<strong>', '</strong>', '<<strong>>', '<strong/>', 'plain text', '<p><strong>unclosed', '\u0000<strong>\n</strong>'];
    for (const g of garbage) {
      let out = '';
      expect(() => { out = convertStrongToB(g); }, JSON.stringify(g)).not.toThrow();
      expect(out, JSON.stringify(g)).not.toMatch(/<\/?strong[\s/>]/i);
    }
  });
});

describe('AC-8 / FR-8: a bold lead sentence in an answer is preserved byte for byte', () => {
  it('<p><b>Lead sentence.</b> Rest of the answer.</p> is unchanged by the conversion', () => {
    const html = '<p><b>Lead sentence.</b> Rest of the answer.</p>';
    expect(convertStrongToB(html)).toBe(html);
  });

  it('<p><strong>Lead.</strong> Rest.</p> becomes <p><b>Lead.</b> Rest.</p>: only the tag changes', () => {
    expect(convertStrongToB('<p><strong>Lead.</strong> Rest.</p>')).toBe('<p><b>Lead.</b> Rest.</p>');
  });

  it('a FAQ whose answers open with a bold lead sentence raises no shape issue', () => {
    expect(validateFaqShape('<h3>Q?</h3><p><b>Lead sentence.</b> Rest of the answer.</p>', CTX)).toEqual([]);
  });
});

describe('validateFaqShape — AC-9 / FR-9: a well-formed FAQ of h3, p, b, ul, li only', () => {
  it('a valid FAQ yields no issue', () => {
    expect(validateFaqShape(VALID, CTX)).toEqual([]);
  });

  it('leading whitespace before the first <h3> is allowed', () => {
    expect(validateFaqShape(`\n  ${VALID}\n`, CTX)).toEqual([]);
  });

  it('an unclosed tag is reported as faq-not-well-formed', () => {
    expect(rules('<h3>Q?</h3><p>Answer without a closing tag')).toContain('faq-not-well-formed');
    expect(rules('<h3>Q?</h3><ul><li>one<li>two</ul>')).toContain('faq-not-well-formed');
  });

  it('a mismatched tag is reported as faq-not-well-formed', () => {
    expect(rules('<h3>Q?</h3><p><b>x</p></b>')).toContain('faq-not-well-formed');
  });

  it('a closing tag that was never opened is reported as faq-not-well-formed', () => {
    expect(rules('<h3>Q?</h3><p>x</p></p>')).toContain('faq-not-well-formed');
  });

  it.each([
    ['<br>', '<h3>Q?</h3><p>line one<br>line two</p>'],
    ['<br/>', '<h3>Q?</h3><p>line one<br/>line two</p>'],
    ['<h2>', '<h3>Q?</h3><p>a</p><h2>Heading</h2>'],
    ['<div>', '<h3>Q?</h3><div><p>a</p></div>'],
    ['<DIV> (any letter case)', '<h3>Q?</h3><DIV><p>a</p></DIV>'],
    ['<hr>', '<h3>Q?</h3><p>a</p><hr>'],
    ['<section>', '<h3>Q?</h3><section><p>a</p></section>'],
    ['<ol>', '<h3>Q?</h3><ol><li>a</li></ol>'],
    ['<table>', '<h3>Q?</h3><table><tr><td>a</td></tr></table>'],
    ['<a>', '<h3>Q?</h3><p><a href="https://example.com">a</a></p>'],
    ['<i>', '<h3>Q?</h3><p><i>a</i></p>'],
  ])('an element outside h3/p/b/ul/li (%s) is reported as faq-element-not-allowed', (_name, html) => {
    expect(rules(html)).toContain('faq-element-not-allowed');
  });

  it('a <strong> alone is never a violation once the conversion has run (FR-7: it precedes this check)', () => {
    expect(rules(convertStrongToB('<h3>Q?</h3><p><strong>x</strong></p>'))).toEqual([]);
  });

  it.each([
    ['class on a paragraph', '<h3>Q?</h3><p class="faq-answer">a</p>'],
    ['itemtype (FR-23)', '<h3>Q?</h3><p itemscope itemtype="https://schema.org/Product">a</p>'],
    ['itemtype FAQPage', '<h3 itemprop="name" itemtype="https://schema.org/FAQPage">Q?</h3><p>a</p>'],
    ['id on a heading', '<h3 id="q1">Q?</h3><p>a</p>'],
    ['style on a bold', '<h3>Q?</h3><p><b style="color:red">a</b></p>'],
    ['a bold that carries an attribute', '<h3>Q?</h3><p><b class="x">a</b></p>'],
  ])('an attribute (%s) is reported as faq-attribute-present', (_name, html) => {
    expect(rules(html)).toContain('faq-attribute-present');
  });

  it('a <strong> that carried an attribute becomes a <b> that carries it, and THEN fails the attribute rule (FR-7: the rule belongs to FR-9 alone)', () => {
    const converted = convertStrongToB('<h3>Q?</h3><p><strong class="x">a</strong></p>');
    expect(converted).toBe('<h3>Q?</h3><p><b class="x">a</b></p>');
    expect(rules(converted)).toContain('faq-attribute-present');
  });

  it('a FAQ that does not start with an <h3> is reported as faq-must-start-with-h3', () => {
    expect(rules('<p>An answer with no question.</p>')).toContain('faq-must-start-with-h3');
    expect(rules('Some prose first.<h3>Q?</h3><p>a</p>')).toContain('faq-must-start-with-h3');
  });

  it.each([
    ['bold markers', '<h3>Q?</h3><p>This is **important** text.</p>'],
    ['a line-leading heading', '<h3>Q?</h3><p>a</p>\n## Another question\n<p>b</p>'],
    ['a fenced code block', '<h3>Q?</h3><p>a</p>\n```\ncode\n```\n'],
  ])('Markdown syntax (%s) is reported as faq-markdown-syntax (FR-22)', (_name, html) => {
    expect(rules(html)).toContain('faq-markdown-syntax');
  });

  it('ordinary FAQ text is not mistaken for Markdown: "#" mid-line, a single "*", backticks never fenced', () => {
    expect(validateFaqShape('<h3>Model #3?</h3><p>Rated 5* by users; part # 12; use the `Start` button.</p>', CTX)).toEqual([]);
  });

  it('an empty or whitespace-only text yields no issue: it is not evaluated by this requirement', () => {
    expect(validateFaqShape('', CTX)).toEqual([]);
    expect(validateFaqShape('   \n\t ', CTX)).toEqual([]);
  });

  it('every issue is an error with the caller context and no path (so the repair ladder is full regeneration)', () => {
    const issues = validateFaqShape('<p class="x">a<br></p>', CTX);
    expect(issues.length).toBeGreaterThanOrEqual(3);
    for (const i of issues) {
      expect(i.severity).toBe('error');
      expect(i.context).toBe(CTX);
      expect(i.path).toBeUndefined();
      expect(typeof i.detail).toBe('string');
      expect(i.detail.length).toBeGreaterThan(0);
    }
  });

  it('only the five contract rule ids are ever emitted', () => {
    const all = new Set<string>(FAQ_SHAPE_RULES);
    for (const html of ['<p class="x">a<br></p>', '<h3>Q</h3><p>**x**', '<h3>Q?</h3><div>a</div>', 'prose']) {
      for (const r of rules(html)) expect(all.has(r), r).toBe(true);
    }
  });

  it('is deterministic and pure: the same input twice gives the same issues', () => {
    const html = '<p class="x">a<br></p>';
    expect(validateFaqShape(html, CTX)).toEqual(validateFaqShape(html, CTX));
  });
});
