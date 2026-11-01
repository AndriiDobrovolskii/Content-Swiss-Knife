/**
 * Content-Length body limit for `/api/image-studio/*` (FR-51, FR-61, SD-2, SD-3).
 *
 * Mounted by `createApp` as `app.use('/api/image-studio', imageBodyLimit())` AFTER `cors()`, so a
 * rejection still carries the CORS headers the browser needs to read it, and BEFORE the global 50 MB JSON
 * parser, so the image routes get a tighter cap than every other route without touching them.
 *
 * It decides only on the method and the DECLARED length; it never reads the body. GET, HEAD and OPTIONS
 * pass untouched (a CORS preflight must never be rejected here).
 */
import { MAX_BODY_BYTES } from './constants.js';
import { ImageStudioError } from './errors.js';

const BODY_LESS_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function reject(res, code) {
  const error = new ImageStudioError(code);
  res.status(error.status).json(error.body);
}

/**
 * The declared length as a number, or `undefined` when the header is absent or not a plain
 * non-negative integer (a malformed value is treated as not declared).
 */
function declaredLength(req) {
  const raw = req.headers?.['content-length'];
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) return undefined;
  return Number(raw.trim());
}

/** @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void} */
export function imageBodyLimit() {
  return function imageBodyLimitMiddleware(req, res, next) {
    if (BODY_LESS_METHODS.has(String(req.method).toUpperCase())) {
      next();
      return;
    }
    const length = declaredLength(req);
    if (length === undefined) {
      reject(res, 'CONTENT_LENGTH_REQUIRED');
      return;
    }
    if (length > MAX_BODY_BYTES) {
      reject(res, 'REQUEST_BODY_TOO_LARGE');
      return;
    }
    next();
  };
}
