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
import { of, throwError } from 'rxjs';

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
