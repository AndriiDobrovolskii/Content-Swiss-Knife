/**
 * Row timestamp, cost, seconds and summary pieces of the Image Studio (US-10.5 FR-2, FR-4, NFR-4; plan DD-13).
 *
 * Pure and deterministic: the row timestamp is computed by integer arithmetic from an epoch and an explicit offset
 * (minutes EAST of UTC), never from the host clock or the host time zone, so the same inputs read the same on every
 * machine and in every test.
 */

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Converts a count of days since 1970-01-01 to a proleptic Gregorian month (1..12) and day of month (1..31).
 * Integer arithmetic only (the civil-from-days algorithm).
 */
function civilMonthDay(daysSinceEpoch: number): { month: number; day: number } {
  const z = daysSinceEpoch + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097; // 0..146096
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365); // 0..399
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100)); // 0..365, March-based
  const mp = Math.floor((5 * dayOfYear + 2) / 153); // 0..11, March = 0
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { month, day };
}

/**
 * `dd.MM · HH:mm` (24-hour) of the instant `epochMs` in the device-local time `UTC + offsetMinutes`.
 * `offsetMinutes` is minutes east of UTC (UTC+2 is +120). The year is not shown.
 */
export function formatRowDate(epochMs: number, offsetMinutes: number): string {
  const localMinutes = Math.floor(epochMs / MS_PER_MINUTE) + offsetMinutes;
  const days = Math.floor(localMinutes / MINUTES_PER_DAY);
  const minuteOfDay = localMinutes - days * MINUTES_PER_DAY;
  const { month, day } = civilMonthDay(days);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${pad2(day)}.${pad2(month)} · ${pad2(hours)}:${pad2(minutes)}`;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** `$` + two decimals for a finite number >= 0 (a stored zero renders `$0.00`); null for anything else. */
export function formatCost(cost: unknown): string | null {
  return isNonNegativeFinite(cost) ? `$${cost.toFixed(2)}` : null;
}

/** One decimal of `durationMs / 1000` for a finite number >= 0; null for anything else. */
export function formatSeconds(durationMs: unknown): string | null {
  return isNonNegativeFinite(durationMs) ? (durationMs / 1000).toFixed(1) : null;
}

/** The non-empty segments joined by ` · `; a missing segment drops its separator (FR-4 partial-field rule). */
export function joinSummary(segments: ReadonlyArray<string | null | undefined>): string {
  return segments.filter((s): s is string => typeof s === 'string' && s !== '').join(' · ');
}
