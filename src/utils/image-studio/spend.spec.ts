/**
 * spend.spec.ts - US-10.6 T13 (FR-18, FR-19, NFR-5; AC-12).
 *
 * PINNED CONTRACT (src/utils/image-studio/spend.ts; pure, integer arithmetic on an INJECTED clock reading - no `new Date(`, no `Date.now`, no `window.`):
 *   utcDayStart(ms): number                       00:00:00.000 UTC of the UTC date containing `ms`
 *   utcMonthStart(ms): number                     00:00:00.000 UTC of the first day of the UTC month containing `ms`
 *   sumImageStudioSpend(rows, nowMs): { today: number, month: number }
 *       rows are usage records ({ ts, mode, taskLabel, costUsd, ... }) from GET /api/usage. An Image Studio row is one whose `taskLabel` STARTS WITH
 *       `image-studio|` AND whose `mode` is null (OD-3 a, AC-12). today / month are the sums of the STORED, UNROUNDED costUsd of those rows with
 *       dayStart(now) <= ts <= now (resp. monthStart(now) <= ts <= now). No rows give { today: 0, month: 0 }. Nothing is rounded here (display rounds).
 * The expected instants are built with Date.UTC and never from the host clock or the host time zone, so the spec reads the same on every machine.
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const U = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) => Date.UTC(y, m - 1, d, h, min, s, ms);

let seq = 0;
const row = (ts: number, costUsd: number, over: Record<string, unknown> = {}) => ({
  id: ++seq, ts, provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, taskLabel: 'image-studio|none|1K', productName: null, store: null, lang: null,
  inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, costUsd, ...over,
});
const textRow = (ts: number, costUsd: number, over: Record<string, unknown> = {}) => row(ts, costUsd, { provider: 'anthropic', model: 'claude-sonnet-5-5', mode: 'generator', taskLabel: 'task-a', ...over });

describe('utcDayStart / utcMonthStart (T13, FR-19)', () => {
  it('FR-19: the day starts at 00:00:00.000 UTC of the UTC date, whatever the time of day', async () => {
    const { utcDayStart } = await load('./spend');
    expect(utcDayStart(U(2026, 11, 14, 23, 30))).toBe(U(2026, 11, 14));
    expect(utcDayStart(U(2026, 11, 14, 0, 0, 0, 1))).toBe(U(2026, 11, 14));
    expect(utcDayStart(U(2026, 11, 14, 12))).toBe(U(2026, 11, 14));
  });

  it('FR-19: the instant 00:00:00.000 UTC starts its own day, and one millisecond earlier is still the previous day', async () => {
    const { utcDayStart } = await load('./spend');
    expect(utcDayStart(U(2026, 11, 14))).toBe(U(2026, 11, 14));
    expect(utcDayStart(U(2026, 11, 14) - 1)).toBe(U(2026, 11, 13));
  });

  it('FR-19: the month starts at 00:00:00.000 UTC of the first of the UTC month; month ends, year ends and a leap February are handled', async () => {
    const { utcMonthStart } = await load('./spend');
    expect(utcMonthStart(U(2026, 11, 14, 23, 30))).toBe(U(2026, 11, 1));
    expect(utcMonthStart(U(2026, 11, 30, 23, 59, 59, 999))).toBe(U(2026, 11, 1));
    expect(utcMonthStart(U(2026, 12, 1))).toBe(U(2026, 12, 1));
    expect(utcMonthStart(U(2026, 12, 1) - 1)).toBe(U(2026, 11, 1));
    expect(utcMonthStart(U(2027, 1, 1))).toBe(U(2027, 1, 1));
    expect(utcMonthStart(U(2028, 2, 29, 10))).toBe(U(2028, 2, 1));
    expect(utcMonthStart(U(2028, 3, 1))).toBe(U(2028, 3, 1));
  });
});

describe('sumImageStudioSpend (T13, FR-18, FR-19, AC-12)', () => {
  const NOW = U(2026, 11, 14, 23, 45);

  it('AC-12 / FR-19: a row written at 23:30 UTC counts for that UTC day (not for the next day of an operator in UTC+2)', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const out = sumImageStudioSpend([row(U(2026, 11, 14, 23, 30), 0.25)], NOW);
    expect(out.today).toBeCloseTo(0.25, 12);
    expect(out.month).toBeCloseTo(0.25, 12);
  });

  it('FR-19: the last millisecond of the previous UTC day is in the month but NOT in today; 00:00:00.000 of today is in today', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const out = sumImageStudioSpend([row(U(2026, 11, 14) - 1, 1), row(U(2026, 11, 14), 10)], NOW);
    expect(out.today).toBeCloseTo(10, 12);
    expect(out.month).toBeCloseTo(11, 12);
  });

  it('FR-19: a row before the start of the UTC month is in neither total; the first instant of the month is in the month', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const out = sumImageStudioSpend([row(U(2026, 11, 1) - 1, 100), row(U(2026, 11, 1), 5)], NOW);
    expect(out.today).toBe(0);
    expect(out.month).toBeCloseTo(5, 12);
  });

  it('AC-12: text-generation rows are NOT included - an old row, a task row, and a prefix look-alike are all excluded', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const t = U(2026, 11, 14, 10);
    const out = sumImageStudioSpend([
      row(t, 1),                                                  // Image Studio, new
      row(t, 2, { taskLabel: 'image-studio|white-bg|2K' }),       // Image Studio with a preset
      textRow(t, 1000),                                           // text generation
      textRow(t, 1000, { taskLabel: null, mode: null }),          // a null taskLabel is not an Image Studio row
      row(t, 1000, { taskLabel: 'image-studio' }),                // no pipe: not the marker
      row(t, 1000, { taskLabel: 'x-image-studio|none|1K' }),      // the marker is a PREFIX
      row(t, 1000, { mode: 'generator' }),                        // the right label but a mode: not an Image Studio row (OD-3 a)
    ], NOW);
    expect(out.today).toBeCloseTo(3, 12);
    expect(out.month).toBeCloseTo(3, 12);
  });

  it('OD-3 (a): rows written before and after this Story are counted by ONE rule - the taskLabel prefix with a null mode', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const out = sumImageStudioSpend([
      row(U(2026, 11, 2), 0.03, { taskLabel: 'image-studio|none|1K' }),
      row(U(2026, 11, 13), 0.06, { taskLabel: 'image-studio|lifestyle|2K' }),
      row(U(2026, 11, 14, 8), 0.5, { taskLabel: 'image-studio|user-lw3x9k|4K' }),
    ], NOW);
    expect(out.month).toBeCloseTo(0.59, 12);
    expect(out.today).toBeCloseTo(0.5, 12);
  });

  it('FR-18 (e): the stored costUsd values are summed UNROUNDED - three rows of 0.014 give 0.042, not 0.03 (rounding each) and not 0.04', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const t = U(2026, 11, 14, 9);
    const out = sumImageStudioSpend([row(t, 0.014), row(t, 0.014), row(t, 0.014)], NOW);
    expect(out.today).toBeCloseTo(0.042, 12);
    expect(out.month).toBeCloseTo(0.042, 12);
  });

  it('FR-18: no rows, or only text-generation rows, give 0 for both totals (a month with no Image Studio rows shows $0.00)', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    expect(sumImageStudioSpend([], NOW)).toEqual({ today: 0, month: 0 });
    expect(sumImageStudioSpend([textRow(U(2026, 11, 14, 9), 9)], NOW)).toEqual({ today: 0, month: 0 });
  });

  it('NFR-5: the result depends only on the injected now - the same rows at an earlier now give different totals', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const rows = [row(U(2026, 11, 14, 9), 1), row(U(2026, 11, 3), 2)];
    expect(sumImageStudioSpend(rows, U(2026, 11, 14, 12))).toEqual({ today: 1, month: 3 });
    expect(sumImageStudioSpend(rows, U(2026, 11, 3, 12))).toEqual({ today: 2, month: 2 });
  });

  it('does not mutate the rows it is given', async () => {
    const { sumImageStudioSpend } = await load('./spend');
    const rows = [row(U(2026, 11, 14, 9), 1), textRow(U(2026, 11, 14, 9), 4)];
    const before = structuredClone(rows);
    sumImageStudioSpend(rows, NOW);
    expect(rows).toEqual(before);
  });
});
