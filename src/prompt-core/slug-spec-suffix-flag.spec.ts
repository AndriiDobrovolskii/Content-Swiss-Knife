/**
 * slug-spec-suffix-flag.spec.ts
 *
 * The rollout switch for the killer-spec slug-suffix feature. Starts with an EMPTY allow-list —
 * this is the merge gate for PR-1: shipping the machinery with the feature reachable by no store
 * yet, so turning it on for a store is a separate, later, one-line decision.
 */
import { describe, it, expect } from 'vitest';

import { SLUG_SPEC_SUFFIX_STORES, usesSlugSpecSuffix } from './slug-spec-suffix-flag';
import { STORE_REGISTRY } from './constants';

describe('usesSlugSpecSuffix', () => {
  it('starts opt-in with an empty allow-list — no store enabled at merge time', () => {
    expect(SLUG_SPEC_SUFFIX_STORES).toEqual([]);
  });

  it('is off for every real store while the allow-list is empty', () => {
    const enabled = Object.keys(STORE_REGISTRY).filter(s => usesSlugSpecSuffix(s));
    expect(enabled).toEqual([]);
  });

  it('is opt-in — an unknown store is not enrolled', () => {
    expect(usesSlugSpecSuffix('Some New Store')).toBe(false);
  });

  /** Every listed store must be real, or the flag silently does nothing for a typo. */
  it('lists only stores that exist in the registry', () => {
    const unknown = SLUG_SPEC_SUFFIX_STORES.filter(s => !(s in STORE_REGISTRY));
    expect(unknown).toEqual([]);
  });
});
