/**
 * constants.no-image-deixis.spec.ts - US-9.1 T15 (FR-5, AC-2 first part, NFR-1, NFR-5): the
 * `NO_IMAGE_DEIXIS_RULE` constant.
 *
 * Specification FR-5: the master system prompt carries a block whose heading begins `[NO PICTURE REFERENCES`.
 * Its text is a constant in `constants.ts` (the source analysis calls it `NO_IMAGE_DEIXIS_RULE`; the plan
 * confirmed the name). This file pins the CONSTANT only. Its interpolation into the master, outside
 * `[IMAGE HANDLING]`, is T27 (frozen) and is pinned in `master-system-prompt.no-picture-references.spec.ts`.
 *
 * Normative literals (Specification FR-5): the value begins `[NO PICTURE REFERENCES`; within it the words
 * `figcaption` and `alt` and the phrases `«на зображенні»`, `«на фото»`, `«нижче»` and `deleted, not
 * reworded`. The restated block is ILLUSTRATIVE; wording beyond the literals is the builder's (H-OD13).
 * Q-TRANS option (2) (a translation-scope sentence beside these literals) was NOT chosen by the owner:
 * nothing is asserted about such a sentence, and the collision with the FR-20 self-scoping sentence is a
 * declared residual risk (R1d).
 *
 * The constant is read through `test/fixtures/us91-constants.ts`, so this spec is type-clean before T15 and
 * every test is red on its own with a message naming the missing export.
 */
import { describe, it, expect } from 'vitest';
import { STORE_REGISTRY } from './constants';
import { noImageDeixisRule, collapse, WATCH_ITEM_FORBIDDEN } from '../../test/fixtures/us91-constants';

describe('NO_IMAGE_DEIXIS_RULE - the FR-5 literals', () => {
  it('is exported from constants.ts as a string whose value begins with "[NO PICTURE REFERENCES"', () => {
    expect(noImageDeixisRule().trimStart().startsWith('[NO PICTURE REFERENCES')).toBe(true);
  });

  it('names the three carriers: body text, the figcaption and the alt', () => {
    const text = collapse(noImageDeixisRule());
    expect(text).toContain('figcaption');
    expect(text).toMatch(/\balt\b/);
  });

  it.each(['«на зображенні»', '«на фото»', '«нижче»', 'deleted, not reworded'])('contains the literal %j', literal => {
    expect(collapse(noImageDeixisRule())).toContain(literal);
  });
});

describe('NO_IMAGE_DEIXIS_RULE - static text (NFR-1, NFR-5)', () => {
  it('has no per-store or per-run content: no store name, no currency symbol, no unresolved interpolation', () => {
    const text = noImageDeixisRule();
    for (const [store, profile] of Object.entries(STORE_REGISTRY)) {
      expect(text, `store name ${store}`).not.toContain(store);
      expect(text, `currency symbol ${profile.currencySymbol}`).not.toContain(profile.currencySymbol);
    }
    expect(text).not.toContain('${');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('[object');
  });

  it('is a single stable value (two reads return the same bytes)', () => {
    expect(noImageDeixisRule()).toBe(noImageDeixisRule());
  });
});

describe('NO_IMAGE_DEIXIS_RULE - prose constraints from the watch items (plan D0.7, R21)', () => {
  it('contains none of §C1 to §C6, CONSUMABLES, "TRANSLATE the generic descriptor", "reorder it category-first", "fit-content"', () => {
    expect(noImageDeixisRule()).not.toMatch(WATCH_ITEM_FORBIDDEN);
  });
});
