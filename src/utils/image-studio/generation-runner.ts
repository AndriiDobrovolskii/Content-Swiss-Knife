import { buildGenerateRequest, type BuildInput, type GenerateRequest } from './request-builder';
import { dispatchError } from './error-dispatch';
import type { Announcer, Clock, Part, Scheduler, StoredSession, UiLanguage } from './ports';
import { parseGenerateResponse, type GenerateResponse } from './schemas';
import { studioText } from './studio-texts';
import type { ImageHttpResult } from '../../services/image-studio/http-abort';

/**
 * The generation runner (US-10.1 DD-19): one call of `run()` is ONE user action (Send or Retry).
 *
 * It builds the request from the session snapshot BEFORE anything else (SD-27) and keeps no reference to the live
 * session; announces T-16; arms ONE deadline of 120 000 ms from Send, covering every wait on the BFF (SD-30);
 * calls `generateImage` exactly once (the client never retries a paid generation, FR-85); validates a 200 with the
 * response schema; and returns a closed outcome. The outcome promise settles at Cancel or deadline time and a late
 * response afterwards is ignored. A response is applied only to the session that sent it (SD-22).
 *
 * Announcements (FR-74): T-16 at the start; T-17 only when a version was created, carrying the highest number of a
 * multi-image response; every other end calls `clear()` once and announces nothing. Every effect (time, timers,
 * HTTP, storage, announcements) is an injected dependency, so the module is plain TypeScript (NFR-14).
 */

/** The single deadline of one user action, measured on the client from Send or Retry (SD-30). */
export const GENERATION_DEADLINE_MS = 120_000;

export interface RunnerDeps {
  generateImage(request: GenerateRequest, signal: AbortSignal): Promise<ImageHttpResult>;
  uploadImage(request: { data: string }, signal: AbortSignal): Promise<ImageHttpResult>;
  /** The slice of the session store the runner needs. */
  store: {
    getSentBytes(sessionId: string, fileUri: string): Promise<{ bytes: Uint8Array; mimeType: string } | null>;
    remapFileUris(sessionId: string, map: Record<string, string>): Promise<void>;
  };
  clock: Clock;
  scheduler: Scheduler;
  announcer: Announcer;
  uiLanguage: UiLanguage;
  /** False when the session that sent the request no longer exists (SD-22). */
  sessionExists(sessionId: string): boolean | Promise<boolean>;
}

export interface RunInput {
  sessionId: string;
  snapshot: StoredSession;
  buildInput: BuildInput;
}

export type RunOutcome =
  | { type: 'images'; sessionId: string; request: GenerateRequest; response: GenerateResponse }
  | { type: 'text'; sessionId: string; request: GenerateRequest; response: GenerateResponse }
  | { type: 'safety'; sessionId: string; request: GenerateRequest; response: GenerateResponse }
  | { type: 'failed'; textId: string; retry: boolean; restore: true; retryAfterSeconds?: number }
  | { type: 'blocked'; textId: 'T-14'; restore: true }
  | { type: 'cancelled'; restore: true }
  | { type: 'discarded' };

export interface GenerationRunner {
  run(input: RunInput, cancelSignal?: AbortSignal): Promise<RunOutcome>;
}

/** A final (non-thought) inline image part: the only kind that becomes a numbered version. */
function isVersionPart(part: Part): boolean {
  return (
    part.thought !== true &&
    typeof part.inlineData?.mimeType === 'string' &&
    part.inlineData.mimeType.startsWith('image/') &&
    typeof part.inlineData.data === 'string' &&
    part.inlineData.data.length > 0
  );
}

/** The number of turn ids a request carries: the retained turns and the new one (the bound on `trimmedTurnIds`). */
function requestTurnIdCount(request: GenerateRequest): number {
  return request.history.length + 1;
}

export function createGenerationRunner(deps: RunnerDeps): GenerationRunner {
  return {
    async run(input: RunInput, cancelSignal?: AbortSignal): Promise<RunOutcome> {
      // Built from the snapshot before any append. An empty message throws here: nothing is announced or sent.
      const { request } = buildGenerateRequest(input.snapshot, input.buildInput);

      deps.announcer.announce(studioText('T-16', deps.uiLanguage()));

      return new Promise<RunOutcome>((resolve) => {
        const controller = new AbortController();
        let finished = false;
        let deadline: unknown;

        const onCancel = (): void => finish({ type: 'cancelled', restore: true });

        /** Settles the action once: stops the timer and the cancel listener, aborts every pending call. */
        const finish = (outcome: RunOutcome, announcement?: string): void => {
          if (finished) return;
          finished = true;
          deps.scheduler.clearTimeout(deadline);
          cancelSignal?.removeEventListener('abort', onCancel);
          if (announcement !== undefined) deps.announcer.announce(announcement);
          else deps.announcer.clear();
          controller.abort();
          resolve(outcome);
        };

        deadline = deps.scheduler.setTimeout(
          () => finish({ type: 'failed', textId: 'T-6', retry: true, restore: true }),
          GENERATION_DEADLINE_MS,
        );
        if (cancelSignal?.aborted) {
          onCancel();
          return;
        }
        cancelSignal?.addEventListener('abort', onCancel, { once: true });

        const fail = (result: Extract<ImageHttpResult, { ok: false }>): void => {
          const dispatched = dispatchError({ status: result.status, errorField: result.errorField });
          if (dispatched.blocked) {
            finish({ type: 'blocked', textId: 'T-14', restore: true });
            return;
          }
          finish({
            type: 'failed',
            textId: dispatched.textId,
            retry: dispatched.retry,
            restore: true,
            ...(dispatched.retryAfterSeconds !== undefined ? { retryAfterSeconds: dispatched.retryAfterSeconds } : {}),
          });
        };

        const succeed = async (body: unknown): Promise<void> => {
          const parsed = parseGenerateResponse(body, requestTurnIdCount(request));
          if (parsed.ok === false) {
            finish({ type: 'failed', textId: 'T-12', retry: false, restore: true });
            return;
          }
          const response = parsed.value;
          if (!(await deps.sessionExists(input.sessionId))) {
            finish({ type: 'discarded' });
            return;
          }
          if (finished) return;
          if (response.kind === 'images') {
            const created = response.parts.filter(isVersionPart).length;
            const highest = input.snapshot.meta.nextVersionNumber + created - 1;
            finish(
              { type: 'images', sessionId: input.sessionId, request, response },
              studioText('T-17', deps.uiLanguage(), { N: highest }),
            );
            return;
          }
          finish({ type: response.kind, sessionId: input.sessionId, request, response });
        };

        deps
          .generateImage(request, controller.signal)
          .then(async (result) => {
            if (finished) return;
            if (result.ok === false) fail(result as Extract<ImageHttpResult, { ok: false }>);
            else await succeed((result as Extract<ImageHttpResult, { ok: true }>).body);
          })
          .catch(() => {
            // A rejection is an unexpected transport failure: a failed turn the user may retry.
            finish({ type: 'failed', textId: 'T-7', retry: true, restore: true });
          });
      });
    },
  };
}
