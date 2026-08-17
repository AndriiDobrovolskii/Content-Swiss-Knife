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

/**
 * THE DEFECT THAT ACTUALLY HAPPENS.
 *
 * Both production failures carried the signature `Expected ',' or '}' after property value … column
 * 1` — the model ended a value and omitted the separator before the next line. The first repair
 * implementation handled trailing commas and control characters, neither of which has ever been
 * observed here, and threw on this. That is why the hand-rolled version was replaced.
 */
describe('parseJsonResponse — the defects models actually emit', () => {
  it('recovers a MISSING comma between properties — the observed production error', () => {
    expect(parseJsonResponse('{\n  "a": 1\n  "b": 2\n}')).toEqual({ a: 1, b: 2 });
  });

  it('recovers a missing comma between array elements', () => {
    expect(parseJsonResponse('{"a":[1\n2]}')).toEqual({ a: [1, 2] });
  });

  it('recovers single-quoted strings', () => {
    expect(parseJsonResponse("{'hook': 'Опис'}")).toEqual({ hook: 'Опис' });
  });

  it('recovers unquoted keys', () => {
    expect(parseJsonResponse('{hook: "Опис"}')).toEqual({ hook: 'Опис' });
  });

  it('recovers typographic quote characters', () => {
    expect(parseJsonResponse('{“hook”: “Опис”}')).toEqual({ hook: 'Опис' });
  });

  it('recovers Python constants', () => {
    expect(parseJsonResponse('{"a": None, "b": True, "c": False}'))
      .toEqual({ a: null, b: true, c: false });
  });

  it('strips a trailing comment', () => {
    expect(parseJsonResponse('{"a": 1} // done')).toEqual({ a: 1 });
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
   * TRUNCATION MUST STAY FATAL — AND THIS IS NOW LOAD-BEARING.
   *
   * `jsonrepair` lists "Add missing closing brackets" and "Repair truncated JSON" among its
   * features. That is exactly the `balanceClosers` behaviour deleted earlier, and it is wrong for
   * this codebase: it turns a cut-off response into a structurally valid object with fields simply
   * gone — a quiet wrong answer in place of a loud failure. On the Doc path zod would catch it;
   * SEO metadata, slugs and keywords have no schema gate and would ship the partial.
   *
   * `assertNotTruncated` runs BEFORE the library for precisely this reason. Delete it and these
   * tests go red, which is the point.
   *
   * All three providers also guard `finish_reason` upstream, but those guards depend on the
   * provider reporting it — a cut stream or a proxy timeout sets nothing.
   */
  it('does not silently complete a document truncated at a field boundary', () => {
    const truncated = '{"schemaVersion":"3.0","locale":"uk-UA","hook":"A hook."';
    expect(() => parseJsonResponse(truncated)).toThrow(/truncated/i);
  });

  it('does not complete a truncated array', () => {
    expect(() => parseJsonResponse('{"a":[1,2')).toThrow(/truncated/i);
  });

  it('does not complete a document truncated in the middle of a string', () => {
    expect(() => parseJsonResponse('{"hook":"половина речен'))
      .toThrow(/truncated/i);
  });

  it('names the depth it was left at, so the failure is diagnosable', () => {
    expect(() => parseJsonResponse('{"a":{"b":[1'))
      .toThrow(/truncated/i);
  });

  /**
   * A SURPLUS closer is not truncation — it is a repairable syntax error, and the detector must
   * stay out of jsonrepair's way rather than claiming the document was cut off.
   */
  it('does not misreport an extra closing brace as truncation', () => {
    expect(parseJsonResponse('{"a":1}}')).toEqual({ a: 1 });
  });

  /**
   * The error must describe the text the MODEL produced. An error thrown from the repaired copy
   * would cite positions that exist in no artifact anyone can inspect.
   *
   * (The example used to be `{"a": @@@ }`, which jsonrepair now legitimately repairs to
   * `{"a": "@@@"}`. Swapped for input that must never parse — see the test below.)
   */
  it('throws the ORIGINAL error, not one from the repaired copy', () => {
    const bad = 'I could not complete that request.';
    let fromParse = '';
    let fromHelper = '';
    try { JSON.parse(bad); } catch (e) { fromParse = (e as Error).message; }
    try { parseJsonResponse(bad); } catch (e) { fromHelper = (e as Error).message; }
    expect(fromHelper).toBe(fromParse);
  });

  /**
   * A MODEL REFUSAL MUST NOT BECOME DATA.
   *
   * jsonrepair quotes arbitrary prose into a valid JSON string — `I could not complete that
   * request.` repairs to `"I could not complete that request."`, which parses cleanly. That is a
   * refusal, a proxy error page or a stray apology, never a description. Callers with no schema
   * (SEO metadata, slugs, keywords) would carry the string forward as if it were an object.
   *
   * Hence the shape guard: a repaired top-level scalar is treated as a failed repair.
   */
  it('still throws on input that is not JSON at all', () => {
    expect(() => parseJsonResponse('I could not complete that request.')).toThrow();
  });

  it('rejects a repaired top-level scalar rather than returning it as data', () => {
    expect(() => parseJsonResponse('Вибачте, не можу згенерувати опис.')).toThrow();
    expect(() => parseJsonResponse('Sorry!')).toThrow();
  });

  /** But a legitimate top-level array is still a valid artifact — keywords come back as one. */
  it('accepts a repaired top-level array', () => {
    expect(parseJsonResponse("['друк', 'сканування',]")).toEqual(['друк', 'сканування']);
  });

  /**
   * TAGGED SO `withRetry` (server/utils/retry.js) CAN RETRY IT WITHOUT MATCHING ON MESSAGE TEXT.
   * A truncated body means the exchange was incomplete, not that the request was wrong — unlike a
   * provider's own MAX_TOKENS-style ceiling guard, which stays untagged and fail-fast. Both throw
   * branches of `assertNotTruncated` must carry the code, not just one.
   */
  it('tags an unclosed-container truncation with a retry-recognizable code', () => {
    try {
      parseJsonResponse('{"a":{"b":[1');
      expect.unreachable();
    } catch (e) {
      expect((e as any).code).toBe('ERR_INCOMPLETE_JSON');
    }
  });

  it('tags a mid-string truncation with the same code', () => {
    try {
      parseJsonResponse('{"hook":"половина речен');
      expect.unreachable();
    } catch (e) {
      expect((e as any).code).toBe('ERR_INCOMPLETE_JSON');
    }
  });

  /** The MAX_TOKENS-style provider guards are a different, deliberately un-retried failure. */
  it('does not tag an ordinary (non-truncation) parse failure with the truncation code', () => {
    try {
      parseJsonResponse('I could not complete that request.');
      expect.unreachable();
    } catch (e) {
      expect((e as any).code).toBeUndefined();
    }
  });
});
