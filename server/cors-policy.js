/**
 * The proxy's CORS allow-list, as two pure functions.
 *
 * `server/index.js` calls `app.listen()` at module scope, so it cannot be imported by a test.
 * The decision therefore lives here, where it can be unit-tested directly, and `index.js` keeps
 * only the wiring — the same split `server/llm-request.js` already uses.
 */

/**
 * The origin the Angular dev server runs on (`angular.json` → `serve.options.port: 3000`).
 * This is the fail-closed fallback, not a convenience default.
 */
const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';

/**
 * `ALLOWED_ORIGINS`, verbatim, to a normalised allow-list.
 *
 * Entries are comma-separated, surrounding whitespace is ignored, and a single trailing `/` is
 * stripped: a browser sends `Origin: https://shop.example` with no trailing slash, so without
 * that an operator who configures `https://shop.example/` would get a proxy that looks
 * configured and silently blocks everything, with no error anywhere. Beyond the trailing slash
 * there is NO normalisation — matching is exact and case-sensitive (see `corsOriginPolicy`), so
 * do not lowercase here.
 *
 * FAIL CLOSED, BY CONSTRUCTION. The return value is always a non-empty array: when the variable
 * is unset, empty, or parses to zero entries, it is `[DEFAULT_ALLOWED_ORIGIN]`. There is
 * deliberately no path that yields `[]` or `undefined`, because `cors()` reads a falsy `origin`
 * option as permission for every origin (`node_modules/cors/lib/index.js`:
 * `if (!options.origin || options.origin === '*')`). Adding such a path re-opens exactly the
 * silent wildcard this module exists to close.
 *
 * @param {string | undefined} raw the value of `ALLOWED_ORIGINS`
 * @returns {string[]} a non-empty list of exact origins
 */
export function resolveAllowedOrigins(raw) {
  const configured = String(raw ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/$/, ''))
    // After the trailing slash is stripped, so a lone `/` cannot survive as an empty entry.
    .filter((entry) => entry.length > 0);

  return configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN];
}

/**
 * An allow-list to the `origin` callback the `cors` package expects.
 *
 * REFUSE BY OMISSION, NEVER BY ERROR. `cors` calls `next(err)` whenever the callback's first
 * argument is truthy, which aborts the request; `callback(null, false)` instead omits the
 * `Access-Control-Allow-Origin` header and lets the request run normally, leaving the browser to
 * block the response. That is what this proxy requires, so the first argument is always `null`.
 * `callback(new Error('Not allowed by CORS'))` is the shape most examples online use — copying
 * it would appear to work while changing the behaviour.
 *
 * A request with no `Origin` header arrives here as `undefined` and is allowed: that is a
 * server-to-server call, curl, or the deploy health check, none of which a CORS policy governs.
 * An `Origin` header that is present but empty is the empty string, which matches no entry and
 * is therefore refused — that falls out of exact matching and is deliberately not special-cased.
 *
 * Matching is exact string comparison: case-sensitive, no wildcard, no subdomain match, no port
 * inference. Change that here and nowhere else.
 *
 * @param {string[]} allowed the list from `resolveAllowedOrigins`
 * @returns {(origin: string | undefined, callback: (error: null, allowed: boolean) => void) => void}
 */
export function corsOriginPolicy(allowed) {
  return (origin, callback) => {
    callback(null, origin === undefined || allowed.includes(origin));
  };
}
