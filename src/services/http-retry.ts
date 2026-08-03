/**
 * http-retry.ts
 *
 * Client-side retry for calls to our own backend, and the mirror image of `server/utils/retry.js`:
 * that file protects a request once it has reached the server, this one protects the request
 * getting there.
 *
 * WHY IT EXISTS. Every LLM call goes through `LlmService.post()`, which had no retry at all. On
 * 2026-08-03 a `node --watch` restart landed on an in-flight `/llm/vision` call and discarded a
 * generation that had already paid for the master, slug and SEO — for a connection that was down
 * for about a second. Losing a whole run to a one-second gap is the wrong trade.
 *
 * THE FAILURE DOES NOT LOOK LIKE A NETWORK FAILURE, which is the part worth reading twice. Under
 * `ng serve` the browser talks to Vite (port 3000) and Vite proxies to the API (3001,
 * proxy.conf.json). When the upstream connection drops, Vite does not pass a network error through
 * — it manufactures an HTTP 500 with an empty `text/plain` body. The real HttpErrorResponse was:
 *
 *     status: 500 · statusText: "Internal Server Error" · error: null · content-type: text/plain
 *
 * So `status === 0` — the textbook test for "the request never completed" — is false here, and a
 * retry built on it would not have fired. What actually distinguishes the two cases is the BODY.
 */
import { MonoTypeOperatorFunction, retry, throwError, timer } from 'rxjs';

/**
 * Did this failure come from our server, or from something in front of it?
 *
 * `sendError` (server/index.js:38) answers EVERY failure as
 * `res.status(error.status || 500).json({ error: describeError(error) })` — always JSON, always an
 * `error` string. A proxy, a gateway or a dead socket cannot produce that envelope. So its presence
 * means the request was received and considered, and its absence means it was not.
 *
 * That distinction is what keeps this from multiplying the server's own work. `withRetry` already
 * spends three attempts on a provider 429/503, and those reach the browser as our envelope with a
 * 503 status. Retrying them here too would turn one failure into nine paid calls — and would do it
 * on precisely the errors that cost the most.
 */
export function isUpstreamTransportFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { status, error: body } = error as { status?: unknown; error?: unknown };
  if (typeof status !== 'number') return false;

  // Our own envelope: answered, considered, and already retried upstream where it mattered.
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
    return false;
  }

  // 0 — the browser never got a response at all (production, or any path without a dev proxy).
  // 5xx gateway statuses with no body of ours — something in front of the server answered for it.
  // 500 is included here, unlike in server/utils/retry.js where a bare 500 is deliberately NOT
  // retried: there a 500 is the PROVIDER's considered answer and usually means a malformed request,
  // whereas here it is the shape Vite invents for a connection it could not make.
  return status === 0 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * Retries only what nothing answered, with exponential backoff.
 *
 * ⚠ NOT IDEMPOTENT, AND THAT IS THE ACCEPTED TRADE. If the connection dropped AFTER the model
 * answered but before the response arrived, the retry runs — and pays for — that call a second
 * time. One repeated call is strictly cheaper than discarding a generation that has already paid
 * for every artifact before it. The alternative would be a request-id and server-side dedupe, which
 * is a great deal of machinery for a failure measured in seconds per month.
 *
 * The first delay also covers the window a restarting server spends refusing connections outright
 * (the ECONNREFUSED that followed the ECONNRESET in the 2026-08-03 log).
 *
 * `baseDelayMs` is a parameter for the same reason `withRetry(operation, maxRetries, baseDelayMs)`
 * has one — so a test can pass 1 and not wait seconds per case.
 */
export function retryTransport<T>(maxAttempts = 3, baseDelayMs = 2000): MonoTypeOperatorFunction<T> {
  return retry<T>({
    count: maxAttempts - 1,
    delay: (error, attempt) => {
      // Anything the server actually answered propagates untouched — same error object, same
      // stack, first attempt. Swallowing it here would hide a real failure behind a slow one.
      if (!isUpstreamTransportFailure(error)) return throwError(() => error);

      const wait = baseDelayMs * Math.pow(2, attempt - 1);
      // The server prints `[Retry]` for the same event; a silently-recovered drop is
      // indistinguishable from a call that was always healthy, which is how the pre-Phase-7 Gemini
      // regression stayed invisible for a day.
      console.warn(
        `[Retry] Attempt ${attempt}/${maxAttempts - 1} — the request never reached the server `
        + `(status ${(error as { status?: unknown }).status}). Retrying in ${wait}ms…`
      );
      return timer(wait);
    },
  });
}
