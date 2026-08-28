import { describe, it, expect } from 'vitest';
import { SLUG_CONTEXT_ENRICHMENT_STORES, usesSlugContextEnrichment } from './slug-context-enrichment-flag';

describe('usesSlugContextEnrichment', () => {
  it('is opt-in — only stores explicitly on the list are enabled', () => {
    expect(SLUG_CONTEXT_ENRICHMENT_STORES).toEqual(['Center 3D Print']);
  });

  it('returns true for an allow-listed store, false for everything else', () => {
    expect(usesSlugContextEnrichment('Center 3D Print')).toBe(true);
    expect(usesSlugContextEnrichment('EXPERT3D')).toBe(false);
    expect(usesSlugContextEnrichment('')).toBe(false);
  });
});
