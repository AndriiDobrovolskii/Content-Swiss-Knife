/**
 * Request handlers of the Image Studio BFF routes (US-10.1, DD-5, DD-11, DD-13).
 *
 * Handler factories: every effect is an injected dependency, so a test drives a handler with a fake
 * `req`/`res` and a stub provider, with no socket, no network and no real waiting.
 *
 *   deps.getGemini()        the Gemini provider (independent of LLM_PROVIDER, FR-6)
 *   deps.hasGeminiKey()     whether a Gemini key is configured (FR-5)
 *   deps.sleep(ms, signal)  abortable wait used by the retry loop (FR-60)
 *   deps.log(...)           server-side log sink
 *
 * Answers: a success body, or `{ error: <closed code> }` / `{ error: FIXED_API_ERROR }` only (FR-61, NFR-3).
 * Upstream text, the API key and request payloads never reach a response body or a log line.
 *
 * Cancel (FR-21, DD-13): each handler aborts its AbortController when the RESPONSE closes before it finished.
 * Node also emits 'close' on the request once its body is read, so the abort is keyed on the response.
 */
import { describeError } from '../utils/describe-error.js';
import { ImageStudioError } from './errors.js';
import { detectImageType } from './magic-bytes.js';
import { parseUploadRequest } from './request-schema.js';
import { runWithRetry } from './retry-loop.js';

/** The fixed text for an upstream failure that has no closed code of its own (SD-2). */
export const FIXED_API_ERROR = 'Помилка API';

const MAX_LOGGED_DETAIL = 300;

/** Remove the API key (and any `key=` query value) from text bound for a log line (NFR-3). */
function redact(text) {
  let out = String(text);
  const key = process.env.GEMINI_API_KEY;
  if (key) out = out.split(key).join('[redacted]');
  out = out.replace(/([?&]key=)[^&\s"']+/gi, '$1[redacted]');
  return out.length > MAX_LOGGED_DETAIL ? `${out.slice(0, MAX_LOGGED_DETAIL)}...` : out;
}

/** Errors whose detail was already written to the log by `logged()`, so the final answer does not repeat it. */
const alreadyLogged = new WeakSet();

/**
 * Run one upstream call and, on failure, write its detail to the server log (redacted) before rethrowing
 * it unchanged. The retry loop replaces an exhausted run with a closed-code error that carries no upstream
 * text, so the detail has to be captured here, per attempt (NFR-3: logged server-side, never to the browser).
 */
async function logged(log, route, call) {
  try {
    return await call();
  } catch (error) {
    const status = error?.status;
    log(`[ImageStudio] ${route} upstream call failed: status=${Number.isInteger(status) ? status : 'none'} detail=${redact(describeError(error))}`);
    if (typeof error === 'object' && error !== null) alreadyLogged.add(error);
    throw error;
  }
}

/** Abort `controller` when the response closes before it finished (Cancel, FR-21). */
function abortOnEarlyClose(res, controller) {
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
}

/**
 * Answer a failure with a closed code or the fixed text; never upstream text. Returns without writing
 * when the client already went away (the abort is not an error to report).
 */
function answerError(res, error, { signal, log, route }) {
  if (signal.aborted) return;
  if (error instanceof ImageStudioError) {
    res.status(error.status).json(error.body);
    return;
  }
  const status = error?.status;
  if (!alreadyLogged.has(error)) {
    log(`[ImageStudio] ${route} failed: status=${Number.isInteger(status) ? status : 'none'} detail=${redact(describeError(error))}`);
  }
  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    res.status(status).json({ error: FIXED_API_ERROR });
    return;
  }
  res.status(500).json({ error: FIXED_API_ERROR });
}

/**
 * POST /api/image-studio/upload. Order (plan choice P-5): body validation 400 -> magic bytes 415 -> key check
 * 501 -> Files API upload under the retry loop. The first failing check answers; later steps do not run.
 * The upload is not a counted request (FR-66): the limiter is never consulted.
 */
export function createUploadHandler(deps) {
  const { getGemini, hasGeminiKey, sleep, log } = deps;
  return async function uploadHandler(req, res) {
    const controller = new AbortController();
    const { signal } = controller;
    abortOnEarlyClose(res, controller);
    try {
      const { data } = parseUploadRequest(req.body);
      const bytes = Buffer.from(data, 'base64');
      const mimeType = detectImageType(bytes);
      if (!mimeType) throw new ImageStudioError('UNSUPPORTED_IMAGE_TYPE');
      if (!hasGeminiKey()) throw new ImageStudioError('GEMINI_KEY_MISSING');

      const gemini = getGemini();
      const file = await runWithRetry(
        () => logged(log, 'upload', () => gemini.uploadFile({ bytes, mimeType, signal })),
        { sleep, signal },
      );
      if (signal.aborted) return;
      // The DETECTED type is the one answered, never the client's claim (FR-9, SD-24).
      res.status(200).json({ fileUri: file.uri, mimeType });
    } catch (error) {
      answerError(res, error, { signal, log, route: 'upload' });
    }
  };
}
