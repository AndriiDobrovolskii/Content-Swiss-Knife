import { describe, it, expect } from 'vitest';
import { resolveSpecLabel, isKnownSpecKey, SPEC_LABEL_REGISTRY } from './slug-spec-labels';

describe('resolveSpecLabel', () => {
  it('resolves a known key/locale pair', () => {
    expect(resolveSpecLabel('power', 'uk-UA')).toBe('потужність');
    expect(resolveSpecLabel('accuracy', 'pl-PL')).toBe('dokładność');
  });

  it('returns null for a key the model coined that is not in the registry', () => {
    expect(resolveSpecLabel('smart-camera', 'uk-UA')).toBeNull();
  });

  it('returns null for a known key in an unmapped locale', () => {
    expect(resolveSpecLabel('power', 'fr-FR')).toBeNull();
  });

  /**
   * Every store language (STORE_REGISTRY, constants.ts) must be covered for every key — a gap
   * would silently drop the suffix for one locale of an otherwise-eligible product.
   */
  it('covers every live store language for every registered key', () => {
    const liveLanguages = [
      'uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'en-GB', 'en-ES', 'es-ES', 'pt-PT', 'es-MX', 'en-US',
    ];
    for (const [key, labels] of Object.entries(SPEC_LABEL_REGISTRY)) {
      for (const lang of liveLanguages) {
        expect(labels[lang], `${key}/${lang}`).toBeDefined();
      }
    }
  });
});

describe('isKnownSpecKey', () => {
  it('is true for every key actually in the registry', () => {
    for (const key of Object.keys(SPEC_LABEL_REGISTRY)) expect(isKnownSpecKey(key)).toBe(true);
  });

  it('is false for a key the model coined that drifted from the known vocabulary', () => {
    expect(isKnownSpecKey('scan-accuracy')).toBe(false);
    expect(isKnownSpecKey('smart-camera')).toBe(false);
  });
});
