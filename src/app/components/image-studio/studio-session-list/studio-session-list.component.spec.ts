/**
 * US-10.1 T44 - StudioSessionListComponent: the stored sessions, "New session", selection and the running cost line.
 * Covers FR-49, FR-71, FR-86; AC-26, AC-44 (UI half).
 *
 * Component runner. The real root store over the in-memory `SessionStorePort` (all-or-nothing, quota switch) and a fake
 * `ConfirmPort` for the T-23 confirmation. Eviction ORDER is asserted through what the store port finally holds (which
 * session ids survive); the unit rules themselves (candidate choice, tie-break, healing) are T30's spec.
 *
 * Pinned UI contract (helpers/studio-render.ts): a list named X-9 whose items are the stored sessions, NEWEST last
 * activity first, each item holding one button that selects it; a button named "New session" (T-22); a cost line using X-10
 * whose `{amount}` is the current session's running total (the Specification fixes the text, not the number format, so the
 * assertion looks for the number, not for a currency layout).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { StudioSessionListComponent } from './studio-session-list.component';
import {
  renderStudio, t, LABELS, textOf, type Harness, type Lang,
} from '../../../../../test/image-studio/helpers/studio-render';
import { makeSession, type StoredSession } from '../../../../../test/image-studio/helpers/fakes';
import { StorageQuotaError } from '../../../../utils/image-studio/ports';

const NOW = 1_000_000; // the fake clock starts here; every stamp below is well inside the 7-day window
const id2 = (n: number) => `a${String(n).padStart(2, '0')}`;

/** Twenty sessions a01..a20 whose creation order is the REVERSE of their activity order: a01 is newest-active, a20 oldest-active. */
function twenty(): StoredSession[] {
  return Array.from({ length: 20 }, (_, i) => makeSession(id2(i + 1), { createdAt: NOW - 100_000 + i, lastActivity: NOW - i * 1000 }));
}
const rows = (lang: Lang = 'en') => within(screen.getByRole('list', { name: t('X-9', lang) })).queryAllByRole('listitem');
const newSession = (lang: Lang = 'en') => screen.getByRole('button', { name: LABELS[lang].newSession });
const storedIds = (h: Harness) => Object.keys(h.sessionStore.snapshot().sessions).sort();

describe('FR-86 / AC-26: the list shows the stored sessions, at most twenty', () => {
  it('FR-86: twenty stored sessions are twenty rows, under the heading "Sessions"', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    expect(screen.getByText(t('X-9', 'en'))).toBeDefined();
    expect(rows()).toHaveLength(20);
  });

  it('AC-26 / FR-49: the heading and the button follow the interface language', async () => {
    await renderStudio(StudioSessionListComponent, { lang: 'uk', sessions: [makeSession('s1')] });
    expect(screen.getByText('Сесії')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Нова сесія' })).toBeDefined();
  });

  it('FR-48 / SD-33: a session older than seven days is gone from the list after the load (expiry at load, not on a timer)', async () => {
    const fresh = makeSession('fresh', { lastActivity: NOW });
    const stale = makeSession('stale', { lastActivity: NOW - 604_800_001 });
    const kept = makeSession('kept', { lastActivity: NOW - 604_800_000 });
    const h = await renderStudio(StudioSessionListComponent, { sessions: [fresh, stale, kept] });
    expect(rows()).toHaveLength(2);
    expect(storedIds(h)).toEqual(['fresh', 'kept']);
  });
});

describe('FR-49 / AC-26: New session asks for confirmation (T-23)', () => {
  it('FR-49: declining the confirmation changes nothing - no session is created, the rows are the same', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1')], confirmAnswer: false });
    await h.user.click(newSession());
    await h.settle();
    expect(h.confirmPort.asked).toEqual(['Start a new session? The current session stays in the session list.']);
    expect(rows()).toHaveLength(1);
    expect(storedIds(h)).toEqual(['s1']);
  });

  it('AC-26 / FR-49: accepting creates a new session AND keeps the previous one in the list with its own data', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1', { pairs: 1, costUsd: 0.12 })], confirmAnswer: true });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect(storedIds(h)).toHaveLength(2);
    expect(storedIds(h)).toContain('s1');
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1']);
    expect(h.sessionStore.snapshot().sessions['s1'].meta.costUsd).toBe(0.12);
  });

  it('FR-49 / FR-77: the confirmation text is the Ukrainian T-23 under uk', async () => {
    const h = await renderStudio(StudioSessionListComponent, { lang: 'uk', sessions: [makeSession('s1')], confirmAnswer: false });
    await h.user.click(newSession('uk'));
    expect(h.confirmPort.asked).toEqual(['Почати нову сесію? Поточна сесія залишиться у списку сесій.']);
  });

  it('D-26 / FR-49: "New session" creates a row even when the current session holds no turn', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: [makeSession('empty')] });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect(storedIds(h)).toContain('empty');
  });
});

describe('FR-86 / D-23 / SD-41 / D-24: creation at the cap evicts silently', () => {
  it('FR-86: with twenty stored, "New session" evicts the OLDEST LAST ACTIVITY (a20), not the oldest created (a01); twenty rows remain', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a20'));
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('a01');
    expect(rows()).toHaveLength(20);
  });

  it('FR-86: the eviction is silent - the only dialog is the T-23 confirmation; no native alert, no role=alert, no role=status', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a20'));
    expect(h.confirmPort.asked).toHaveLength(1);
    expect(h.alerts.messages).toEqual([]);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('D-23: the session the operator is leaving is never evicted, even when it holds the oldest stamp', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    await h.store.selectSession('a20'); // the oldest stamp, now the session in use
    await h.settle();
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).toHaveLength(20));
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a19')); // the next-oldest candidate goes instead
    expect(storedIds(h)).toContain('a20');
  });

  it('SD-41: with all stamps equal the session with the smaller id (UTF-16 order) is evicted, deterministically', async () => {
    const equal = Array.from({ length: 20 }, (_, i) => makeSession(`b${String(i + 1).padStart(2, '0')}`, { lastActivity: NOW }));
    const h = await renderStudio(StudioSessionListComponent, { sessions: equal });
    await h.store.selectSession('b10');
    await h.settle();
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('b01'));
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('b10');
  });

  it('FR-86: with fewer than twenty stored nothing is deleted', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: twenty().slice(0, 19) });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).toHaveLength(20));
    expect(storedIds(h)).toContain('a19');
  });

  it('D-24 / FR-81: a creation that hits the quota creates no session and deletes none; one native alert (T-20) is shown', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: twenty() });
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    await h.user.click(newSession());
    await vi.waitFor(() => expect(h.alerts.messages).toEqual([t('T-20', 'en')]));
    h.sessionStore.failWrites(null);
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('a20');
    expect(rows()).toHaveLength(20);
  });
});

describe('FR-71 / AC-44 (UI half): the running cost total', () => {
  const costLine = () => textOf(screen.getByText(/Estimated cost:/));

  it('FR-71 / X-10: the cost line shows the current session\'s total using the "Estimated cost: {amount}" text', async () => {
    await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1', { costUsd: 0.12 })] });
    expect(costLine()).toMatch(/^Estimated cost: .*0\.12/);
    expect(costLine()).not.toContain('{amount}');
  });

  it('FR-71 / FR-49: selecting another row switches the current session, and the line shows THAT session\'s total (not a sum)', async () => {
    const a = makeSession('s1', { costUsd: 0.12, lastActivity: NOW });
    const b = makeSession('s2', { costUsd: 0.34, lastActivity: NOW - 1000 });
    const h = await renderStudio(StudioSessionListComponent, { sessions: [a, b] });
    expect(costLine()).toMatch(/0\.12/);
    await h.user.click(within(rows()[1]).getByRole('button'));
    await vi.waitFor(() => expect(costLine()).toMatch(/0\.34/));
    expect(costLine()).not.toMatch(/0\.46/);
  });

  it('FR-71 / FR-77: the Ukrainian text "Орієнтовна вартість: {amount}" is used under uk', async () => {
    await renderStudio(StudioSessionListComponent, { lang: 'uk', sessions: [makeSession('s1', { costUsd: 0.12 })] });
    expect(textOf(screen.getByText(/Орієнтовна вартість:/))).toMatch(/^Орієнтовна вартість: .*0\.12/);
  });

  it('FR-49: a new session starts at a zero total - nothing is carried over from the previous one', async () => {
    const h = await renderStudio(StudioSessionListComponent, { sessions: [makeSession('s1', { costUsd: 0.12 })] });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect(costLine()).not.toMatch(/0\.12/);
    expect(Number(costLine().match(/(\d+(?:\.\d+)?)/)![1])).toBe(0);
  });
});
