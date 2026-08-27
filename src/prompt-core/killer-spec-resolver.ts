import type { ProductDescriptionDoc } from '../domain/description-doc';

/** A killer spec whose key is confirmed present in SPEC_LABEL_REGISTRY for at least one locale. */
export interface ResolvedKillerSpec {
  key: string;
  value: string;
}

/**
 * D1: the killer spec a slug suffix is built from is `killerSpecs[0]` — whichever the model itself
 * listed first for this product — with no comparison across the other 2-3 entries.
 *
 * This is deliberately NOT a precedence ranking over the registry's known categories. An earlier
 * design gated the suffix on "exactly one killer spec matches the registry", which measured at 0%
 * coverage against the only two real corpus docs available (both have {power, working-area, speed}
 * present together) — and the natural fix, ranking which category should "win" when several are
 * present, was rejected on the grounds that killer-spec categories are open-ended (those same two
 * docs also contain "smart-camera" and "max-object-height", neither anywhere near a fixed list).
 * Taking the model's own first-listed spec sidesteps needing that ranking at all: nothing here
 * compares specs against each other, so there is no order to get wrong.
 *
 * Returns `null` when there is no Doc (the standalone Slug UI mode never has one — see
 * killer-spec-from-html.ts for that path instead) or the Doc has no killer specs. Does NOT check
 * `key` against SPEC_LABEL_REGISTRY — that lookup is per target language and happens once per
 * locale in buildSlugWithSpec (slug-utils.ts), while a single resolved spec here is shared across
 * every language a Slug generation call produces.
 */
export function resolveKillerSpecFromDoc(doc: ProductDescriptionDoc | undefined): ResolvedKillerSpec | null {
  const first = doc?.killerSpecs?.[0];
  if (!first?.key || !first?.value) return null;
  return { key: first.key, value: String(first.value).trim() };
}
