/**
 * US-10.5 T7 - the row date, cost, seconds and summary pieces (FR-2, FR-4, NFR-4; plan DD-13).
 *
 * PINNED CONTRACT (src/utils/image-studio/format.ts, owner T7; pure, no `Date`, no `window`: architecture scan g):
 *   formatRowDate(epochMs: number, offsetMinutes: number): string   `dd.MM · HH:mm`, 24-hour, device local time = UTC + offset;
 *                                                                   offsetMinutes is minutes EAST of UTC (UTC+2 = +120)
 *   formatCost(cost: unknown): string | null                        `$` + toFixed(2) for a finite number >= 0, otherwise null
 *   formatSeconds(durationMs: unknown): string | null               (durationMs / 1000).toFixed(1) for a finite number >= 0, else null
 *   joinSummary(segments: Array<string | null | undefined>): string  the non-empty segments joined by ` · `; a missing segment
 *                                                                   drops its separator (FR-4 failure path)
 * A spec may use `Date.UTC` to build a known instant: the ban on `Date` is for the non-spec files of src/utils/image-studio.
 * Logic runner. Red until T7.
 */
import { describe, it, expect } from 'vitest';
import { formatRowDate, formatCost, formatSeconds, joinSummary } from './format';

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);

describe('FR-2: formatRowDate renders dd.MM · HH:mm in local time from an explicit offset (T7)', () => {
  const t = utc(2026, 11, 8, 20, 15);

  it.each([
    [0, '08.11 · 20:15'],
    [120, '08.11 · 22:15'],
    [-300, '08.11 · 15:15'],
    [330, '09.11 · 01:45'],
    [-720, '08.11 · 08:15'],
    [840, '09.11 · 10:15'],
  ])('offset %i minutes gives %s', (offset, expected) => {
    expect(formatRowDate(t, offset)).toBe(expected);
  });

  it('zero-pads day, month, hour and minute', () => {
    expect(formatRowDate(utc(2026, 1, 5, 3, 7), 0)).toBe('05.01 · 03:07');
  });

  it('rolls the day over at midnight in both directions', () => {
    expect(formatRowDate(utc(2026, 11, 8, 23, 59), 1)).toBe('09.11 · 00:00');
    expect(formatRowDate(utc(2026, 11, 9, 0, 0), -1)).toBe('08.11 · 23:59');
  });

  it('rolls the month over (31 October + 30 minutes of offset past midnight is 1 November)', () => {
    expect(formatRowDate(utc(2026, 10, 31, 23, 30), 60)).toBe('01.11 · 00:30');
    expect(formatRowDate(utc(2026, 11, 1, 0, 30), -60)).toBe('31.10 · 23:30');
  });

  it('rolls the year over (the date shows no year, so 31 December 23:30 UTC at +60 reads 01.01)', () => {
    expect(formatRowDate(utc(2026, 12, 31, 23, 30), 60)).toBe('01.01 · 00:30');
  });

  it('handles a leap day: 28 February 23:30 UTC at +60 is 29.02 in 2028 and 01.03 in 2026', () => {
    expect(formatRowDate(utc(2028, 2, 28, 23, 30), 60)).toBe('29.02 · 00:30');
    expect(formatRowDate(utc(2026, 2, 28, 23, 30), 60)).toBe('01.03 · 00:30');
  });

  it('two different offsets for the same instant give two different strings (the offset is what is read, not a time zone variable)', () => {
    expect(formatRowDate(t, 0)).not.toBe(formatRowDate(t, 120));
  });
});

describe('FR-4: cost and seconds pieces (T7)', () => {
  it('formatCost: $ and two decimals', () => {
    expect(formatCost(0.12)).toBe('$0.12');
    expect(formatCost(0.067)).toBe('$0.07');
    expect(formatCost(1.5)).toBe('$1.50');
  });

  it('formatCost: a stored zero is a valid cost and renders $0.00 (it is a number, not a missing value)', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it.each([[undefined], [null], [Number.NaN], [-0.01], [Number.POSITIVE_INFINITY], ['abc'], ['0.12']])(
    'formatCost(%s) is null: a missing or invalid value never renders as $0.00, NaN or undefined', (v) => {
      expect(formatCost(v)).toBeNull();
    });

  it('formatSeconds: one decimal of the duration in seconds', () => {
    expect(formatSeconds(12_400)).toBe('12.4');
    expect(formatSeconds(800)).toBe('0.8');
    expect(formatSeconds(0)).toBe('0.0');
    expect(formatSeconds(59_999)).toBe('60.0');
  });

  it.each([[undefined], [null], [Number.NaN], [-1], [Number.POSITIVE_INFINITY], ['12']])(
    'formatSeconds(%s) is null', (v) => {
      expect(formatSeconds(v)).toBeNull();
    });
});

describe('FR-4 failure path: joinSummary drops a missing segment together with its separator (T7)', () => {
  it('all three segments are joined by " · "', () => {
    expect(joinSummary(['2 images', '$0.12', '12.4 s'])).toBe('2 images · $0.12 · 12.4 s');
  });

  it('a missing cost drops its separator, a missing duration drops its separator', () => {
    expect(joinSummary(['2 images', null, '12.4 s'])).toBe('2 images · 12.4 s');
    expect(joinSummary(['2 images', '$0.12', null])).toBe('2 images · $0.12');
    expect(joinSummary(['1 image', undefined, undefined])).toBe('1 image');
  });

  it('nothing at all gives an empty string (the caller then renders no summary line)', () => {
    expect(joinSummary([null, null, null])).toBe('');
    expect(joinSummary([])).toBe('');
  });

  it('composed from the pieces with a missing cost and duration, the line has no NaN, undefined, $0.00 or dangling separator', () => {
    const line = joinSummary(['3 images', formatCost(undefined), formatSeconds(undefined)]);
    expect(line).toBe('3 images');
    expect(line).not.toMatch(/NaN|undefined|\$0\.00|·\s*$/);
  });
});
