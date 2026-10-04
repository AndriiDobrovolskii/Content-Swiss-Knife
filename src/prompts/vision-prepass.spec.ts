/**
 * vision-prepass.spec.ts - US-5.1 T5: the Vision prompt asks for a native-Ukrainian label,
 * description and alt next to the English caption (FR-21, NFR-10, NFR-12).
 *
 * Written BEFORE the prompt carries the three keys, from Specification FR-21 / NFR-10 and plan D5.
 *
 * What this spec can and cannot prove. It proves the prompt DELIVERS the instruction and that the
 * JSON contract the prompt advertises is the contract the parser reads (plan D2, first row). It does
 * not prove the model obeys it: that the label is image-specific, that description and alt are one
 * sentence each and the quality of the Ukrainian are verified only by the human live re-run named in
 * the Specification ("What this Specification cannot guarantee").
 */
import { describe, it, expect } from 'vitest';
import { buildVisionPrepassPrompt } from './vision-prepass';
import { parseVisionResult, visionResultToEntryPatch } from '../utils/vision-contract';

const prompt = buildVisionPrepassPrompt('Ortur Laser Master 3', 'Power 20 W');

/** The JSON object literal inside the OUTPUT CONTRACT block of the prompt. */
function advertisedJsonKeys(text: string): string[] {
  const start = text.indexOf('OUTPUT CONTRACT');
  const open = text.indexOf('{', start);
  const close = text.indexOf('\n}', open);
  const block = text.slice(open, close + 2);
  return Array.from(block.matchAll(/"([A-Za-z_]+)"\s*:/g), m => m[1]);
}

describe('Vision prompt JSON contract - FR-21, NFR-12', () => {
  it('advertises exactly the four keys caption, label, description and alt', () => {
    expect([...advertisedJsonKeys(prompt)].sort()).toEqual(['alt', 'caption', 'description', 'label']);
  });

  it('keeps the English caption and its 20-word limit instruction', () => {
    expect(prompt).toMatch(/"caption"/);
    expect(prompt).toMatch(/20 words/);
  });

  it('a reply carrying every advertised key round-trips through the parser into the entry patch', () => {
    const reply: Record<string, string> = {};
    for (const key of advertisedJsonKeys(prompt)) {
      reply[key] = key === 'caption' ? 'Green laser engraving a wooden plate' : `Український текст для ${key}.`;
    }
    const parsed = parseVisionResult(JSON.stringify(reply));
    expect(parsed.caption).toBe('Green laser engraving a wooden plate');
    expect(parsed.label).toBe('Український текст для label.');
    expect(parsed.description).toBe('Український текст для description.');
    expect(parsed.alt).toBe('Український текст для alt.');
    expect(visionResultToEntryPatch(parsed)).toEqual({
      visionLabelUk: 'Український текст для label.',
      visionDescriptionUk: 'Український текст для description.',
      visionAltUk: 'Український текст для alt.',
    });
  });
});

describe('Vision prompt instructions - FR-21, NFR-10', () => {
  it('instructs the three texts to be written directly in Ukrainian', () => {
    expect(prompt).toMatch(/Ukrainian/);
  });

  it('says the Ukrainian texts are not translated from the English caption (native generation)', () => {
    expect(prompt).toMatch(/not\s+(?:a\s+)?translat|never\s+translat|do\s+not\s+translate|instead of translating|rather than translating/i);
  });

  it('asks for an image-specific label, never a generic one', () => {
    expect(prompt).toMatch(/image-specific|specific to (?:this|the) image/i);
    expect(prompt).toMatch(/generic/i);
  });

  it('asks for an uppercase initial on the label (the frozen lead-in-capitalization warning, OI-9)', () => {
    expect(prompt).toMatch(/uppercase/i);
  });

  it('asks for one sentence each for description and alt, and for them to differ', () => {
    expect(prompt).toMatch(/one sentence/i);
    expect(prompt).toMatch(/differ|different/i);
  });

  it('keeps the existing number rules in force (extending them to the three new texts is a prompt-wording property verified by the live re-run)', () => {
    expect(prompt).toMatch(/NUMBERS ARE THE HIGHEST-RISK ELEMENT/);
  });

  it('takes no store or locale parameter (plan D5, OI-4): the signature stays (productName, specsExcerpt?)', () => {
    expect(buildVisionPrepassPrompt.length).toBeLessThanOrEqual(2);
  });

  it('still grounds on the product name and the specs excerpt', () => {
    expect(prompt).toContain('Ortur Laser Master 3');
    expect(prompt).toContain('Power 20 W');
  });
});
