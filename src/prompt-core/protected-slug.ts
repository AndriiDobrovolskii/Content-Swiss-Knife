/**
 * protected-slug.ts
 *
 * FR-10 of US-7.1: slug length enforcement for a PROTECTED product name. `enforceSlugLength` anchors
 * on the short `invariantCore`, which stops before descriptor words such as `resin-tank`, so it can
 * trim typed-name tokens (it is deliberately left unchanged, OD-6). This variant trims only tokens
 * that sit OUTSIDE the typed name's slug span:
 *
 *   (a) full slug > maxLen but the typed-name slug fits  -> trimmed to <= maxLen, typed-name slug whole;
 *   (b) the typed-name slug alone exceeds maxLen          -> that full typed-name slug, nothing trimmed.
 */
import { normalizeSlug, stripSlugStopwords } from './slug-utils';

const SLUG_HARD_MAX = 100;

export function enforceProtectedSlugLength(
  name: string,
  slug: string,
  typedName: string,
  language?: string,
  maxLen = SLUG_HARD_MAX,
): string {
  if (slug.length <= maxLen) return slug;

  const typedSlug = normalizeSlug(stripSlugStopwords(typedName), language);
  if (!typedSlug) return slug;
  if (typedSlug.length > maxLen) return typedSlug;

  const idx = slug.indexOf(typedSlug);
  // No anchor (the slug drifted from the typed name): accept it; FR-5 part 1 reports the drift.
  if (idx === -1) return slug;

  const prefixTokens = slug.slice(0, idx).replace(/-+$/, '').split('-').filter(Boolean);
  const tailTokens = slug.slice(idx + typedSlug.length).replace(/^-+/, '').split('-').filter(Boolean);
  const join = (prefix: string[], tail: string[]) => [...prefix, typedSlug, ...tail].join('-');

  // Drop tail tokens from the front first (the spec suffix sits last), then prefix tokens.
  for (let drop = 0; drop <= tailTokens.length; drop++) {
    const candidate = join(prefixTokens, tailTokens.slice(drop));
    if (candidate.length <= maxLen) return candidate;
  }
  for (let drop = 1; drop <= prefixTokens.length; drop++) {
    const candidate = join(prefixTokens.slice(drop), []);
    if (candidate.length <= maxLen) return candidate;
  }
  return typedSlug;
}
