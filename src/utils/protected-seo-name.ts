/**
 * protected-seo-name.ts
 *
 * FR-4 / OD-12 default of US-7.1: the "core name" fed to the SEO Meta prompt (Task B) as its
 * `localizedNames`. Task B uses it verbatim as the H1 and as the meta_title core, and the existing
 * long-H1 canonicalisation fires once an H1 reaches 54 code points (`isH1Unreachable`). For a
 * protected name the full typed name outranks the localized category noun (OD-2), so when
 * `category + typed name` would reach 54 code points the category is dropped and the typed name
 * alone is the core. Below 54 the localized name, category included, is kept.
 *
 * Lengths are counted in code points, never UTF-16 units. Pure function.
 */

/** Same ceiling as `isH1Unreachable` in seo-metadata-shape.ts: an H1 of this many code points or more is too long. */
const H1_CATEGORY_CEILING = 54;

export function seoCoreName(localizedName: string, typedName: string, isProtected: boolean): string {
  if (!isProtected) return localizedName;
  const typed = typedName.trim();
  if (!typed) return localizedName;
  return Array.from(localizedName).length >= H1_CATEGORY_CEILING ? typed : localizedName;
}
