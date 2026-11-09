/**
 * US-10.5 T24 - StudioHeaderComponent: the title, "New session" (moved here from the session list, D-4) and "· history (N)".
 * Covers FR-1, AC-1 (+ Proposed OD-6b, OD-6c); and, moved from studio-session-list.component.spec.ts with their substance kept (D-4),
 * FR-49 / FR-86 / AC-26: the "Start a new session?" confirmation (T-23) and the cap-of-20 eviction, which are reached through this button.
 *
 * Component runner (`ng test`). Real root store over the in-memory session store; fake ConfirmPort. The rows of the session list are not in
 * this component, so the moved tests read the stored sessions through `h.store.sessions()` and the session-store snapshot.
 * Contract (helpers/studio-render.ts): heading "Image Studio" (X-30, NOT a button), button "New session" (T-22), plain text "· history (N)".
 * Type-clean from T21 on (only the component, the store and helpers that exist then).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { StudioHeaderComponent } from './studio-header.component';
import { renderStudio, t, LABELS, type Harness, type Lang } from '../../../../../test/image-studio/helpers/studio-render';
import { makeSession, type StoredSession } from '../../../../../test/image-studio/helpers/fakes';
import { StorageQuotaError } from '../../../../utils/image-studio/ports';

const NOW = 1_000_000;
const id2 = (n: number) => `a${String(n).padStart(2, '0')}`;
function twenty(): StoredSession[] {
  return Array.from({ length: 20 }, (_, i) => makeSession(id2(i + 1), { createdAt: NOW - 100_000 + i, lastActivity: NOW - i * 1000 }));
}
const newSession = (lang: Lang = 'en') => screen.getByRole('button', { name: LABELS[lang].newSession });
const storedIds = (h: Harness) => Object.keys(h.sessionStore.snapshot().sessions).sort();

describe('FR-1 / AC-1: the header (T24)', () => {
  it('shows "Image Studio" as a heading, not as a button (the shell specs\' single button named Image Studio must stay unique)', async () => {
    await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')] });
    expect(screen.getByRole('heading', { name: 'Image Studio' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Image Studio' })).toBeNull();
  });

  it('shows exactly one "New session" button', async () => {
    await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')] });
    expect(screen.getAllByRole('button', { name: LABELS.en.newSession })).toHaveLength(1);
  });

  it('shows the saved-session count as plain text "· history (N)", N = the sessions in the list', async () => {
    await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1'), makeSession('s2', { lastActivity: NOW - 1000 }), makeSession('s3', { lastActivity: NOW - 2000 })] });
    expect(screen.getByText('· history (3)')).toBeDefined();
  });

  it('OD-6c: "history (N)" is not a control and no control is named "History"', async () => {
    await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')] });
    expect(screen.queryByRole('button', { name: /history/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /history/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'History' })).toBeNull();
  });

  it('the count follows the list: creating a session makes it "· history (2)"', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')] });
    expect(screen.getByText('· history (1)')).toBeDefined();
    await h.user.click(newSession());
    await vi.waitFor(() => expect(screen.getByText('· history (2)')).toBeDefined());
  });

  it('shows no spend total of any kind (no today, month or session cost) even for a session with a cost', async () => {
    const { container } = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1', { costUsd: 0.12 })] }).then((h) => h.view);
    expect(container.textContent).not.toMatch(/\$\s?\d|Estimated cost|Today|Month|Spend/i);
  });

  it('FR-77: under uk the title, the button and the count are Ukrainian ("Студія зображень", "Нова сесія", "· історія (1)")', async () => {
    await renderStudio(StudioHeaderComponent, { lang: 'uk', sessions: [makeSession('s1')] });
    expect(screen.getByRole('heading', { name: 'Студія зображень' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Нова сесія' })).toBeDefined();
    expect(screen.getByText('· історія (1)')).toBeDefined();
  });

  it('FR-77: a language toggle re-renders the header', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')] });
    await h.setLang('uk');
    expect(screen.getByRole('heading', { name: 'Студія зображень' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Image Studio' })).toBeNull();
  });

  it('FR-1 failure path: the header renders without error with a single empty session', async () => {
    await renderStudio(StudioHeaderComponent, { sessions: [makeSession('only')] });
    expect(screen.getByText('· history (1)')).toBeDefined();
  });
});

describe('FR-49 / AC-26 (moved from the session list, D-4): New session asks for confirmation (T24)', () => {
  it('declining the confirmation changes nothing - no session is created', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1')], confirmAnswer: false });
    await h.user.click(newSession());
    await h.settle();
    expect(h.confirmPort.asked).toEqual(['Start a new session? The current session stays in the session list.']);
    expect(h.store.sessions()).toHaveLength(1);
    expect(storedIds(h)).toEqual(['s1']);
  });

  it('accepting creates a new session AND keeps the previous one with its own data', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('s1', { pairs: 1, costUsd: 0.12 })], confirmAnswer: true });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(h.store.sessions()).toHaveLength(2));
    expect(storedIds(h)).toHaveLength(2);
    expect(storedIds(h)).toContain('s1');
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1']);
    expect(h.sessionStore.snapshot().sessions['s1'].meta.costUsd).toBe(0.12);
  });

  it('the confirmation text is the Ukrainian T-23 under uk', async () => {
    const h = await renderStudio(StudioHeaderComponent, { lang: 'uk', sessions: [makeSession('s1')], confirmAnswer: false });
    await h.user.click(newSession('uk'));
    expect(h.confirmPort.asked).toEqual(['Почати нову сесію? Поточна сесія залишиться у списку сесій.']);
  });

  it('D-26: "New session" creates a session even when the current session holds no turn', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: [makeSession('empty')] });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(h.store.sessions()).toHaveLength(2));
    expect(storedIds(h)).toContain('empty');
  });
});

describe('FR-86 / D-23 / SD-41 / D-24 (moved from the session list, D-4): creation at the cap evicts silently (T24)', () => {
  it('with twenty stored, New session evicts the OLDEST LAST ACTIVITY (a20), not the oldest created (a01); twenty remain', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: twenty() });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a20'));
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('a01');
    expect(h.store.sessions()).toHaveLength(20);
  });

  it('the eviction is silent - the only dialog is the T-23 confirmation; no native alert, no role=alert, no role=status', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: twenty() });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a20'));
    expect(h.confirmPort.asked).toHaveLength(1);
    expect(h.alerts.messages).toEqual([]);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('the session the operator is leaving is never evicted, even when it holds the oldest stamp', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: twenty() });
    await h.store.selectSession('a20');
    await h.settle();
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).toHaveLength(20));
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('a19'));
    expect(storedIds(h)).toContain('a20');
  });

  it('with all stamps equal the session with the smaller id is evicted, deterministically', async () => {
    const equal = Array.from({ length: 20 }, (_, i) => makeSession(`b${String(i + 1).padStart(2, '0')}`, { lastActivity: NOW }));
    const h = await renderStudio(StudioHeaderComponent, { sessions: equal });
    await h.store.selectSession('b10');
    await h.settle();
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).not.toContain('b01'));
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('b10');
  });

  it('with fewer than twenty stored nothing is deleted', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: twenty().slice(0, 19) });
    await h.user.click(newSession());
    await vi.waitFor(() => expect(storedIds(h)).toHaveLength(20));
    expect(storedIds(h)).toContain('a19');
  });

  it('a creation that hits the quota creates no session and deletes none; one native alert (T-20) is shown', async () => {
    const h = await renderStudio(StudioHeaderComponent, { sessions: twenty() });
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    await h.user.click(newSession());
    await vi.waitFor(() => expect(h.alerts.messages).toEqual([t('T-20', 'en')]));
    h.sessionStore.failWrites(null);
    expect(storedIds(h)).toHaveLength(20);
    expect(storedIds(h)).toContain('a20');
    expect(h.store.sessions()).toHaveLength(20);
  });
});
