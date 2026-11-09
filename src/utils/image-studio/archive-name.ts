/**
 * The "Download all" archive name (US-10.5 FR-12, Story v5 AC-6, plan DD-8):
 *
 *   {YYYYMMDD-HHMMSS}-{K}.zip        for example  20261108-181530-red-sneakers-on-white.zip
 *
 * - The timestamp is UTC, computed by integer civil-date arithmetic from the epoch value: no `Date`, no local offset
 *   (architecture scan g), so the result is a pure function of the name and the instant.
 * - K is the kebab string of the ratified order: transliterate (Ukrainian national scheme), lower-case, every run of
 *   characters outside `a-z0-9` becomes one hyphen, leading and trailing hyphens are trimmed.
 * - K is then cut by `cutToWordBoundary(K, 40)`.
 * - An empty K gives `{timestamp}-image-studio-versions.zip`.
 */
import { transliterateUk } from './transliterate-uk';

export const ARCHIVE_NAME_LIMIT = 40;
const FALLBACK_STEM = 'image-studio-versions';
const MS_PER_DAY = 86_400_000;

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Days since 1970-01-01 to a proleptic Gregorian civil date (Howard Hinnant's algorithm). */
function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const dayOfEra = z - era * 146_097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36_524) - Math.floor(dayOfEra / 146_096)) / 365);
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

function utcTimestamp(epochMs: number): string {
  const days = Math.floor(epochMs / MS_PER_DAY);
  const msOfDay = epochMs - days * MS_PER_DAY;
  const { year, month, day } = civilFromDays(days);
  const hours = Math.floor(msOfDay / 3_600_000);
  const minutes = Math.floor((msOfDay % 3_600_000) / 60_000);
  const seconds = Math.floor((msOfDay % 60_000) / 1000);
  return `${pad(year, 4)}${pad(month, 2)}${pad(day, 2)}-${pad(hours, 2)}${pad(minutes, 2)}${pad(seconds, 2)}`;
}

function toKebab(name: string): string {
  return transliterateUk(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The owner's cut rule, on the already-normalised kebab string: a string of at most `limit` characters is unchanged;
 * a longer one is cut before the last hyphen that lies within its first `limit + 1` characters (so a name that ends
 * exactly before a hyphen at position `limit + 1` keeps all `limit` characters); with no such hyphen it is cut at `limit`.
 */
export function cutToWordBoundary(k: string, limit: number): string {
  if (k.length <= limit) return k;
  const lastHyphen = k.slice(0, limit + 1).lastIndexOf('-');
  const cut = lastHyphen > 0 ? k.slice(0, lastHyphen) : k.slice(0, limit);
  return cut.replace(/-+$/, '');
}

export function buildArchiveName(sessionName: string, epochMs: number): string {
  const stem = cutToWordBoundary(toKebab(sessionName), ARCHIVE_NAME_LIMIT) || FALLBACK_STEM;
  return `${utcTimestamp(epochMs)}-${stem}.zip`;
}
