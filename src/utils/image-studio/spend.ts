/**
 * UTC day / month boundaries and the Image Studio spend selection (US-10.6 T13; FR-18, FR-19, NFR-5; AC-12).
 *
 * Pure and deterministic: every boundary is integer arithmetic on an INJECTED clock reading (epoch milliseconds), never
 * the host clock or the host time zone, so the same inputs read the same on every machine. The spend figures are UTC-day
 * and UTC-month totals by design (FR-19): a row stamped 23:30 UTC belongs to that UTC day for an operator in UTC+2.
 *
 * An Image Studio usage row is identified by the `taskLabel` prefix `image-studio|` together with a null `mode`
 * (OD-3 a, AC-12); the server writes that marker in `server/image-studio/usage-row.js`. The client selects rows from the
 * existing GET /api/usage result; no server filter exists.
 */

const MS_PER_DAY = 86_400_000;

/** The marker every Image Studio usage row carries as the START of its `taskLabel`. */
const IMAGE_STUDIO_LABEL_PREFIX = 'image-studio|';

/** The fields of a usage row this module reads (a structural subset of the `/api/usage` record). */
export interface SpendRow {
  readonly ts: number;
  readonly mode: string | null;
  readonly taskLabel: string | null;
  readonly costUsd: number;
}

export interface ImageStudioSpend {
  today: number;
  month: number;
}

/** Whole UTC days since 1970-01-01 containing `ms` (floor, so instants before the epoch also resolve correctly). */
function utcDaysSinceEpoch(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

/**
 * Day of month (1..31) of a count of days since 1970-01-01, proleptic Gregorian. Integer arithmetic only
 * (the civil-from-days algorithm, as in `format.ts`).
 */
function civilDayOfMonth(daysSinceEpoch: number): number {
  const z = daysSinceEpoch + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097; // 0..146096
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365); // 0..399
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100)); // 0..365, March-based
  const mp = Math.floor((5 * dayOfYear + 2) / 153); // 0..11, March = 0
  return dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
}

/** 00:00:00.000 UTC of the UTC date containing `ms`. */
export function utcDayStart(ms: number): number {
  return utcDaysSinceEpoch(ms) * MS_PER_DAY;
}

/** 00:00:00.000 UTC of the first day of the UTC month containing `ms`. */
export function utcMonthStart(ms: number): number {
  const days = utcDaysSinceEpoch(ms);
  return (days - (civilDayOfMonth(days) - 1)) * MS_PER_DAY;
}

function isImageStudioRow(row: SpendRow): boolean {
  return row.mode === null && typeof row.taskLabel === 'string' && row.taskLabel.startsWith(IMAGE_STUDIO_LABEL_PREFIX);
}

/**
 * Sums the STORED, UNROUNDED `costUsd` of the Image Studio rows for the current UTC day and UTC month, where "current"
 * is the injected `nowMs`. A row counts when `start <= ts <= nowMs`. No Image Studio rows give `{ today: 0, month: 0 }`.
 * Nothing is rounded here; display rounds. The rows are not mutated.
 */
export function sumImageStudioSpend(rows: ReadonlyArray<SpendRow>, nowMs: number): ImageStudioSpend {
  const dayStart = utcDayStart(nowMs);
  const monthStart = utcMonthStart(nowMs);
  let today = 0;
  let month = 0;
  for (const row of rows) {
    if (!isImageStudioRow(row) || row.ts < monthStart || row.ts > nowMs) continue;
    month += row.costUsd;
    if (row.ts >= dayStart) today += row.costUsd;
  }
  return { today, month };
}
