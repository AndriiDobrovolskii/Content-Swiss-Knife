/**
 * task-translate.spec.ts
 *
 * Guards the standalone Translator's store-agnostic prompt builder (src/prompts/task-translate.ts):
 * pure translation only, full code/markup preservation, per-language orthography, the number/
 * separator carve-out, case-insensitive language lookup, a safe fallback for unknown labels, and
 * the TranslationContext gate on the Ukrainian style guide.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildTranslatePrompt } from './task-translate';
import { TRANSLATOR_LANGUAGES } from '../prompt-core/constants';
import { UA_TRANSLATION_STYLE_GUIDE } from '../prompt-core/ua-translation-style-guide';

/** Most cases here predate TranslationContext and are indifferent to it; they assert behavior that
 *  is identical either way. They pass the user-facing value so they exercise the path real callers
 *  take. The context-sensitive assertions live in their own describe block at the bottom. */
const UF = 'user-facing-content';

describe('buildTranslatePrompt — payload shape', () => {
  it('puts the raw input verbatim into userContent and never caches it', () => {
    const input = 'Just translate this sentence.';
    const payload = buildTranslatePrompt(input, 'German', UF);
    expect(payload.userContent).toBe(input);
  });

  it('emits exactly two cached system blocks (role + language instruction)', () => {
    const payload = buildTranslatePrompt('x', 'Polish', UF);
    expect(payload.systemBlocks).toHaveLength(2);
    expect(payload.systemBlocks.every(b => b.cache === true)).toBe(true);
  });
});

describe('buildTranslatePrompt — code/markup preservation', () => {
  const systemBlock = () => buildTranslatePrompt('<a href="x">Spain</a>', 'German', UF).systemBlocks[0].text;

  it('instructs to translate only human-readable text and preserve tags/attributes/URLs', () => {
    const block = systemBlock();
    expect(block).toMatch(/PRESERVE ALL CODE\/MARKUP/i);
    expect(block).toMatch(/byte-identical/i);
    expect(block).toMatch(/alt=""/);
  });

  it('forbids geographic/entity substitution (Spain stays Spain, not another country)', () => {
    const block = systemBlock();
    expect(block).toMatch(/the referent country stays the same one/i);
  });
});

describe('buildTranslatePrompt — number/separator directives', () => {
  const instruction = (label: string) => buildTranslatePrompt('x', label, UF).systemBlocks[1].text;
  const roleBlock = () => buildTranslatePrompt('x', 'Ukrainian', UF).systemBlocks[0].text;

  it('states digits never change while separators/units may localize', () => {
    const block = roleBlock();
    expect(block).toMatch(/Keep every digit sequence byte-identical/i);
    expect(block).toContain('2,5 мм');
  });

  it('scopes decimal-comma to real quantities and exempts versions/standards/IPs/files', () => {
    const block = roleBlock();
    expect(block).toMatch(/software\/firmware\s+versions/i);
    expect(block).toContain('802.11');
    expect(block).toMatch(/IP addresses/i);
  });

  it('embeds the shared UNIT_LOCALIZATION rules in the language instruction block', () => {
    expect(instruction('Ukrainian')).toContain('[UNIT LOCALIZATION]');
  });
});

describe('buildTranslatePrompt — output format lockdown', () => {
  it('bans markdown code fences and commentary', () => {
    const block = buildTranslatePrompt('x', 'German', UF).systemBlocks[0].text;
    expect(block).toMatch(/Emit exactly one artifact/i);
    expect(block).toContain('would appear, write the translation itself');
  });
});

describe('buildTranslatePrompt — language resolution', () => {
  it('resolves every label in TRANSLATOR_LANGUAGES to a mapped config (no generic fallback)', () => {
    for (const label of TRANSLATOR_LANGUAGES) {
      const instruction = buildTranslatePrompt('x', label, UF).systemBlocks[1].text;
      // The generic fallback heading contains the raw label + "standard normative orthography";
      // a mapped config instead produces "TRANSLATE THE INPUT INTO <NAME>." with orthography notes.
      expect(instruction).toContain('[TARGET-LANGUAGE ORTHOGRAPHY]');
    }
  });

  it('looks up the language case-insensitively (russian / Russian / RUSSIAN are identical)', () => {
    const lower = buildTranslatePrompt('x', 'russian', UF).systemBlocks[1].text;
    const title = buildTranslatePrompt('x', 'Russian', UF).systemBlocks[1].text;
    const upper = buildTranslatePrompt('x', 'RUSSIAN', UF).systemBlocks[1].text;
    expect(title).toBe(lower);
    expect(upper).toBe(lower);
  });

  it('falls back to a safe generic instruction for an unknown label instead of throwing', () => {
    expect(() => buildTranslatePrompt('x', 'Klingon', UF)).not.toThrow();
    const instruction = buildTranslatePrompt('x', 'Klingon', UF).systemBlocks[1].text;
    expect(instruction).toContain('Klingon');
    expect(instruction).toMatch(/standard normative orthography/i);
    expect(instruction).not.toContain('[TARGET-LANGUAGE ORTHOGRAPHY]');
  });
});

describe('buildTranslatePrompt — per-language orthography', () => {
  it('en-GB uses British spelling guidance; en-US uses American', () => {
    expect(buildTranslatePrompt('x', 'English (en-GB)', UF).systemBlocks[1].text).toContain('British/European English');
    expect(buildTranslatePrompt('x', 'American English (en-US)', UF).systemBlocks[1].text).toContain('American English spelling');
  });

  it('pt-PT forbids Brazilian forms', () => {
    const instruction = buildTranslatePrompt('x', 'Portuguese (pt-PT)', UF).systemBlocks[1].text;
    expect(instruction).toMatch(/replaces Brazilian/i);
    expect(instruction).toContain('ficheiro');
  });
});

/**
 * The style guide is gated on BOTH the target language and the caller's intent. The
 * 'internal-matching-only' case is the load-bearing one: groundingSpecs() translates a spec sheet
 * into Ukrainian purely to produce anchor text that validateSpecsGrounding matches spec rows
 * against by stemmed label. The guide's anti-calque rules exist to change wording, so letting them
 * reach that call degrades the match and turns correctly grounded rows into false "hallucinated
 * row" errors. See TranslationContext's doc comment.
 */
describe('buildTranslatePrompt — Ukrainian style guide gating', () => {
  const instruction = (label: string, ctx: 'user-facing-content' | 'internal-matching-only') =>
    buildTranslatePrompt('x', label, ctx).systemBlocks[1].text;

  it('includes the style guide for a user-facing Ukrainian translation', () => {
    expect(instruction('Ukrainian', 'user-facing-content')).toContain(UA_TRANSLATION_STYLE_GUIDE);
  });

  it('OMITS the style guide for an internal-matching-only Ukrainian translation', () => {
    expect(instruction('Ukrainian', 'internal-matching-only')).not.toContain('[UKRAINIAN TRANSLATION STYLE GUIDE]');
  });

  it('omits the style guide for a non-Ukrainian target even when user-facing', () => {
    for (const label of ['German', 'Polish', 'russian', 'Spanish (es-ES)']) {
      expect(instruction(label, 'user-facing-content')).not.toContain('[UKRAINIAN TRANSLATION STYLE GUIDE]');
    }
  });

  it('is case-insensitive on the language label, same as config lookup', () => {
    expect(instruction('UKRAINIAN', 'user-facing-content')).toContain(UA_TRANSLATION_STYLE_GUIDE);
  });

  it('still emits exactly two system blocks — the guide rides inside block [1], not a third block', () => {
    const payload = buildTranslatePrompt('x', 'Ukrainian', 'user-facing-content');
    expect(payload.systemBlocks).toHaveLength(2);
    expect(payload.systemBlocks.every(b => b.cache === true)).toBe(true);
  });

  it('keeps the existing Ukrainian orthography notes alongside the guide, not instead of them', () => {
    const block = instruction('Ukrainian', 'user-facing-content');
    expect(block).toContain('[TARGET-LANGUAGE ORTHOGRAPHY]');
    expect(block).toContain('[UNIT LOCALIZATION]');
  });
});
