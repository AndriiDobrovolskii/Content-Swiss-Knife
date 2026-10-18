/**
 * vision-prepass.no-picture-references.spec.ts - US-9.1 T14 (FR-1 to FR-4, AC-1, NFR-12): the Vision pre-pass
 * prompt asks for a `description` and an `alt` that are about the PRODUCT, never about the picture.
 *
 * The figcaption text of a marker-built figure is the Vision `description` copied unedited
 * (`buildFigureParts`), so a description that opens with «На фото...» ships as a picture reference. These
 * pins prove the prompt DELIVERS the instruction; they cannot prove the model obeys it (that is the live
 * acceptance, FR-34, outside the gate). A NEW file on purpose: `vision-prepass.spec.ts` keeps its existing
 * pins untouched.
 *
 * Comparison is case-sensitive over the prompt text with every run of whitespace collapsed to one space
 * (Specification, "Assertion convention"). Only the listed literals are normative; the GOOD / BAD example
 * sentences of the restated blocks are illustrative and are not asserted (wording latitude, H-OD13).
 *
 * SCOPING. Some of FR-2's literals ("Start with the subject noun") already occur elsewhere in the prompt (the
 * English caption rules), so FR-1 and FR-2 are asserted INSIDE the UKRAINIAN FIELDS block and FR-3 INSIDE the
 * Grounding rules section; asserting them anywhere in the prompt would be green on arrival and prove nothing.
 */
import { describe, it, expect } from 'vitest';
import { buildVisionPrepassPrompt } from './vision-prepass';

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const PROMPT = collapse(buildVisionPrepassPrompt('Ortur Laser Master 3', 'Power 20 W'));

/** Text between two headings of the collapsed prompt (end exclusive). */
const between = (from: string, to: string): string => {
  const a = PROMPT.indexOf(from);
  const b = PROMPT.indexOf(to, a + from.length);
  expect(a, `heading "${from}" not found`).toBeGreaterThanOrEqual(0);
  expect(b, `heading "${to}" not found after "${from}"`).toBeGreaterThan(a);
  return PROMPT.slice(a, b);
};

const UK_FIELDS = between('UKRAINIAN FIELDS', 'ALT-TEXT RULES for "caption"');
const GROUNDING = between('Grounding rules:', 'UKRAINIAN FIELDS');

describe('FR-1: description is about the product, never about the picture (AC-1)', () => {
  it.each([
    'never begins with and never contains',
    'never makes it the subject of a verb',
    '«На зображенні»', '«На фото»', '«На знімку»', '«На кадрі»', '«Зображено»', '«Показано»', '«Видно»',
  ])('the UKRAINIAN FIELDS block states %j', literal => {
    expect(UK_FIELDS).toContain(literal);
  });

  it('Assert absent: the old description line "says what the image shows" is gone from the prompt', () => {
    expect(PROMPT).not.toContain('says what the image shows');
  });

  it('the description rule still asks for one sentence', () => {
    expect(UK_FIELDS).toContain('one sentence');
  });
});

describe('FR-2: alt starts with the subject noun, differs from description, one alphabet per word (AC-1)', () => {
  it.each(['Start with the subject noun', '«Зображення»', '«Фото»', '«Знімок»', 'one alphabet'])(
    'the UKRAINIAN FIELDS block states %j', literal => {
      expect(UK_FIELDS).toContain(literal);
    },
  );

  it('keeps the existing sentence "It must be different from description, not a copy."', () => {
    expect(UK_FIELDS).toContain('It must be different from description, not a copy.');
  });
});

describe('FR-3: the Grounding rules section carries the no-inference sentence, VERBATIM (AC-1)', () => {
  it('contains "State only what is visible; never infer operating modes, compatibility or requirements"', () => {
    expect(GROUNDING).toContain('State only what is visible; never infer operating modes, compatibility or requirements');
  });
});

describe('FR-4: the phrases already pinned by existing specs are kept (AC-1)', () => {
  it.each(['one sentence', 'differ', 'NUMBERS ARE THE HIGHEST-RISK ELEMENT'])('the prompt still contains %j', literal => {
    expect(PROMPT).toContain(literal);
  });
});

describe('NFR-12: only the instructions of two fields change - the JSON field set and the signature do not', () => {
  it('still advertises exactly the keys caption, label, description and alt', () => {
    const start = PROMPT.indexOf('OUTPUT CONTRACT');
    // The sentence after "OUTPUT CONTRACT" quotes the characters "{" and "}"; the slice must start at the "{" that OPENS the JSON
    // example, i.e. a "{" followed by a quoted key and a colon (the quoted "{" is followed by a closing quote, not a key).
    const open = start + PROMPT.slice(start).search(/\{\s*"[A-Za-z_]+"\s*:/);
    expect(open, 'the JSON example after OUTPUT CONTRACT was not found').toBeGreaterThan(start);
    const close = PROMPT.indexOf('}', open);
    const keys = Array.from(PROMPT.slice(open, close + 1).matchAll(/"([A-Za-z_]+)"\s*:/g), m => m[1]);
    expect([...keys].sort()).toEqual(['alt', 'caption', 'description', 'label']);
  });

  it('keeps the (productName, specsExcerpt?) signature', () => {
    expect(buildVisionPrepassPrompt.length).toBeLessThanOrEqual(2);
  });
});
