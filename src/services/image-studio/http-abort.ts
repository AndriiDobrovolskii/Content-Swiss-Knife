import { Observable, Subscription } from 'rxjs';

/**
 * The result of one Image Studio HTTP call, normalised so the pure error dispatch can decide without
 * `HttpErrorResponse` (US-10.1 DD-18). Failures are RETURNED, never thrown.
 *
 * `errorField` is the `error` string of our own `{ error }` envelope (a closed BFF code or the fixed
 * upstream text) when the response carries one, otherwise undefined. `status` 0 means no response, and is
 * also what an abort resolves with.
 */
export type ImageHttpResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; errorField?: string };

/** Reads the status and our `{ error }` envelope out of whatever the HTTP layer threw. */
function normaliseFailure(error: unknown): ImageHttpResult {
  if (!error || typeof error !== 'object') return { ok: false, status: 0 };
  const { status, error: body } = error as { status?: unknown; error?: unknown };
  const errorField =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : undefined;
  return { ok: false, status: typeof status === 'number' ? status : 0, errorField };
}

/**
 * Runs one request and bridges an `AbortSignal` to the observable: aborting unsubscribes the in-flight
 * request and resolves `{ ok: false, status: 0 }`. `start` is only called when the signal is not already
 * aborted, so an aborted call makes no request at all. The subscription is made synchronously, before
 * this function returns. This is the one place RxJS is touched by the studio (the HTTP boundary).
 */
export function runAbortable(start: () => Observable<unknown>, signal?: AbortSignal): Promise<ImageHttpResult> {
  if (signal?.aborted) return Promise.resolve({ ok: false, status: 0 });

  return new Promise<ImageHttpResult>((resolve) => {
    let settled = false;
    let subscription: Subscription | undefined;
    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      subscription?.unsubscribe();
      resolve({ ok: false, status: 0 });
    };
    const settle = (result: ImageHttpResult): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    subscription = start().subscribe({
      next: (body) => settle({ ok: true, body }),
      error: (error) => settle(normaliseFailure(error)),
    });
    // A synchronous settle happened before `subscription` was assigned; nothing is left to cancel then.
    if (settled) subscription.unsubscribe();
  });
}
