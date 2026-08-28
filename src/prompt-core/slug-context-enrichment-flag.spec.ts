import { describe, it, expect } from 'vitest';
import { SLUG_CONTEXT_ENRICHMENT_STORES, usesSlugContextEnrichment } from './slug-context-enrichment-flag';

describe('usesSlugContextEnrichment', () => {
  it('starts empty — opt-in, never opt-out', () => {
    expect(SLUG_CONTEXT_ENRICHMENT_STORES).toEqual([]);
  });

  it('returns false for any store while the allow-list is empty', () => {
    expect(usesSlugContextEnrichment('EXPERT3D')).toBe(false);
    expect(usesSlugContextEnrichment('Center 3D Print')).toBe(false);
    expect(usesSlugContextEnrichment('')).toBe(false);
  });
});
