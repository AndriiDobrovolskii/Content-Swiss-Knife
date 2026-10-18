/**
 * task-a.operator-notes.spec.ts - US-9.1 T21 (FR-26, FR-27, FR-40 positive side, NFR-1, OD-19 (2); AC-9).
 *
 * `buildPromptA` (FROZEN `task-a.ts`, T21 = item T-A4) emits an `[Operator Notes]` block in `userContent` from
 * `ProductInput.operatorNotes`; `buildPromptADoc` keeps `buildPromptA`'s `userContent` as a byte-for-byte prefix
 * and so carries the block into the Doc pipeline with no `task-a-doc.ts` change. This spec is written from the
 * Specification's text rule, with the expected block built HERE by an independent function, never by importing
 * `src/prompts/operator-notes.ts` (that module is T9 and is pinned in its own spec): a test that rebuilt the
 * expectation with the code under test would pin the implementation back to itself.
 *
 * THE RULE (FR-26, confirmed by the owner, OD-17): entries in the fixed order usage scenarios, test results,
 * comparison with the previous generation, limitations; each one line `<label> <value>` (one space after the
 * colon, value trimmed, internal line breaks kept); entries joined by a single `\n`; heading `[Operator Notes]`
 * on its own first line; the block is `[Operator Notes]\n` + the filled lines joined by `\n` + `\n`; only filled
 * entries appear; all empty means no block at all. POSITION: the offset immediately after
 * `[Supplemental Content]: ` + the WHOLE supplemental value (which may span several lines; `None provided.`
 * when empty) + the single `\n` the template emits after it, before everything that follows that line today.
 * TEST: for a fixed input, `userContent` with notes equals `userContent` with `operatorNotes` empty, with
 * exactly the block inserted at that offset and nothing else changed.
 *
 * RED until T21 for every test that expects the block; the "no block when empty", "system blocks unchanged" and
 * "supplemental stays None provided" tests are guards that hold before and after. Gated on T21 (H-OD12): the
 * `task-a.ts` "modify" instruction has not been given and this spec does not touch the file.
 *
 * `ProductInput.operatorNotes` does not exist until T8, so the field is added through a cast.
 */
import { describe, it, expect } from 'vitest';
import { buildPromptA } from './task-a';
import { buildPromptADoc } from './task-a-doc';
import type { ProductInput } from '../app/types';
import type { HookPattern } from '../prompt-core/hook-pattern';
import { STORE_REGISTRY } from '../prompt-core/constants';
import { LAMP, KETTLE, MARKER } from '../../test/fixtures/image-placeholder/fixtures';

type Notes = { usageScenarios?: string; testResults?: string; previousGenerationComparison?: string; limitations?: string };

/** The FR-26 text rule, written independently of the implementation. */
function expectedBlock(notes: Notes): string {
  const entries: Array<[string, string | undefined]> = [
    ['Usage scenarios:', notes.usageScenarios],
    ['Test results:', notes.testResults],
    ['Comparison with the previous generation:', notes.previousGenerationComparison],
    ['Limitations:', notes.limitations],
  ];
  const lines = entries.filter(([, v]) => (v ?? '').trim() !== '').map(([label, v]) => `${label} ${(v ?? '').trim()}`);
  return lines.length === 0 ? '' : `[Operator Notes]\n${lines.join('\n')}\n`;
}

const withNotes = (input: ProductInput, notes: unknown): ProductInput => ({ ...input, operatorNotes: notes }) as unknown as ProductInput;

const website = (name: string) => ({ name, group: STORE_REGISTRY[name].group, url: 'https://x.example' });
const base = (store: string, over: Partial<ProductInput> = {}): ProductInput => ({
  website: website(store), name: 'Creality Ender-3 V3 SE', description: 'Budget FDM printer with auto leveling.',
  specs: '| Параметр | Значення |\n|---|---|\n| Діаметр | 1,75 мм |', brandFolder: 'creality', modelFolder: 'ender', ...over,
});

const FULL: Notes = {
  usageScenarios: 'Prototyping brackets for a workshop',
  testResults: 'Printed 40 parts at 0.2 mm',
  previousGenerationComparison: 'Quieter than the previous model',
  limitations: 'Cable required for the laser mode',
};

/** The offset FR-26 names, found independently in the userContent WITHOUT notes. */
function positionOf(without: string, supplemental: string | undefined): number {
  const label = '[Supplemental Content]: ';
  const at = without.indexOf(label);
  expect(at, 'the [Supplemental Content] line is missing').toBeGreaterThanOrEqual(0);
  return at + label.length + (supplemental || 'None provided.').length + 1;
}

const YOUTUBE = '<iframe src="https://www.youtube.com/embed/abc123XYZ" title="Overview"></iframe>';

interface PositionCase { name: string; input: ProductInput; override?: string }
const POSITION_CASES: PositionCase[] = [
  ...(['3DDevice', 'Center 3D Print', 'EXPERT3D', 'Expert-3DPrinter'] as const).map(store => ({
    name: `${store}: Full description, no supplemental content`, input: base(store),
  })),
  { name: 'EXPERT3D: multi-line supplemental content (the whole value precedes the block)', input: base('EXPERT3D', { supplementalContent: 'Q: heated bed?\nA: yes, 60 °C.\n\nQ: nozzle? A: 0.4 mm.' }) },
  { name: 'EXPERT3D: image manifest, custom instructions and a baseLanguageOverride', input: base('EXPERT3D', { imageManifest: [LAMP, KETTLE], customInstructions: 'Keep the tone practical.' }), override: 'American English (en-US)' },
  { name: 'EXPERT3D: video embed and image marker present (the video and marker blocks follow the notes)', input: base('EXPERT3D', { description: `Intro ${MARKER} text. ${YOUTUBE}`, imageManifest: [LAMP], supplementalContent: 'One line.' }) },
  { name: 'Center 3D Print: custom template (the [TEMPLATE] hint follows the notes)', input: base('Center 3D Print', { customTemplate: { bodyFocus: 'material properties' } }) },
  { name: 'EXPERT3D: simplified template spare-parts (the overlay follows the notes)', input: base('EXPERT3D', { templateId: 'spare-parts' }) },
  { name: 'Expert-3DPrinter: simplified template accessories with functionality', input: base('Expert-3DPrinter', { templateId: 'accessories', includeFunctionality: true }) },
];

const NOTE_SETS: Array<[string, Notes]> = [
  ['all four filled', FULL],
  ['only limitations', { limitations: 'Cable required' }],
  ['two filled, two empty (order is fixed, not insertion order)', { limitations: 'Cable required', usageScenarios: 'Prototyping' }],
  ['values with surrounding whitespace and internal line breaks', { usageScenarios: '  First scenario\nSecond scenario \n', testResults: '\n\t40 parts\n\nat 0.2 mm ' }],
];

describe.each(POSITION_CASES)('FR-26 position: $name', ({ input, override }) => {
  const supplemental = input.supplementalContent;
  const without = () => buildPromptA(input, override).userContent;

  it.each(NOTE_SETS)('%s: userContent equals the no-notes userContent with the block inserted at the FR-26 offset, nothing else changed', (_n, notes) => {
    const baseText = without();
    const at = positionOf(baseText, supplemental);
    const expected = baseText.slice(0, at) + expectedBlock(notes) + baseText.slice(at);
    const built = buildPromptA(withNotes(input, notes), override).userContent;
    expect(built === expected, 'userContent differs from "no-notes userContent + block at the FR-26 offset"').toBe(true);
  });
});

describe('FR-26 / FR-27: an empty operatorNotes emits no block at all (guard, green on arrival)', () => {
  it.each([
    ['undefined', undefined], ['{}', {}], ['four empty strings', { usageScenarios: '', testResults: '', previousGenerationComparison: '', limitations: '' }],
    ['four whitespace-only strings', { usageScenarios: ' ', testResults: '\n', previousGenerationComparison: '\t', limitations: '  ' }],
  ])('operatorNotes = %s: no heading, no label, no "None provided." line for notes, userContent unchanged', (_n, notes) => {
    const input = base('EXPERT3D');
    const built = buildPromptA(withNotes(input, notes)).userContent;
    expect(built).toBe(buildPromptA(input).userContent);
    expect(built).not.toContain('[Operator Notes]');
    expect(built).not.toContain('Usage scenarios:');
  });

  it('an empty ENTRY prints nothing: no label, no line, no "None provided." for it', () => {
    const built = buildPromptA(withNotes(base('EXPERT3D'), { testResults: 'Printed 40 parts', limitations: '  ' }), undefined).userContent;
    expect(built).toContain('[Operator Notes]\nTest results: Printed 40 parts\n');
    expect(built).not.toContain('Limitations:');
    expect(built).not.toContain('Usage scenarios:');
  });
});

describe('FR-28 at prompt level: the notes are their own block, never merged into [Supplemental Content] (guard + red)', () => {
  it('with only notes filled, the [Supplemental Content] line still reads "None provided."', () => {
    const built = buildPromptA(withNotes(base('EXPERT3D'), FULL)).userContent;
    expect(built).toContain('[Supplemental Content]: None provided.\n');
    expect(built).toContain(expectedBlock(FULL));
  });

  it('the block comes after the whole supplemental value and before the image manifest', () => {
    const built = buildPromptA(withNotes(base('EXPERT3D', { supplementalContent: 'Line one.\nLine two.', imageManifest: [LAMP] }), FULL)).userContent;
    const supplementalAt = built.indexOf('Line two.');
    const blockAt = built.indexOf('[Operator Notes]');
    const manifestAt = built.indexOf('[IMAGE MANIFEST]');
    expect(blockAt, 'no [Operator Notes] block').toBeGreaterThan(supplementalAt);
    expect(manifestAt).toBeGreaterThan(blockAt);
  });
});

describe('NFR-1: the block rides in userContent; the cached system blocks never change with the notes', () => {
  it.each(Object.keys(STORE_REGISTRY))('store %s: systemBlocks are byte-identical with and without notes, and no note value is in any of them', store => {
    const input = base(store);
    const plain = buildPromptA(input);
    const filled = buildPromptA(withNotes(input, FULL));
    expect(JSON.stringify(filled.systemBlocks)).toBe(JSON.stringify(plain.systemBlocks));
    for (const block of filled.systemBlocks) {
      expect(block.text).not.toContain('Printed 40 parts at 0.2 mm');
      expect(block.text).not.toContain('[Operator Notes]\nUsage scenarios:');
    }
    expect(filled.userContent).toContain('Printed 40 parts at 0.2 mm');
  });
});

describe('OD-19 (2): Expert-3DPrinter (plain-HTML path, buildPromptA called directly) receives and renders the notes', () => {
  it('buildPromptA for the Expert-3DPrinter profile with filled notes contains the [Operator Notes] block at the FR-26 position', () => {
    const input = base('Expert-3DPrinter');
    const without = buildPromptA(input).userContent;
    const at = positionOf(without, undefined);
    const built = buildPromptA(withNotes(input, FULL)).userContent;
    expect(built.slice(at, at + expectedBlock(FULL).length)).toBe(expectedBlock(FULL));
    expect(built).toContain('[IMAGE MANIFEST]\nNone — skip all <img>.');
  });
});

describe('FR-40 positive side: the notes reach the Doc pipeline through the byte-for-byte userContent prefix', () => {
  const hook = { id: 'h', instruction: 'Open with the buyer problem.' } as HookPattern;
  const input = () => withNotes(base('EXPERT3D', { supplementalContent: 'Q: heated bed? A: yes.' }), FULL);

  it('buildPromptADoc(...).userContent starts with buildPromptA(...).userContent, which carries the block', () => {
    const doc = buildPromptADoc(input()).userContent;
    const html = buildPromptA(input()).userContent;
    expect(doc.startsWith(html), 'the Doc userContent no longer has the base userContent as a prefix').toBe(true);
    expect(doc).toContain(expectedBlock(FULL));
  });

  it('the hook-pattern suffix is appended after the notes, never before them', () => {
    const doc = buildPromptADoc(input(), undefined, hook).userContent;
    expect(doc.indexOf('[Operator Notes]')).toBeGreaterThanOrEqual(0);
    expect(doc.indexOf('[§1 HOOK PATTERN]')).toBeGreaterThan(doc.indexOf('[Operator Notes]'));
  });

  it('with a simplified template the run facts follow the base userContent, which still carries the block', () => {
    const doc = buildPromptADoc({ ...input(), templateId: 'spare-parts' }).userContent;
    expect(doc).toContain(expectedBlock(FULL));
    expect(doc.indexOf('[TEMPLATE FACTS')).toBeGreaterThan(doc.indexOf('[Operator Notes]'));
  });
});
