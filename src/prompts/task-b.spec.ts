import { describe, it, expect } from 'vitest';
import { buildPromptB } from './task-b';

describe('buildPromptB', () => {
  const STORE = 'Expert-3DPrinter';  // valid store in STORE_REGISTRY (en-US + uk-UA languages)
  const PRODUCT = 'Bambu Lab X1C';
  const LANGS = ['en-US', 'uk-UA'];

  it('includes LOCALIZED NAMES block when localizedNames provided', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {
      'en-US': 'Bambu Lab X1C',
      'uk-UA': 'Принтер Bambu Lab X1C',
    });
    expect(payload.userContent).toContain('[LOCALIZED NAMES — use VERBATIM as h1 + title core, one per locale]:');
    expect(payload.userContent).toContain('  en-US: "Bambu Lab X1C"');
    expect(payload.userContent).toContain('  uk-UA: "Принтер Bambu Lab X1C"');
  });

  it('uses fallback label for locales missing from localizedNames', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {
      'en-US': 'Bambu Lab X1C',
      // uk-UA intentionally absent
    });
    expect(payload.userContent).toContain('  uk-UA: "(none — use formula fallback)"');
  });

  it('omits LOCALIZED NAMES block when localizedNames is undefined', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS);
    expect(payload.userContent).not.toContain('[LOCALIZED NAMES');
  });

  it('omits LOCALIZED NAMES block when localizedNames is empty object', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {});
    expect(payload.userContent).not.toContain('[LOCALIZED NAMES');
  });

  it('systemBlocks are identical regardless of localizedNames (cache stability)', () => {
    const without = buildPromptB(STORE, PRODUCT, LANGS);
    const with_ = buildPromptB(STORE, PRODUCT, LANGS, undefined, { 'en-US': 'X' });
    expect(without.systemBlocks[0].text).toBe(with_.systemBlocks[0].text);
    expect(without.systemBlocks[1].text).toBe(with_.systemBlocks[1].text);
  });

  it('systemBlocks have cache:true on both blocks', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS);
    expect(payload.systemBlocks).toHaveLength(2);
    expect(payload.systemBlocks[0].cache).toBe(true);
    expect(payload.systemBlocks[1].cache).toBe(true);
  });

  it('localizedNames block appears after [Target Languages] and before [CONTEXT]', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, 'some html context', {
      'en-US': 'X',
      'uk-UA': 'Х',
    });
    const namesIdx = payload.userContent.indexOf('[LOCALIZED NAMES');
    const ctxIdx = payload.userContent.indexOf('[CONTEXT');
    const langsIdx = payload.userContent.indexOf('[Target Languages]');
    expect(namesIdx).toBeGreaterThan(langsIdx);
    expect(namesIdx).toBeLessThan(ctxIdx);
  });
});
