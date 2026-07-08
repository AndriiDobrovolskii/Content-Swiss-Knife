/**
 * task-translate.spec.ts
 *
 * Guards the standalone Translator's store-agnostic prompt builder (src/prompts/task-translate.ts):
 * pure translation only, full code/markup preservation, per-language orthography, the number/
 * separator carve-out, case-insensitive language lookup, and a safe fallback for unknown labels.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildTranslatePrompt } from './task-translate';
import { TRANSLATOR_LANGUAGES } from '../prompt-core/constants';

describe('buildTranslatePrompt — payload shape', () => {
  it('puts the raw input verbatim into userContent and never caches it', () => {
    const input = 'Just translate this sentence.';
    const payload = buildTranslatePrompt(input, 'German');
    expect(payload.userContent).toBe(input);
  });

  it('emits exactly two cached system blocks (role + language instruction)', () => {
    const payload = buildTranslatePrompt('x', 'Polish');
    expect(payload.systemBlocks).toHaveLength(2);
    expect(payload.systemBlocks.every(b => b.cache === true)).toBe(true);
  });
});

describe('buildTranslatePrompt — code/markup preservation', () => {
  const systemBlock = () => buildTranslatePrompt('<a href="x">Spain</a>', 'German').systemBlocks[0].text;

  it('instructs to translate only human-readable text and preserve tags/attributes/URLs', () => {
    const block = systemBlock();
    expect(block).toMatch(/PRESERVE ALL CODE\/MARKUP/i);
    expect(block).toMatch(/byte-identical/i);
    expect(block).toMatch(/alt=""/);
  });

  it('forbids geographic/entity substitution (Spain stays Spain, not another country)', () => {
    const block = systemBlock();
    expect(block).toMatch(/NEVER changed to a different country/i);
  });
});

describe('buildTranslatePrompt — number/separator directives', () => {
  const instruction = (label: string) => buildTranslatePrompt('x', label).systemBlocks[1].text;
  const roleBlock = () => buildTranslatePrompt('x', 'Ukrainian').systemBlocks[0].text;

  it('states digits never change while separators/units may localize', () => {
    const block = roleBlock();
    expect(block).toMatch(/digit sequence itself never\s+changes/i);
    expect(block).toContain('2,5 мм');
  });

  it('scopes decimal-comma to real quantities and exempts versions/standards/IPs/files', () => {
    const block = roleBlock();
    expect(block).toMatch(/software\/firmware versions/i);
    expect(block).toContain('802.11');
    expect(block).toMatch(/IP addresses/i);
  });

  it('embeds the shared UNIT_LOCALIZATION rules in the language instruction block', () => {
    expect(instruction('Ukrainian')).toContain('[UNIT LOCALIZATION]');
  });
});

describe('buildTranslatePrompt — output format lockdown', () => {
  it('bans markdown code fences and commentary', () => {
    const block = buildTranslatePrompt('x', 'German').systemBlocks[0].text;
    expect(block).toMatch(/Do NOT wrap the response in markdown code fences/i);
    expect(block).toMatch(/Output ONLY the translated/i);
  });
});

describe('buildTranslatePrompt — language resolution', () => {
  it('resolves every label in TRANSLATOR_LANGUAGES to a mapped config (no generic fallback)', () => {
    for (const label of TRANSLATOR_LANGUAGES) {
      const instruction = buildTranslatePrompt('x', label).systemBlocks[1].text;
      // The generic fallback heading contains the raw label + "standard normative orthography";
      // a mapped config instead produces "TRANSLATE THE INPUT INTO <NAME>." with orthography notes.
      expect(instruction).toContain('[TARGET-LANGUAGE ORTHOGRAPHY]');
    }
  });

  it('looks up the language case-insensitively (russian / Russian / RUSSIAN are identical)', () => {
    const lower = buildTranslatePrompt('x', 'russian').systemBlocks[1].text;
    const title = buildTranslatePrompt('x', 'Russian').systemBlocks[1].text;
    const upper = buildTranslatePrompt('x', 'RUSSIAN').systemBlocks[1].text;
    expect(title).toBe(lower);
    expect(upper).toBe(lower);
  });

  it('falls back to a safe generic instruction for an unknown label instead of throwing', () => {
    expect(() => buildTranslatePrompt('x', 'Klingon')).not.toThrow();
    const instruction = buildTranslatePrompt('x', 'Klingon').systemBlocks[1].text;
    expect(instruction).toContain('Klingon');
    expect(instruction).toMatch(/standard normative orthography/i);
    expect(instruction).not.toContain('[TARGET-LANGUAGE ORTHOGRAPHY]');
  });
});

describe('buildTranslatePrompt — per-language orthography', () => {
  it('en-GB uses British spelling guidance; en-US uses American', () => {
    expect(buildTranslatePrompt('x', 'English (en-GB)').systemBlocks[1].text).toContain('British/European English');
    expect(buildTranslatePrompt('x', 'American English (en-US)').systemBlocks[1].text).toContain('American English spelling');
  });

  it('pt-PT forbids Brazilian forms', () => {
    const instruction = buildTranslatePrompt('x', 'Portuguese (pt-PT)').systemBlocks[1].text;
    expect(instruction).toMatch(/never Brazilian/i);
    expect(instruction).toContain('ficheiro');
  });
});
