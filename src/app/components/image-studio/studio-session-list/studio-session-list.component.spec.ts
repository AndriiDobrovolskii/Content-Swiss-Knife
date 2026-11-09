/**
 * US-10.1 T44 / US-10.5 T24 + T25 + T40 - StudioSessionListComponent: the stored sessions as rows (name, local date, own cost) under a count line.
 * Covers FR-48, FR-86, AC-26 (US-10.1: the list, expiry, the cap) and FR-2, AC-2, NFR-4 (US-10.5).
 *
 * US-10.5 DISPOSITIONS (Specification FR-32 table D-4, approved by the owner with SQ-5-B), each listed in the test generation report:
 *   - the cost-line tests (old L151-181: "Estimated cost: {amount}" of the CURRENT session) are REMOVED: FR-2 removes the overall-cost line, and the
 *     per-row cost is pinned by the new row tests below;
 *   - the "New session" tests (old L57-148: confirmation T-23, creation, cap eviction) MOVED to studio-header.component.spec.ts, substance kept;
 *   - the heading assertions (old L37 "Sessions" heading, L41-45 heading + button in uk) are REPLACED by the "N sessions" count line tests.
 *   - selecting a row (old L165) is kept as its own test.
 *
 * Component runner. Real root store over the in-memory session store; the local-time offset comes from the fake LOCAL_OFFSET_PORT
 * (`offsetMinutes` render option, minutes EAST of UTC) - no TZ variable and no wall clock (NFR-4). The fake clock starts at 1 000 000 ms, and
 * `makeSession` stamps lastActivity = 1 000 000 ms = 1970-01-01 00:16:40 UTC, so the expected row dates are fixed literals.
 * Contract (helpers/studio-render.ts): the rows are the listitems of the list; each holds one button that selects the session; a row shows
 * the session name (absent when empty), the date `dd.MM · HH:mm` and the cost `$0.00`. The T25 describes are type-clean from T21.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { StudioSessionListComponent } from './studio-session-list.component';
import { renderStudio, LABELS, textOf } from '../../../../../test/image-studio/helpers/studio-render';
import { makeSession, type StoredSession } from '../../../../../test/image-studio/helpers/fakes';

const NOW = 1_000_000; // the fake clock starts here; every stamp below is well inside the 7-day window
const id2 = (n: number) => `a${String(n).padStart(2, '0')}`;

/** Twenty sessions a01..a20 whose creation order is the REVERSE of their activity order: a01 is newest-active, a20 oldest-active. */
function twenty(): StoredSession[] {
  return Array.from({ length: 20 }, (_, i) => makeSession(id2(i + 1), { createdAt: NOW - 100_000 + i, lastActivity: NOW - i * 1000 }));
}
const rows = () => within(screen.getByRole('list')).queryAllByRole('listitem');
const norm = (el: Element) => textOf(el);

describe('FR-86 / AC-26 / FR-2: the list shows the stored sessions, at most twenty, under a count line (T25)', () => {
  it('twenty stored sessions are twenty rows, under the line "20 sessions" - and there is no "Sessions" heading any more', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    expect(screen.getByText('20 sessions')).toBeDefined();
    expect(rows()).toHaveLength(20);
    expect(screen.queryByText('Sessions')).toBeNull();
  });

  it.each([
    [1, '1 session', '1 сесія'], [2, '2 sessions', '2 сесії'], [5, '5 sessions', '5 сесій'],
  ])('the count line for %i session(s) is "%s" in English and "%s" in Ukrainian (plural forms by the CLDR rule)', async (n, en, uk) => {
    const sessions = Array.from({ length: n }, (_, i) => makeSession(id2(i + 1), { lastActivity: NOW - i * 1000 }));
    const h = await renderStudio(StudioSessionListComponent, { sessions });
    expect(screen.getByText(en)).toBeDefined();
    await h.setLang('uk');
    expect(screen.getByText(uk)).toBeDefined();
    expect(screen.queryByText(en)).toBeNull();
  });

  it('shows no search hint (Ctrl+K search is not part of this Story)', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1')] });
    expect(screen.queryByText(/Ctrl\s*\+?\s*K/i)).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('FR-1 failure path / D-4: the list holds no "New session" button any more (it moved to the header)', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1')] });
    expect(screen.queryByRole('button', { name: LABELS.en.newSession })).toBeNull();
  });

  it('FR-2 / D-4: the overall "Estimated cost" line is not rendered anywhere in the list', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1', { costUsd: 0.12 })] });
    expect(screen.queryByText(/Estimated cost/i)).toBeNull();
    expect(screen.queryByText(/Орієнтовна вартість/)).toBeNull();
  });

  it('FR-48 / SD-33: a session older than seven days is gone from the list after the load (expiry at load, not on a timer)', async () => {
    const fresh = makeSession('fresh', { lastActivity: NOW });
    const stale = makeSession('stale', { lastActivity: NOW - 604_800_001 });
    const kept = makeSession('kept', { lastActivity: NOW - 604_800_000 });
    const h = await renderStudio(StudioSessionListComponent, { sessions: [fresh, stale, kept] });
    expect(rows()).toHaveLength(2);
    expect(screen.getByText('2 sessions')).toBeDefined();
    expect(Object.keys(h.sessionStore.snapshot().sessions).sort()).toEqual(['fresh', 'kept']);
  });
});

describe('FR-49: selecting a row selects that session (kept from the cost-line tests, L160-168) (T25)', () => {
  it('clicking the second row makes its session current; the newest is first (rows are newest last-activity first)', async () => {
    const a = makeSession('s1', { lastActivity: NOW });
    const b = makeSession('s2', { lastActivity: NOW - 1000 });
    const h = await renderStudio(StudioSessionListComponent, { sessions: [a, b] });
    expect(h.store.currentSessionId()).toBe('s1');
    await h.user.click(within(rows()[1]).getByRole('button'));
    await vi.waitFor(() => expect(h.store.currentSessionId()).toBe('s2'));
  });
});

describe('FR-2: each row shows the session name, the local date and its own cost (T25)', () => {
  function oneRow(over: { prompt?: string; costUsd?: number; lastActivity?: number } = {}) {
    const s = makeSession('s1', { pairs: 1, costUsd: over.costUsd ?? 0.12, lastActivity: over.lastActivity ?? NOW });
    if (over.prompt !== undefined) s.meta.versions[0].prompt = over.prompt;
    return s;
  }

  it('shows the last typed prompt as the name, "01.01 · 00:16" as the date at offset 0 and "$0.12" as the cost', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [oneRow({ prompt: 'red mug on a table' })] });
    const row = norm(rows()[0]);
    expect(row).toContain('red mug on a table');
    expect(row).toContain('01.01 · 00:16');
    expect(row).toContain('$0.12');
  });

  it('NFR-4: the date follows the local offset of the fake port - +120 gives 02:16 on the same day, -300 gives 19:16 on the day before; no TZ variable is involved', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [oneRow()], offsetMinutes: 120 });
    expect(norm(rows()[0])).toContain('01.01 · 02:16');
  });

  it('NFR-4: a negative offset crosses midnight backwards: -300 gives 31.12 · 19:16', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [oneRow()], offsetMinutes: -300 });
    expect(norm(rows()[0])).toContain('31.12 · 19:16');
    expect(norm(rows()[0])).not.toContain('01.01 · 00:16');
  });

  it('the cost is the session\'s OWN cost with two decimals: $0.35 for 0.3456, $0.00 for a free session', async () => {
    const a = oneRow({ costUsd: 0.3456 });
    const b = makeSession('s2', { costUsd: 0, lastActivity: NOW - 1000 });
    await renderStudio(StudioSessionListComponent, { sessions: [a, b] });
    expect(norm(rows()[0])).toContain('$0.35');
    expect(norm(rows()[1])).toContain('$0.00');
  });

  it('a long name is not cut in the data (truncation is one-line CSS): the whole prompt is in the DOM', async () => {
    const long = `${'word '.repeat(50)}end`;
    await renderStudio(StudioSessionListComponent, { sessions: [oneRow({ prompt: long })] });
    expect(norm(rows()[0])).toContain(long.trim());
  });

  it('FR-2 failure path: a row whose session has no prompt yet still renders, with date and cost and NO name text', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [makeSession('empty', { costUsd: 0.05 })] });
    const row = rows()[0];
    const leftover = norm(row).replace('01.01 · 00:16', '').replace('$0.05', '').trim();
    expect(norm(row)).toContain('01.01 · 00:16');
    expect(norm(row)).toContain('$0.05');
    expect(leftover).toBe('');
  });

  it('every row shows its own name, date and cost (they are not shared between rows)', async () => {
    const a = oneRow({ prompt: 'first prompt', costUsd: 0.1, lastActivity: NOW });
    const b = makeSession('s2', { pairs: 1, costUsd: 0.2, lastActivity: NOW - 60_000 });
    b.meta.versions[0].prompt = 'second prompt';
    await renderStudio(StudioSessionListComponent, { sessions: [a, b] });
    expect(norm(rows()[0])).toContain('first prompt');
    expect(norm(rows()[0])).toContain('$0.10');
    expect(norm(rows()[1])).toContain('second prompt');
    expect(norm(rows()[1])).toContain('$0.20');
    expect(norm(rows()[1])).toContain('01.01 · 00:15');
  });
});

describe('FR-2 (owner ruling OI-A, option a): the row name for a blank or chip latest prompt (T40)', () => {
  it('an images-only latest send (blank prompt) shows NO name, even though an earlier version was typed', async () => {
    const s = makeSession('s1', { pairs: 2, costUsd: 0.06 });
    s.meta.versions[0].prompt = 'red mug';
    s.meta.versions[1].prompt = '';
    await renderStudio(StudioSessionListComponent, { sessions: [s] });
    const row = norm(rows()[0]);
    expect(row).not.toContain('red mug');
    expect(row.replace('01.01 · 00:16', '').replace('$0.06', '').trim()).toBe('');
  });

  it('a chip latest send shows the chip instruction text as the name', async () => {
    const s = makeSession('s1', { pairs: 2 });
    s.meta.versions[0].prompt = 'red mug';
    s.meta.versions[1].prompt = 'Make the shadow softer.';
    await renderStudio(StudioSessionListComponent, { sessions: [s] });
    expect(norm(rows()[0])).toContain('Make the shadow softer.');
    expect(norm(rows()[0])).not.toContain('red mug');
  });
});

