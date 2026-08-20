import { describe, it, expect } from 'vitest';
import {
  LEAKED_PREAMBLE_PATTERN, normalizeForIntegrityCheck, stripLeakedPreamble, scanForLeakedPreamble,
} from './llm-output-integrity';

// Built via String.fromCharCode, never pasted as a literal invisible character — see the header
// of llm-output-integrity.ts for why (the plan drafting session itself hit corruption from
// pasted invisible characters, which is what motivated this).
const BOM = String.fromCharCode(0xfeff);
const ZWSP = String.fromCharCode(0x200b);
const NBSP = String.fromCharCode(0x00a0);

describe('LEAKED_PREAMBLE_PATTERN', () => {
  it('matches common self-correction openers at the start of a string', () => {
    expect(LEAKED_PREAMBLE_PATTERN.test('Wait, corrected below.')).toBe(true);
    expect(LEAKED_PREAMBLE_PATTERN.test('Actually, here it is.')).toBe(true);
    expect(LEAKED_PREAMBLE_PATTERN.test('Let me redo: fixed.')).toBe(true);
    expect(LEAKED_PREAMBLE_PATTERN.test('Correction: the real value.')).toBe(true);
  });

  it('does not match ordinary content', () => {
    expect(LEAKED_PREAMBLE_PATTERN.test('<p>Formlabs Fuse Sift X1</p>')).toBe(false);
    expect(LEAKED_PREAMBLE_PATTERN.test('Estación de recuperación de polvo.')).toBe(false);
  });

  it('only matches at the very start, not mid-sentence', () => {
    expect(LEAKED_PREAMBLE_PATTERN.test('The device works well. Wait, that needs a comma.')).toBe(false);
  });
});

describe('normalizeForIntegrityCheck', () => {
  it('strips a leading BOM', () => {
    expect(normalizeForIntegrityCheck(`${BOM}<p>ok</p>`)).toBe('<p>ok</p>');
  });

  it('strips a leading zero-width space', () => {
    expect(normalizeForIntegrityCheck(`${ZWSP}<p>ok</p>`)).toBe('<p>ok</p>');
  });

  it('strips leading/trailing NBSP alongside ordinary whitespace', () => {
    expect(normalizeForIntegrityCheck(`  ${NBSP} <p>ok</p> ${NBSP}  `)).toBe('<p>ok</p>');
  });

  it('leaves clean text untouched', () => {
    expect(normalizeForIntegrityCheck('<p>ok</p>')).toBe('<p>ok</p>');
  });

  it('does not touch invisible characters in the middle of the string', () => {
    const middle = `<p>a${ZWSP}b</p>`;
    expect(normalizeForIntegrityCheck(middle)).toBe(middle);
  });
});

describe('stripLeakedPreamble', () => {
  it('markup mode: removes the entire leaked span up to the first "<", not just the opener word', () => {
    // Regression case for the review-pass bug: matching only "Wait, " would leave
    // "corrected below. <p>...</p>" dangling, which still fails a structural check.
    expect(stripLeakedPreamble('Wait, corrected below. <p>...</p>', true)).toBe('<p>...</p>');
  });

  it('markup mode: no-ops when there is no leaked preamble', () => {
    expect(stripLeakedPreamble('<p>ok</p>', true)).toBe('<p>ok</p>');
  });

  it('markup mode: no-ops when the pattern matches but no "<" exists at all', () => {
    expect(stripLeakedPreamble('Wait, this has no markup.', true)).toBe('Wait, this has no markup.');
  });

  it('plain-text mode: consumes the leaked clause through its sentence boundary', () => {
    expect(stripLeakedPreamble('Actually, here is the real word. keyword-two', false)).toBe('keyword-two');
  });

  it('plain-text mode: no-ops on ordinary text', () => {
    expect(stripLeakedPreamble('keyword-one', false)).toBe('keyword-one');
  });

  it('is idempotent', () => {
    const once = stripLeakedPreamble('Wait, corrected below. <p>...</p>', true);
    expect(stripLeakedPreamble(once, true)).toBe(once);
  });
});

describe('scanForLeakedPreamble', () => {
  it('flags a top-level string match with a "(root)" path', () => {
    expect(scanForLeakedPreamble('Wait, oops')).toEqual(['(root)']);
  });

  it('returns no matches for clean input', () => {
    expect(scanForLeakedPreamble({ a: 'clean', b: ['also clean'] })).toEqual([]);
  });

  it('finds a leak nested inside an object field', () => {
    expect(scanForLeakedPreamble({ optimizedText: 'Actually, rewritten.' })).toEqual(['optimizedText']);
  });

  it('finds a leak nested inside an array, addressed by index', () => {
    expect(scanForLeakedPreamble(['clean', 'Wait, bad'])).toEqual(['[1]']);
  });

  it('finds a leak inside a nested object path, dotted', () => {
    expect(scanForLeakedPreamble({ 'en-GB': { meta_description: 'Correction: fixed.' } }))
      .toEqual(['en-GB.meta_description']);
  });

  it('finds a leak inside an array nested under an object key', () => {
    expect(scanForLeakedPreamble({ issues: ['fine', 'Hold on, wrong'] })).toEqual(['issues[1]']);
  });
});
