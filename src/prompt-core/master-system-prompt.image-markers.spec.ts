/**
 * master-system-prompt.image-markers.spec.ts
 *
 * US-5.1 T12 — AC-9e (Spec v5 FR-20, plan v5 D3/D6). The [IMAGE HANDLING] section of the master
 * system prompt gains ONE static sentence telling the model that a bare `[file.jpg]` /
 * `[file.webp]` token in [Raw Description] is an image marker to keep, not an <img> to delete, and
 * that the Expert-3DPrinter "0 <img>" rule does not apply to markers.
 *
 * A NEW file on purpose (plan v5 B-3): the tracked master-system-prompt.spec.ts holds unrelated
 * guards and is not touched. Written before the sentence exists, so the property cases fail until
 * T16; the additions-only snapshot and the identity cases hold today and must stay green.
 *
 * The six asserted properties (FR-20): (1) the literals, (2) the word "marker", (3) the
 * Expert-3DPrinter "0 <img>" reference, (4) inside [IMAGE HANDLING], (5) additions-only,
 * (6) no per-run data and no interpolation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';
import { buildPromptA } from '../prompts/task-a';
import { buildPromptC } from '../prompts/task-c';
import { buildOptimizerPrompt } from '../prompts/optimizer';

/**
 * The [IMAGE HANDLING] lines as they stood before US-5.1, pinned from HEAD (before T16). The
 * sentence is appended after these and before the blank line that precedes FIGURE FORMAT.
 */
const OLD_IMAGE_HANDLING_LINES = [
  '[IMAGE HANDLING]',
  'IMAGE SOURCE OF TRUTH: build the image set exclusively from the [IMAGE MANIFEST] block in',
  'the user message. Treat every <img> inside [Raw Description] as text to delete during',
  'parsing — the manifest replaces it. When no manifest is present, emit 0 <img> tags.',
  'Expert-3DPrinter: emit 0 <img> tags in every case, manifest or not.',
];

const HEADING = '\n[IMAGE HANDLING]\n';
const START = MASTER_SYSTEM_PROMPT.indexOf(HEADING) + 1; // the heading line, not an in-text mention
const END = MASTER_SYSTEM_PROMPT.indexOf('\nFIGURE FORMAT', START);
/** The [IMAGE HANDLING] section: header up to (not including) the FIGURE FORMAT line. */
const SECTION = MASTER_SYSTEM_PROMPT.slice(START, END);
const SECTION_LINES = SECTION.split('\n');

/** Everything in the section that is not one of the pinned old lines (blank lines dropped). */
const ADDED_LINES = SECTION_LINES.filter(l => l.trim() !== '' && !OLD_IMAGE_HANDLING_LINES.includes(l));
const ADDED = ADDED_LINES.join(' ').replace(/\s+/g, ' ').trim();

describe('MASTER_SYSTEM_PROMPT [IMAGE HANDLING] — the section is locatable', () => {
  it('has the [IMAGE HANDLING] heading line, followed by FIGURE FORMAT', () => {
    expect(START).toBeGreaterThanOrEqual(0);
    expect(MASTER_SYSTEM_PROMPT.indexOf(HEADING, START)).toBe(-1); // the heading line appears once
    expect(END).toBeGreaterThan(START);
  });
});

describe('MASTER_SYSTEM_PROMPT [IMAGE HANDLING] — additions-only against the pre-Story lines (AC-9e property 5)', () => {
  it('keeps every pre-Story line, unchanged and in order', () => {
    let from = 0;
    for (const old of OLD_IMAGE_HANDLING_LINES) {
      const at = SECTION_LINES.indexOf(old, from);
      expect(at, `pre-Story line missing or changed: ${old}`).toBeGreaterThanOrEqual(from);
      from = at + 1;
    }
  });

  it('still tells the model to delete <img> tags inside [Raw Description] and to emit 0 <img> for Expert-3DPrinter', () => {
    expect(SECTION).toContain('Treat every <img> inside [Raw Description] as text to delete during');
    expect(SECTION).toContain('Expert-3DPrinter: emit 0 <img> tags in every case, manifest or not.');
  });
});

describe('MASTER_SYSTEM_PROMPT [IMAGE HANDLING] — the FR-20 marker sentence (AC-9e)', () => {
  it('adds new text inside the section (property 4)', () => {
    expect(ADDED.length, 'no text was added to [IMAGE HANDLING]').toBeGreaterThan(0);
  });

  it('contains the literals [file.jpg] and [file.webp] (property 1)', () => {
    expect(ADDED).toContain('[file.jpg]');
    expect(ADDED).toContain('[file.webp]');
  });

  it('contains the word "marker" (property 2)', () => {
    expect(ADDED).toMatch(/\bmarkers?\b/i);
  });

  it('states that the Expert-3DPrinter "0 <img>" rule does not apply to markers (property 3)', () => {
    expect(ADDED).toContain('Expert-3DPrinter');
    expect(ADDED).toMatch(/0\s*<img>/);
    expect(ADDED).toMatch(/does\s+not\s+apply|do\s+not\s+apply|doesn't\s+apply|not\s+apply/i);
  });

  it('tells the model a bare marker in [Raw Description] is preserved, not deleted as an <img>', () => {
    expect(ADDED).toContain('[Raw Description]');
    expect(ADDED).toMatch(/preserv|keep|retain/i);
    expect(ADDED).toMatch(/not\s+(?:an?\s+)?<img>|text,?\s+not\s+(?:an?\s+)?<img>/i);
  });

  it('sits between the pre-Story Expert-3DPrinter line and FIGURE FORMAT, not elsewhere in the prompt', () => {
    const expertLine = 'Expert-3DPrinter: emit 0 <img> tags in every case, manifest or not.';
    const expertAt = MASTER_SYSTEM_PROMPT.indexOf(expertLine);
    const literalAt = MASTER_SYSTEM_PROMPT.indexOf('[file.jpg]');
    expect(literalAt, 'the sentence is absent').toBeGreaterThan(-1);
    expect(literalAt).toBeGreaterThan(expertAt + expertLine.length);
    expect(literalAt).toBeLessThan(MASTER_SYSTEM_PROMPT.indexOf('FIGURE FORMAT', expertAt));
    expect(MASTER_SYSTEM_PROMPT.split('[file.jpg]')).toHaveLength(2); // stated once, in this section
  });

  it('does not instruct the model to emit an <img> for a marker (failure path)', () => {
    expect(ADDED.length, 'no text was added to [IMAGE HANDLING]').toBeGreaterThan(0);
    expect(ADDED).not.toMatch(/(?:must|should|shall|to|please)\s+(?:emit|output|produce|insert|add|write)\s+(?:an?\s+)?<img/i);
    expect(ADDED).not.toMatch(/replace\s+(?:the\s+|each\s+|every\s+)?markers?\s+with\s+(?:an?\s+)?<img/i);
  });

  it('carries no per-run data: the only filename-shaped tokens are the two literals (property 6)', () => {
    expect(ADDED.length, 'no text was added to [IMAGE HANDLING]').toBeGreaterThan(0);
    const tokens = ADDED.match(/\[[^\]\s]+\.(?:jpg|jpeg|png|webp)\]/gi) ?? [];
    expect([...new Set(tokens)].sort()).toEqual(['[file.jpg]', '[file.webp]']);
    expect(ADDED).not.toMatch(/COUNT=\d/);
  });

  it('has no ${} interpolation anywhere in the [IMAGE HANDLING] source text (property 6)', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'prompt-core', 'master-system-prompt.ts'), 'utf8').replace(/\r\n/g, '\n'); // the file may be CRLF on disk; a template literal is LF at runtime
    const s = source.indexOf(HEADING);
    const e = source.indexOf('\nFIGURE FORMAT', s);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(source.slice(s, e)).not.toContain('${');
    // The sentence itself must exist for this guard to mean anything.
    expect(source.slice(s, e)).toContain('[file.jpg]');
  });
});

describe('MASTER_SYSTEM_PROMPT — one identical constant for every importer (property 6)', () => {
  const MANIFEST = [{
    id: 'img-1', originalFilename: 'front.jpg', urlFilename: 'p-front.jpg', previewUrl: '',
    visionDescription: 'A part', altText: 'A part', order: 1, status: 'done' as const,
  }];
  const a = (description: string) => buildPromptA({
    website: { name: '3DPrinter', group: 'UA', url: '' }, name: 'Test Printer', description,
    specs: '', imageManifest: MANIFEST,
  } as Parameters<typeof buildPromptA>[0]);

  it('Task A embeds the constant verbatim and does not vary it with the input', () => {
    expect(a('Plain text.').systemBlocks[0].text).toBe(MASTER_SYSTEM_PROMPT);
    expect(a('See [front.jpg] here.').systemBlocks[0].text).toBe(MASTER_SYSTEM_PROMPT);
  });

  it('Task C and the optimizer embed the same constant verbatim', () => {
    const c = buildPromptC('<p>Text.</p>', 'Spanish (EXPERT3D)', 'EXPERT3D', 'ES');
    expect(c.systemBlocks[0].text).toBe(MASTER_SYSTEM_PROMPT);
    expect(buildOptimizerPrompt('<p>Text.</p>', 'Test Printer').systemBlocks[0].text).toBe(MASTER_SYSTEM_PROMPT);
  });
});
