/**
 * spend.service.spec.ts - US-10.6 T14 (FR-18 (c), (d), FR-19; AC-12).
 *
 * Runner: test:logic. Angular service specs here use `Injector.create` with the real service class and test doubles for its tokens - not TestBed
 * (see content-orchestrator.ua-doc-pipeline.spec.ts); `@angular/compiler` is imported FIRST.
 *
 * PINNED CONTRACT (src/services/image-studio/spend.service.ts, `@Injectable({ providedIn: 'root' })`, field-level inject()):
 *   injects UsageService (the existing HTTP wrapper, replaced here by a double) and the CLOCK_PORT token for "now" (so no host clock is read);
 *   state(): { kind: 'loading' | 'error' | 'ready'; today?: number; month?: number }       a signal
 *       - NO figure ('today' / 'month' absent) unless kind is 'ready'; a failed fetch is 'error' with no figure - never `0`.
 *   refresh(): Promise<void>      ONE UsageService.fetch({ from: <UTC month start> }) per call; today and month are derived from that one result with
 *                                 sumImageStudioSpend; it never throws (a failed fetch ends in the 'error' state).
 *   The service NEVER fetches on its own: injecting / constructing it issues no request - the triggers belong to the container (T38, plan 12).
 */
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector } from '@angular/core';
import { UsageService } from '../usage.service';
import * as tokens from './image-studio.tokens';
import { makeFakeClock } from '../../../test/image-studio/helpers/fakes';
import { deferred, flush } from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const U = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min);
const NOW = U(2026, 11, 14, 23, 45);

let seq = 0;
const imageRow = (ts: number, costUsd: number) => ({ id: ++seq, ts, provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, taskLabel: 'image-studio|none|1K', productName: null, store: null, lang: null, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, costUsd });
const textRow = (ts: number, costUsd: number) => ({ ...imageRow(ts, costUsd), provider: 'anthropic', model: 'claude-sonnet-5-5', mode: 'generator', taskLabel: 'task-a' });

async function setup() {
  const { SpendService } = await load('./spend.service');
  const usage = { fetch: vi.fn(async (_filters?: unknown) => [] as unknown[]) };
  const clock = makeFakeClock(NOW);
  const injector = Injector.create({
    providers: [
      { provide: UsageService, useValue: usage },
      { provide: tokens.CLOCK_PORT, useValue: clock },
      { provide: SpendService, useClass: SpendService },
    ],
  });
  const service: any = injector.get(SpendService);
  return { service, usage, clock };
}

describe('SpendService: fetches only on refresh() (T14, FR-18 (c))', () => {
  it('constructing / injecting the service issues NO request, and shows no figure', async () => {
    const { service, usage } = await setup();
    expect(usage.fetch).not.toHaveBeenCalled();
    expect('today' in service.state()).toBe(false);
    expect('month' in service.state()).toBe(false);
  });

  it('one refresh() makes exactly one fetch, starting at the UTC start of the current month (the global endpoint, not a 7-day cache)', async () => {
    const { service, usage } = await setup();
    await service.refresh();
    expect(usage.fetch).toHaveBeenCalledTimes(1);
    expect(usage.fetch).toHaveBeenCalledWith({ from: U(2026, 11, 1) });
  });

  it('each further refresh() makes one more request (the figures are refetched after an action that ended with an image)', async () => {
    const { service, usage } = await setup();
    await service.refresh();
    await service.refresh();
    expect(usage.fetch).toHaveBeenCalledTimes(2);
  });

  it('FR-19: the month start follows the injected clock, not the host - at 2027-01-05 the request starts on 2027-01-01 UTC', async () => {
    const { service, usage, clock } = await setup();
    clock.set(U(2027, 1, 5, 3));
    await service.refresh();
    expect(usage.fetch).toHaveBeenCalledWith({ from: U(2027, 1, 1) });
  });
});

describe('SpendService: states and figures (T14, FR-18 (d), AC-12)', () => {
  it('ready: today and month are the Image Studio sums, text-generation rows excluded, from the ONE result', async () => {
    const { service, usage } = await setup();
    usage.fetch.mockResolvedValueOnce([
      imageRow(U(2026, 11, 14, 23, 30), 0.25),
      imageRow(U(2026, 11, 3, 8), 0.75),
      textRow(U(2026, 11, 14, 9), 1000),
    ]);
    await service.refresh();
    const state = service.state();
    expect(state.kind).toBe('ready');
    expect(state.today).toBeCloseTo(0.25, 12);
    expect(state.month).toBeCloseTo(1, 12);
    expect(usage.fetch).toHaveBeenCalledTimes(1);
  });

  it('FR-18: a month with no Image Studio rows is ready with 0 and 0 (shown as $0.00), not a placeholder', async () => {
    const { service, usage } = await setup();
    usage.fetch.mockResolvedValueOnce([textRow(U(2026, 11, 14, 9), 5)]);
    await service.refresh();
    expect(service.state()).toEqual({ kind: 'ready', today: 0, month: 0 });
  });

  it('while the request is pending the state is "loading" and carries no figure', async () => {
    const { service, usage } = await setup();
    const gate = deferred<unknown[]>();
    usage.fetch.mockImplementationOnce(() => gate.promise);
    const pending = service.refresh();
    await flush();
    expect(service.state().kind).toBe('loading');
    expect('today' in service.state()).toBe(false);
    gate.resolve([imageRow(U(2026, 11, 14, 9), 1)]);
    await pending;
    expect(service.state().kind).toBe('ready');
  });

  it('FR-18 (d): a failed fetch ends in "error" with NO figure - never a wrong number such as $0.00 - and refresh() does not throw', async () => {
    const { service, usage } = await setup();
    usage.fetch.mockRejectedValueOnce(new Error('network down'));
    await expect(service.refresh()).resolves.toBeUndefined();
    const state = service.state();
    expect(state.kind).toBe('error');
    expect('today' in state).toBe(false);
    expect('month' in state).toBe(false);
  });

  it('FR-18 (d): after a failure the next successful refresh() recovers to "ready"; a later failure drops the old figures instead of keeping a stale number', async () => {
    const { service, usage } = await setup();
    usage.fetch.mockRejectedValueOnce(new Error('boom'));
    await service.refresh();
    usage.fetch.mockResolvedValueOnce([imageRow(U(2026, 11, 14, 9), 2)]);
    await service.refresh();
    expect(service.state().kind).toBe('ready');
    usage.fetch.mockRejectedValueOnce(new Error('boom again'));
    await service.refresh();
    expect(service.state().kind).toBe('error');
    expect('today' in service.state()).toBe(false);
  });
});
