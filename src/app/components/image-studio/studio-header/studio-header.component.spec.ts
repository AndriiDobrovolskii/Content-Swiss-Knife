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
import { TestBed } from '@angular/core/testing';


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T37 - the header shows "Today $X · month $Y" (AC-12, FR-18, FR-19; owner copy X-53, placement: the right end of the header; G-8 OD-13).
// PINNED CONTRACT: the header only RENDERS SpendService.state (the root service, src/services/image-studio/spend.service.ts) and fetches nothing itself (the container triggers
// the fetches, T38). While loading, before any refresh and after a failed fetch it shows NO figure (no `$` amount, in particular never "$0.00" for an unknown value); once ready it
// shows "Today $X · month $Y" with two decimals; a month with no Image Studio rows shows $0.00 for both. The spec drives SpendService.refresh() itself and answers /api/usage.
// ---------------------------------------------------------------------------------------------------------------------
describe('AC-12 / FR-18: the spend figures in the header (T37)', () => {
  const NOW = Date.UTC(2026, 10, 14, 12, 0);
  const row = (ts: number, costUsd: number, over: Record<string, unknown> = {}) => ({
    id: ts, ts, provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, taskLabel: 'image-studio|none|1K', productName: null, store: null, lang: null,
    inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, costUsd, ...over,
  });
  const USAGE_URL = (r: { url: string }) => r.url === '/api/usage';

  async function renderHeader(lang: 'en' | 'uk' = 'en') {
    const h = await renderStudio(StudioHeaderComponent, { lang, sessions: [makeSession('s1')] });
    h.clock.set(NOW);
    const spendPath = '../../../../services/image-studio/spend.service';
    const { SpendService } = await import(/* @vite-ignore */ spendPath);
    const spend = TestBed.inject(SpendService) as unknown as { refresh(): Promise<void> };
    return { h, spend };
  }
  const headerEl = (h: Harness) => h.view.container.querySelector('header') as HTMLElement;

  it('rendering the header alone issues NO usage request and shows no amount', async () => {
    const { h } = await renderHeader();
    h.http.expectNone(USAGE_URL);
    expect(headerEl(h).textContent).not.toMatch(/\$/);
  });

  it('AC-12: after a refresh the header reads "Today $0.25 · month $1.00" - Image Studio rows only, text-generation rows excluded, UTC day and month', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    const req = h.http.expectOne(USAGE_URL);
    req.flush({ rows: [
      row(Date.UTC(2026, 10, 14, 9), 0.25),
      row(Date.UTC(2026, 10, 3, 8), 0.75),
      row(Date.UTC(2026, 10, 14, 10), 1000, { provider: 'anthropic', mode: 'generator', taskLabel: 'task-a' }),
      row(Date.UTC(2026, 9, 30, 23), 500),
    ] });
    await refreshing;
    await h.settle();
    expect(headerEl(h).textContent).toContain('Today $0.25 · month $1.00');
  });

  it('FR-19 / AC-12: the request starts at the UTC start of the current month', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    const req = h.http.expectOne(USAGE_URL);
    expect(req.request.params.get('from')).toBe(String(Date.UTC(2026, 10, 1)));
    req.flush({ rows: [] });
    await refreshing;
  });

  it('FR-18: a month with no Image Studio rows shows $0.00 for both figures (a known zero, not a placeholder)', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    h.http.expectOne(USAGE_URL).flush({ rows: [] });
    await refreshing;
    await h.settle();
    expect(headerEl(h).textContent).toContain('Today $0.00 · month $0.00');
  });

  it('FR-18 (d): while the request is pending the header shows no amount', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    await h.settle();
    expect(headerEl(h).textContent).not.toMatch(/\$/);
    h.http.expectOne(USAGE_URL).flush({ rows: [] });
    await refreshing;
  });

  it('FR-18 (d): after a FAILED fetch the header shows no amount - never "$0.00" - and the rest of the header still works', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    h.http.expectOne(USAGE_URL).flush({ error: 'x' }, { status: 500, statusText: 'Server Error' });
    await refreshing;
    await h.settle();
    expect(headerEl(h).textContent).not.toMatch(/\$/);
    expect(screen.getByRole('button', { name: LABELS.en.newSession })).toBeDefined();
  });

  it('UA copy: "Сьогодні $0.25 · місяць $1.00"', async () => {
    const { h, spend } = await renderHeader('uk');
    const refreshing = spend.refresh();
    h.http.expectOne(USAGE_URL).flush({ rows: [row(Date.UTC(2026, 10, 14, 9), 0.25), row(Date.UTC(2026, 10, 3, 8), 0.75)] });
    await refreshing;
    await h.settle();
    expect(headerEl(h).textContent).toContain('Сьогодні $0.25 · місяць $1.00');
  });

  it('FR-18 (f): the per-session total is not replaced - the header text is a plain text, not a role="status"', async () => {
    const { h, spend } = await renderHeader();
    const refreshing = spend.refresh();
    h.http.expectOne(USAGE_URL).flush({ rows: [] });
    await refreshing;
    await h.settle();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
