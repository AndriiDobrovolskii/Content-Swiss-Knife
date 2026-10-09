/**
 * product-name-tokens.spec.ts — US-7.1 T1 (FR-5 "Tokenisation T", OD-13 default).
 *
 * Written BEFORE `product-name-tokens.ts` exists (AGENTS.md §5): the module does not exist yet, so
 * this suite is red at import time. That is the intended TDD red for a NEW module; `so-builder`
 * creates it in T1.
 *
 * CONTRACT THIS SPEC PINS (the Specification fixes the behaviour; it does not fix the signature, so
 * TEST_WRITING owns this one — see docs/tests/US-7.1-test-strategy.md §"Signatures fixed here"):
 *
 *   interface Token { text: string; hardBreakAfter: boolean }
 *   tokenize(input: string, opts?: { html?: boolean }): Token[]
 *   tokensEqual(a: string, b: string): boolean          // FR-5 rule 3 for ONE token pair
 *
 * `hardBreakAfter` is meaningful for every token except the last of the input (what follows the
 * last token is outside the text). Assertions below never depend on the last token's flag.
 *
 * Every assertion is derived from FR-5 "Tokenisation T", not from an actual run.
 */
import { describe, it, expect } from 'vitest';
import { tokenize, tokensEqual } from './product-name-tokens';

const texts = (input: string, html = false) => tokenize(input, { html }).map(t => t.text);
const breaksAfter = (input: string, html = false) =>
  tokenize(input, { html }).map(t => t.hardBreakAfter);

describe('tokenize — whitespace split and edge punctuation (FR-5 rule 2)', () => {
  it('splits a plain name on whitespace, keeping every token in order', () => {
    expect(texts('Formlabs Form Studio 1 Resin Tank Pro'))
      .toEqual(['Formlabs', 'Form', 'Studio', '1', 'Resin', 'Tank', 'Pro']);
  });

  it('treats a non-breaking space as whitespace (normalizeSeoNumbers inserts one between number and unit)', () => {
    expect(texts('1,75 мм')).toEqual(['1,75', 'мм']);
  });

  it('strips leading and trailing punctuation from each token', () => {
    expect(texts('"Formlabs" (Pro) Tank,')).toEqual(['Formlabs', 'Pro', 'Tank']);
  });

  it('keeps a hyphen that sits inside a word', () => {
    expect(texts('Bambu X1-Carbon Combo')).toEqual(['Bambu', 'X1-Carbon', 'Combo']);
  });

  it('keeps a slash that sits inside a token (a model designator such as 32/300)', () => {
    expect(texts('XGRIDS L2 Pro 32/300 Standard')).toEqual(['XGRIDS', 'L2', 'Pro', '32/300', 'Standard']);
  });

  it('keeps a "." or "," between two digits as part of the number', () => {
    expect(texts('PLA 1.75 mm 1,75 mm')).toEqual(['PLA', '1.75', 'mm', '1,75', 'mm']);
  });
});

describe('tokenize — hard breaks from punctuation (FR-5 rule 2)', () => {
  it('puts a hard break after a token that ended with a comma', () => {
    // "PLA, 1.75 mm": the comma separates two ideas; PLA and 1.75 must not read as adjacent.
    const t = tokenize('PLA, 1.75 mm');
    expect(t.map(x => x.text)).toEqual(['PLA', '1.75', 'mm']);
    expect(t[0].hardBreakAfter).toBe(true);
    expect(t[1].hardBreakAfter).toBe(false);
  });

  it.each([',', ';', ':', '!', '?', '.', ')', '|'])(
    'puts a hard break after a token that ended with "%s"',
    (mark) => {
      const t = tokenize(`Alpha${mark} Beta Gamma`);
      expect(t.map(x => x.text)).toEqual(['Alpha', 'Beta', 'Gamma']);
      expect(t[0].hardBreakAfter).toBe(true);
      expect(t[1].hardBreakAfter).toBe(false);
    },
  );

  it('puts a hard break after a token followed by an opening bracket', () => {
    const t = tokenize('Studio (Pro) Tank');
    expect(t.map(x => x.text)).toEqual(['Studio', 'Pro', 'Tank']);
    expect(t[0].hardBreakAfter).toBe(true);
  });

  it('does NOT put a hard break after the decimal point inside a number', () => {
    const t = tokenize('PLA 1.75 mm');
    expect(t[1].text).toBe('1.75');
    expect(t[1].hardBreakAfter).toBe(false);
  });

  it('puts a hard break after a sentence-final "mm."', () => {
    const t = tokenize('Filament 1.75 mm. Next sentence');
    expect(t.map(x => x.text)).toEqual(['Filament', '1.75', 'mm', 'Next', 'sentence']);
    expect(t[2].hardBreakAfter).toBe(true);
  });

  it('puts no hard break between plain adjacent words', () => {
    expect(breaksAfter('Alpha Beta Gamma Delta').slice(0, 3)).toEqual([false, false, false]);
  });
});

describe('tokenize — number + unit split on a single token (FR-5 rule 2, OD-13)', () => {
  it.each([
    ['0.4mm', ['0.4', 'mm']],
    ['20W', ['20', 'W']],
    ['4mm', ['4', 'mm']],
    ['1kg', ['1', 'kg']],
  ])('splits the attached form "%s" into a number token and a unit token', (attached, expected) => {
    expect(texts(`Nozzle ${attached} Kit`)).toEqual(['Nozzle', ...expected, 'Kit']);
  });

  it('tokenises the spaced and the attached forms identically (the §4 space is never a violation)', () => {
    expect(texts('Nozzle 0.4mm Kit')).toEqual(texts('Nozzle 0.4 mm Kit'));
  });

  it.each(['3D', 'X1C', 'L2', 'F10'])(
    'does NOT split "%s" — it only resembles number+unit but is not number+table-unit',
    (token) => {
      expect(texts(`Item ${token} Kit`)).toEqual(['Item', token, 'Kit']);
    },
  );
});

describe('tokenize — HTML input (FR-5 rule 1)', () => {
  it('removes tags and keeps inline-tag text inside one run (no break at <b>, <i>, <span>, <a>)', () => {
    const t = tokenize('<b>Form</b> <span>Studio</span> <i>1</i> <a href="/x">Pro</a>', { html: true });
    expect(t.map(x => x.text)).toEqual(['Form', 'Studio', '1', 'Pro']);
    expect(t.slice(0, 3).every(x => !x.hardBreakAfter)).toBe(true);
  });

  // Each snippet is VALID HTML (so an implementation built on a DOM parser and one built on a tag
  // scanner see the same structure) and ends every listed block with a boundary and no whitespace.
  const BLOCK_SNIPPETS: [string, string, string[]][] = [
    ['p', 'Alpha<p>Beta</p>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h1', 'Alpha<h1>Beta</h1>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h2', 'Alpha<h2>Beta</h2>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h3', 'Alpha<h3>Beta</h3>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h4', 'Alpha<h4>Beta</h4>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h5', 'Alpha<h5>Beta</h5>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['h6', 'Alpha<h6>Beta</h6>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['div', 'Alpha<div>Beta</div>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['blockquote', 'Alpha<blockquote>Beta</blockquote>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['ul + li', 'Alpha<ul><li>Beta</li><li>Gamma</li></ul>Delta', ['Alpha', 'Beta', 'Gamma', 'Delta']],
    ['ol + li', 'Alpha<ol><li>Beta</li><li>Gamma</li></ol>Delta', ['Alpha', 'Beta', 'Gamma', 'Delta']],
    ['dl + dt + dd', 'Alpha<dl><dt>Beta</dt><dd>Gamma</dd></dl>Delta', ['Alpha', 'Beta', 'Gamma', 'Delta']],
    ['figure + figcaption', 'Alpha<figure><figcaption>Beta</figcaption></figure>Gamma', ['Alpha', 'Beta', 'Gamma']],
    ['table + caption + tr + th + td', 'Alpha<table><caption>Beta</caption><tbody><tr><th>Gamma</th><td>Delta</td></tr></tbody></table>Epsilon',
      ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']],
  ];

  it.each(BLOCK_SNIPPETS)('treats %s boundaries as hard breaks even with no whitespace around the tags', (_name, html, expected) => {
    const t = tokenize(html, { html: true });
    expect(t.map(x => x.text)).toEqual(expected);
    // Every token except the last is followed by a hard break: each word sits in its own block.
    expect(t.slice(0, -1).every(x => x.hardBreakAfter)).toBe(true);
  });

  it.each(['<br>', '<br/>', '<br />'])('treats %s as a hard break', (br) => {
    const t = tokenize(`Form Studio 1${br}Pro`, { html: true });
    expect(t.map(x => x.text)).toEqual(['Form', 'Studio', '1', 'Pro']);
    expect(t[2].hardBreakAfter).toBe(true);
  });

  it('separates "Form Studio 1" and "Pro" that sit in two paragraphs by a hard break', () => {
    const t = tokenize('<p>Form Studio 1</p><p>Pro</p>', { html: true });
    expect(t[2].text).toBe('1');
    expect(t[2].hardBreakAfter).toBe(true);
  });

  it('does not scan attribute values (alt, title, href, data-*)', () => {
    const html =
      '<img alt="Form Studio 1 Pro" title="Resin Tank" src="a.jpg" data-caption="Pro Pro">'
      + '<a href="https://example.com/Resin-Tank" data-x="Tank">Visible</a>';
    expect(texts(html, true)).toEqual(['Visible']);
  });

  it('does not scan <script> or <style> content', () => {
    const html = '<p>Alpha</p><script>var Pro = "Resin Tank";</script><style>.Pro{color:red}</style><p>Beta</p>';
    expect(texts(html, true)).toEqual(['Alpha', 'Beta']);
  });

  it('applies the same number+unit split to HTML text', () => {
    expect(texts('<p>Nozzle 0.4mm</p>', true)).toEqual(['Nozzle', '0.4', 'mm']);
  });
});

describe('tokensEqual — FR-5 rule 3 (case-sensitive, NFC, number and unit equivalence)', () => {
  it('is true for identical tokens', () => {
    expect(tokensEqual('Resin', 'Resin')).toBe(true);
    expect(tokensEqual('32/300', '32/300')).toBe(true);
  });

  it('is case-sensitive', () => {
    expect(tokensEqual('Pro', 'pro')).toBe(false);
    expect(tokensEqual('Resin', 'resin')).toBe(false);
  });

  it('is false for different words — a translated token is a different token', () => {
    expect(tokensEqual('Resin', 'resina')).toBe(false);
    expect(tokensEqual('Tank', 'Depósito')).toBe(false);
  });

  it('compares on Unicode NFC (composed and decomposed forms are equal)', () => {
    expect(tokensEqual('Depósito', 'Depósito')).toBe(true);
  });

  it('treats two number tokens as equal modulo the decimal separator', () => {
    expect(tokensEqual('1.75', '1,75')).toBe(true);
    expect(tokensEqual('1,75', '1.75')).toBe(true);
    expect(tokensEqual('0.4', '0,4')).toBe(true);
  });

  it('does not equate different numbers', () => {
    expect(tokensEqual('1.75', '1.76')).toBe(false);
    expect(tokensEqual('1.75', '175')).toBe(false);
  });

  it.each([
    ['mm', 'мм'], ['kg', 'кг'], ['W', 'Вт'], ['cm', 'см'], ['kW', 'кВт'],
  ])('treats the unit tokens "%s" and "%s" as equal (the pipeline unit table)', (latin, cyrillic) => {
    expect(tokensEqual(latin, cyrillic)).toBe(true);
    expect(tokensEqual(cyrillic, latin)).toBe(true);
  });

  it('does not equate two different units, or a unit with a number', () => {
    expect(tokensEqual('mm', 'кг')).toBe(false);
    expect(tokensEqual('1.75', 'мм')).toBe(false);
  });
});
