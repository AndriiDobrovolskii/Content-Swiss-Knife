/**
 * json-parse.spec.ts
 *
 * `parseJsonResponse` is shared by all three providers and every JSON call in the app — SEO
 * metadata, slugs, keywords, and the ProductDescriptionDoc. It repairs because model JSON really
 * does arrive malformed: observed twice on real runs, at position 16478 (line 436) and 16203
 * (line 460), both `Expected ',' or '}'` at column 1 — a dropped separator, not truncation.
 *
 * THE TEST THAT MATTERS IS THE STRING ONE. Deleting a trailing comma is the easy half; not deleting
 * a comma that belongs to prose is the half that goes wrong silently, and product descriptions are
 * full of brackets and commas.
 */
import { describe, it, expect } from 'vitest';

import { parseJsonResponse } from '../server/utils/json-parse.js';

describe('parseJsonResponse — the happy path is untouched', () => {
  it('parses valid JSON without modifying it', () => {
    expect(parseJsonResponse('{"a":1,"b":[1,2,3]}')).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it('strips code fences', () => {
    expect(parseJsonResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('preserves a string that merely looks like it needs repair', () => {
    const doc = { hook: 'Формати: JPG, ] і PNG', spec: 'a,} b' };
    expect(parseJsonResponse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('parseJsonResponse — repair', () => {
  it('recovers a trailing comma before }', () => {
    expect(parseJsonResponse('{"a":1,}')).toEqual({ a: 1 });
  });

  it('recovers a trailing comma before ]', () => {
    expect(parseJsonResponse('{"a":[1,2,]}')).toEqual({ a: [1, 2] });
  });

  it('recovers a trailing comma with whitespace and newlines before the closer', () => {
    expect(parseJsonResponse('{\n  "a": 1,\n\n}')).toEqual({ a: 1 });
  });

  /**
   * THE REGRESSION THIS FILE EXISTS FOR. The first implementation ran
   * `replace(/,\s*([\]}])/g, '$1')` over the whole document, which is not string-aware, and
   * silently deleted a comma inside prose:
   *
   *   in:  {"hook":"Формати: JPG, ] і PNG"}
   *   out: {"hook":"Формати: JPG] і PNG"}
   */
  it('NEVER deletes a comma inside a string value', () => {
    const broken = '{"hook":"Формати: JPG, ] і PNG","x":1,}';
    expect(parseJsonResponse(broken)).toEqual({ hook: 'Формати: JPG, ] і PNG', x: 1 });
  });

  it('never deletes a comma before a brace inside a string either', () => {
    const broken = '{"hook":"склад: a, } b","x":1,}';
    expect(parseJsonResponse(broken)).toEqual({ hook: 'склад: a, } b', x: 1 });
  });

  it('escapes a literal newline inside a string rather than failing', () => {
    expect(parseJsonResponse('{"a":"line1\nline2"}')).toEqual({ a: 'line1\nline2' });
  });

  it('leaves an already-escaped sequence alone', () => {
    expect(parseJsonResponse('{"a":"line1\\nline2"}')).toEqual({ a: 'line1\nline2' });
  });

  it('does not treat an escaped quote as the end of a string', () => {
    const doc = { hook: 'He said "hi, ]" loudly' };
    expect(parseJsonResponse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('parseJsonResponse — what it refuses to do', () => {
  /**
   * TRUNCATION MUST STAY FATAL. An earlier implementation appended missing closers, which turned a
   * cut-off response into a structurally valid object with fields simply gone — a quiet wrong
   * answer in place of a loud failure.
   *
   * All three providers now throw on truncation BEFORE parsing (anthropic.js, gemini.js and — as of
   * this change — openai.js), so nothing legitimate reaches here truncated. If something does, it
   * is a bug worth surfacing, not completing.
   */
  it('does not silently complete a document truncated at a field boundary', () => {
    const truncated = '{"schemaVersion":"3.0","locale":"uk-UA","hook":"A hook."';
    expect(() => parseJsonResponse(truncated)).toThrow();
  });

  it('does not complete a truncated array', () => {
    expect(() => parseJsonResponse('{"a":[1,2')).toThrow();
  });

  /**
   * The error must describe the text the MODEL produced. An error thrown from the repaired copy
   * would cite positions that exist in no artifact anyone can inspect.
   */
  it('throws the ORIGINAL error, not one from the repaired copy', () => {
    const bad = '{"a": @@@ }';
    let fromParse = '';
    let fromHelper = '';
    try { JSON.parse(bad); } catch (e) { fromParse = (e as Error).message; }
    try { parseJsonResponse(bad); } catch (e) { fromHelper = (e as Error).message; }
    expect(fromHelper).toBe(fromParse);
  });

  it('still throws on input that is not JSON at all', () => {
    expect(() => parseJsonResponse('I could not complete that request.')).toThrow();
  });
});
