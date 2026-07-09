import { strippedVisibleLength } from './output-validator';

export interface LengthEntry {
  locale: string;
  context: string;
  html: string;
}

/**
 * Flags locales whose rendered length is far below the run's median — a relative,
 * cross-locale complement to output-validator's absolute per-templateId length floor.
 * Catches a locale that's dramatically shorter than its siblings even when it's still
 * above the absolute floor on its own (e.g. a partial cutoff on an unusually long,
 * spec-heavy product where 25% of a very long median is still a lot of characters).
 */
export function detectLengthOutliers(entries: LengthEntry[], ratio = 0.25): LengthEntry[] {
  const withContent = entries.filter(e => e.html && e.html.trim());
  if (withContent.length < 2) return [];

  const lengths = withContent.map(e => strippedVisibleLength(e.html)).sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  const median = lengths.length % 2 !== 0 ? lengths[mid] : (lengths[mid - 1] + lengths[mid]) / 2;
  if (median === 0) return [];

  const threshold = median * ratio;
  return withContent.filter(e => strippedVisibleLength(e.html) < threshold);
}
