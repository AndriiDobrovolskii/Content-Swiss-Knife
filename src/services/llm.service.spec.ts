/**
 * llm.service.spec.ts
 *
 * Covers `recordGeneration` only — the client half of the generation-outcome metric that gates the
 * Doc-pipeline rollout.
 *
 * WHY THIS EXISTS. On 2026-08-01 a full four-locale EXPERT3D run produced artifacts on disk and
 * **zero** rows in `generation_log`. Whether the report was never sent or was sent and rejected is
 * unanswerable, because the failure path was `catch { }` — silent by design. A metric you cannot
 * tell apart from silence cannot gate a rollout.
 *
 * The fix keeps the fire-and-forget contract (telemetry must never fail a generation that otherwise
 * succeeded) and makes the loss observable. Both halves are asserted here, because they pull in
 * opposite directions and it is the combination that is easy to get wrong later.
 *
 * No TestBed: vitest.config.ts deliberately excludes the Angular testing module, so the service is
 * built inside a bare `Injector` instead — enough for `inject()` and nothing more.
 */
// Importing HttpClient's token pulls in @angular/common's partially-compiled injectables
// (PlatformLocation), which need the JIT compiler under vitest. Must precede the Angular imports.
import '@angular/compiler';

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';

import { LlmService } from './llm.service';
import { ModelSettingsService } from './model-settings.service';

/** Builds the service against a stubbed HttpClient whose `post` behaves as given. */
function serviceWith(post: (path: string, body: unknown) => unknown) {
  const calls: Array<{ path: string; body: any }> = [];
  const http = {
    post: (path: string, body: unknown) => {
      calls.push({ path, body });
      return post(path, body);
    },
  };
  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: http },
      { provide: ModelSettingsService, useValue: new ModelSettingsService() },
    ],
  });
  return { service: runInInjectionContext(injector, () => new LlmService()), calls };
}

const RECORD = {
  store: 'EXPERT3D',
  locale: 'uk-UA',
  productName: 'XGRIDS L2 Pro',
  pipeline: 'doc' as const,
  outcome: 'ok' as const,
  repairsUsed: 0,
};

afterEach(() => vi.restoreAllMocks());

describe('LlmService.recordGeneration', () => {
  it('posts the outcome to the generation endpoint', async () => {
    const { service, calls } = serviceWith(() => of({}));
    await service.recordGeneration(RECORD);

    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/api/usage/generation');
    expect(calls[0].body).toMatchObject({ store: 'EXPERT3D', pipeline: 'doc', outcome: 'ok' });
  });

  /**
   * THE CONTRACT THAT MUST NOT REGRESS. A telemetry outage must never take a finished product down
   * with it — the generation has already cost real tokens by this point.
   */
  it('never throws when the endpoint fails', async () => {
    const { service } = serviceWith(() => throwError(() => new Error('proxy down')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(service.recordGeneration(RECORD)).resolves.toBeUndefined();
  });

  /**
   * THE REGRESSION THIS FILE EXISTS FOR. Swallowing silently is what made the missing Aug-1 rows
   * undiagnosable: an empty table looked identical to a table nobody wrote to.
   */
  it('warns visibly when the outcome could not be recorded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { service } = serviceWith(() => throwError(() => new Error('proxy down')));

    await service.recordGeneration(RECORD);

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0].join(' ');
    // Must be greppable and must say what was lost, not merely that something failed.
    expect(message).toContain('generation_log');
    expect(message).toContain('proxy down');
  });

  it('stays quiet on the happy path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { service } = serviceWith(() => of({}));

    await service.recordGeneration(RECORD);

    expect(warn).not.toHaveBeenCalled();
  });
});

/**
 * The wiring, not the policy — `http-retry.spec.ts` owns which failures qualify. What matters here
 * is that `post()` is piped at all, because it is the single choke point every LLM call passes
 * through: /llm/generate, /llm/vision and /llm/pdf are all covered by that one `.pipe`, or none are.
 *
 * On 2026-08-03 a `--watch` restart dropped an in-flight /llm/vision call and the whole generation
 * died with it — the browser got a Vite-manufactured 500 with an empty body, and nothing retried.
 */
describe('LlmService.post — surviving a dropped connection', () => {
  /** The real 2026-08-03 HttpErrorResponse: a 500 that never came from our server. */
  const PROXY_500 = { status: 500, statusText: 'Internal Server Error', error: null };

  it('retries a call the proxy could not deliver, and returns the eventual result', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attempts = 0;
    const { service, calls } = serviceWith(() => defer(() => {
      attempts++;
      return attempts === 1 ? throwError(() => PROXY_500) : of({ result: 'the artifact' });
    }));

    const pending = service.generateText('prompt');
    await vi.advanceTimersByTimeAsync(2000);

    await expect(pending).resolves.toBe('the artifact');
    // One `post()` call; the retry re-subscribes to the same observable rather than rebuilding it,
    // so the settings snapshot and body stay identical across attempts.
    expect(calls).toHaveLength(1);
    expect(attempts).toBe(2);
    vi.useRealTimers();
  });

  /**
   * The guard against over-reach. A provider failure arrives as our own JSON envelope and withRetry
   * has already spent three attempts on it server-side — retrying here would make that nine paid
   * calls, on the most expensive errors there are.
   */
  it('surfaces a real server error immediately, without retrying', async () => {
    const serverError = { status: 503, error: { error: 'Gemini overloaded' } };
    let attempts = 0;
    const { service } = serviceWith(() => defer(() => {
      attempts++;
      return throwError(() => serverError);
    }));

    await expect(service.generateText('prompt')).rejects.toBe(serverError);
    expect(attempts).toBe(1);
  });
});
