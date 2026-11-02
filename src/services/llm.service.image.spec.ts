/**
 * llm.service.image.spec.ts - US-10.1 T20 (FR-6, FR-21 abort, FR-85, SD-31, DD-18).
 *
 * `LlmService` gains two methods for the Image Studio that deliberately do NOT use the existing `post()`:
 *   - generateImage(request, signal?)   - ONE HttpClient.post, never retried (generations are paid, FR-85, OD-5),
 *                                         no model-settings snapshot merged into the body, abortable.
 *   - uploadImageFile(request, signal?) - keeps `retryTransport` (SD-31: the upload is not a paid generation).
 *
 * PINNED CONTRACT (CONTRACT.md "Client LlmService"):
 *   type ImageHttpResult = { ok: true; body: unknown } | { ok: false; status: number; errorField?: string }
 *   HTTP failures are RETURNED normalised, never thrown. `errorField` is the `error` string of the `{ error }`
 *   envelope when the response carries one (the BFF closed code, or `Помилка API`), otherwise undefined. status 0 =
 *   no response. An abort resolves `{ ok: false, status: 0 }` and unsubscribes the in-flight request.
 *   POST paths: /api/image-studio/generate and /api/image-studio/upload.
 *
 * Style: logic runner, a bare `Injector` and a stubbed `HttpClient` - no TestBed, no HttpTestingController (the
 * pattern of llm.service.spec.ts). The stubs record subscribe/unsubscribe so "did it retry" and "was it aborted" are
 * answered by the source observable, not by a spy on the operator. `retryTransport` waits are driven by fake timers.
 *
 * Not asserted: the shape of the request body (T28), the dispatch of the normalised failure (T31).
 */
import '@angular/compiler';

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, of, throwError } from 'rxjs';

import { LlmService } from './llm.service';
import { ModelSettingsService } from './model-settings.service';

interface Call { path: string; body: any }

function serviceWith(post: (path: string, body: any, n: number) => Observable<unknown>) {
  const calls: Call[] = [];
  const http = { post: (path: string, body: unknown) => { calls.push({ path, body }); return post(path, body, calls.length); } };
  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: http },
      { provide: ModelSettingsService, useValue: new ModelSettingsService() },
    ],
  });
  return { service: runInInjectionContext(injector, () => new LlmService()) as any, calls };
}

const REQUEST = {
  model: 'gemini-3.1-flash-image',
  aspectRatio: '1:1',
  resolution: '1K',
  history: [],
  newTurn: { id: 'u1', parts: [{ text: 'a white mug' }] },
};

/** What the browser reports for a failure that came from our own server: HttpErrorResponse with the envelope. */
const ours = (status: number, code: string) => ({ status, error: { error: code } });
/** The proxy-manufactured failure: no envelope (see http-retry.spec.ts). */
const bare = (status: number) => ({ status, statusText: 'x', error: null });

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('LlmService.generateImage - success and request shape (FR-6, DD-18)', () => {
  it('FR-6: posts the request to /api/image-studio/generate and returns { ok: true, body }', async () => {
    const body = { kind: 'text', text: 'hi', trimmedTurnIds: [] };
    const { service, calls } = serviceWith(() => of(body));

    const result = await service.generateImage(REQUEST);

    expect(result).toEqual({ ok: true, body });
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/api/image-studio/generate');
  });

  it('FR-6 / DD-18: the body is the request unchanged - no model-settings snapshot (deep/fast/provider) is merged in', async () => {
    const { service, calls } = serviceWith(() => of({ kind: 'text', text: 'x', trimmedTurnIds: [] }));

    await service.generateImage(REQUEST);

    expect(calls[0].body).toEqual(REQUEST);
    expect(Object.keys(calls[0].body).sort()).toEqual(Object.keys(REQUEST).sort());
    expect(calls[0].body).not.toHaveProperty('deep');
    expect(calls[0].body).not.toHaveProperty('fast');
    expect(calls[0].body).not.toHaveProperty('provider');
  });
});

describe('LlmService.generateImage - never retried (FR-85, SD-31, OD-5)', () => {
  it.each([
    ['status 0 (no response)', { status: 0, error: { isTrusted: true } }, 0, undefined],
    ['a bare 500 (the proxy-manufactured shape http-retry would retry)', bare(500), 500, undefined],
    ['a bare 502', bare(502), 502, undefined],
    ['a bare 503', bare(503), 503, undefined],
    ['a bare 504', bare(504), 504, undefined],
  ])('FR-85: %s issues exactly ONE post and is returned as a normalised failure', async (_n, failure, status, errorField) => {
    vi.useFakeTimers();
    let subscribes = 0;
    const { service, calls } = serviceWith(() => defer(() => { subscribes += 1; return throwError(() => failure); }));

    const pending = service.generateImage(REQUEST);
    // far beyond any backoff retryTransport could apply: if a retry were scheduled it would have fired by now
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await pending;

    expect(calls).toHaveLength(1);
    expect(subscribes).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(status);
    expect(result.errorField).toBe(errorField);
  });

  it.each([
    [400, 'INVALID_REQUEST'],
    [410, 'FILE_MISSING'],
    [413, 'PROTECTED_HISTORY_EXCEEDS_LIMIT'],
    [429, 'RATE_LIMIT_EXCEEDED'],
    [501, 'GEMINI_KEY_MISSING'],
    [502, 'EMPTY_RESPONSE'],
    [500, 'Помилка API'],
  ])('FR-61 / FR-52: a %s answered with the { error } envelope is one post and carries the status AND the code (%s)', async (status, code) => {
    const { service, calls } = serviceWith(() => throwError(() => ours(status, code)));

    const result = await service.generateImage(REQUEST);

    expect(calls).toHaveLength(1);
    expect(result).toEqual({ ok: false, status, errorField: code });
  });

  it('FR-52: a failure whose body is not our envelope has no errorField even when the status is a reserved one', async () => {
    const { service } = serviceWith(() => throwError(() => ({ status: 413, error: '<html>Payload Too Large</html>' })));

    const result = await service.generateImage(REQUEST);

    expect(result).toEqual({ ok: false, status: 413, errorField: undefined });
  });

  it('FR-85: a thrown non-HTTP error (not an HttpErrorResponse) still resolves as a failure rather than rejecting', async () => {
    const { service } = serviceWith(() => throwError(() => new Error('boom')));

    const result = await service.generateImage(REQUEST);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
  });
});

describe('LlmService.generateImage - abort (FR-21, DD-18)', () => {
  /** A request that never completes and records whether its subscriber went away. */
  function hanging() {
    const state = { subscribed: 0, unsubscribed: 0 };
    const source = new Observable<never>(() => {
      state.subscribed += 1;
      return () => { state.unsubscribed += 1; };
    });
    return { state, source };
  }

  it('FR-21: aborting the signal unsubscribes the in-flight request and resolves { ok: false, status: 0 }', async () => {
    const { state, source } = hanging();
    const { service } = serviceWith(() => source);
    const controller = new AbortController();

    const pending = service.generateImage(REQUEST, controller.signal);
    expect(state.subscribed).toBe(1);
    expect(state.unsubscribed).toBe(0);

    controller.abort();
    const result = await pending;

    expect(state.unsubscribed).toBe(1);
    expect(result).toEqual({ ok: false, status: 0 });
  });

  it('FR-21: a signal that is already aborted makes no post at all', async () => {
    const { service, calls } = serviceWith(() => of({ kind: 'text', text: 'x', trimmedTurnIds: [] }));
    const controller = new AbortController();
    controller.abort();

    const result = await service.generateImage(REQUEST, controller.signal);

    expect(calls).toHaveLength(0);
    expect(result).toEqual({ ok: false, status: 0 });
  });

  it('FR-21: an abort AFTER the response arrived changes nothing (no double unsubscribe, the result stays ok)', async () => {
    const body = { kind: 'text', text: 'late abort', trimmedTurnIds: [] };
    const { service } = serviceWith(() => of(body));
    const controller = new AbortController();

    const result = await service.generateImage(REQUEST, controller.signal);
    controller.abort();

    expect(result).toEqual({ ok: true, body });
  });
});

describe('LlmService.uploadImageFile - keeps retryTransport (SD-31)', () => {
  const UPLOAD = { data: 'AAAA' };

  it('FR-16: posts { data } to /api/image-studio/upload and returns { ok: true, body }', async () => {
    const body = { fileUri: 'files/abc', mimeType: 'image/png' };
    const { service, calls } = serviceWith(() => of(body));

    const result = await service.uploadImageFile(UPLOAD);

    expect(result).toEqual({ ok: true, body });
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/api/image-studio/upload');
    expect(calls[0].body).toEqual(UPLOAD);
  });

  it('SD-31: retries a call that never reached the server (proxy-manufactured 500) and returns the eventual result', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attempts = 0;
    const body = { fileUri: 'files/second', mimeType: 'image/webp' };
    const { service, calls } = serviceWith(() => defer(() => {
      attempts += 1;
      return attempts === 1 ? throwError(() => bare(500)) : of(body);
    }));

    const pending = service.uploadImageFile(UPLOAD);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(pending).resolves.toEqual({ ok: true, body });
    expect(attempts).toBe(2);
    expect(calls).toHaveLength(1); // one post(); the retry re-subscribes to the same observable
  });

  it('SD-31: gives up after the transport-retry budget and returns the normalised failure of the last attempt', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attempts = 0;
    const { service } = serviceWith(() => defer(() => { attempts += 1; return throwError(() => bare(502)); }));

    const pending = service.uploadImageFile(UPLOAD);
    await vi.advanceTimersByTimeAsync(2000 + 4000 + 8000);
    const result = await pending;

    expect(attempts).toBe(3);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
  });

  it('FR-61: an answer from our own server is NOT retried and carries its status and code', async () => {
    let attempts = 0;
    const { service } = serviceWith(() => defer(() => { attempts += 1; return throwError(() => ours(415, 'UNSUPPORTED_IMAGE_TYPE')); }));

    const result = await service.uploadImageFile(UPLOAD);

    expect(attempts).toBe(1);
    expect(result).toEqual({ ok: false, status: 415, errorField: 'UNSUPPORTED_IMAGE_TYPE' });
  });

  it('FR-21: aborting during an upload unsubscribes and resolves { ok: false, status: 0 }', async () => {
    const state = { unsubscribed: 0 };
    const { service } = serviceWith(() => new Observable<never>(() => () => { state.unsubscribed += 1; }));
    const controller = new AbortController();

    const pending = service.uploadImageFile(UPLOAD, controller.signal);
    controller.abort();

    await expect(pending).resolves.toEqual({ ok: false, status: 0 });
    expect(state.unsubscribed).toBe(1);
  });
});
