/**
 * The Express application's middleware composition, with no side effects.
 *
 * `server/index.js` calls `app.listen()` and installs process handlers at module scope, so a test
 * cannot import it. The composition therefore lives here: `createApp(deps)` builds the app and returns
 * it; it never listens and installs no process handler, so importing this module starts nothing.
 *
 * THE ORDER IS THE CONTRACT (FR-27, FR-51, NFR-6) and this is the only place it is written:
 *   1. `trust proxy` = 1   - one proxy hop (Railway); `req.ip` is the left-most untrusted hop, so a
 *                            client-forged `X-Forwarded-For` cannot choose its own key.
 *   2. `cors()`            - BEFORE the body limit, so a 411 / 413 rejection still carries the CORS
 *                            headers the browser needs to read it.
 *   3. image body limit    - `/api/image-studio` only, BEFORE the global parser: a tighter cap on the
 *                            image routes without touching any other route.
 *   4. `express.json` and `express.urlencoded` at 50 MB - unchanged for every existing route.
 *   5. `mountImageRoutes(app)`, then `registerRoutes(app)` - routes are registered after the parsers.
 */
import express from 'express';
import cors from 'cors';
import { corsOriginPolicy } from './cors-policy.js';
import { imageBodyLimit } from './image-studio/body-limit.js';

/**
 * @param {object} deps
 * @param {string[]} deps.allowedOrigins exact-match CORS allow-list (see `resolveAllowedOrigins`)
 * @param {(app: import('express').Express) => void} [deps.mountImageRoutes] mounts the image routes
 * @param {(app: import('express').Express) => void} [deps.registerRoutes] registers the remaining routes
 * @returns {import('express').Express}
 */
export function createApp({ allowedOrigins, mountImageRoutes, registerRoutes } = {}) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors({ origin: corsOriginPolicy(allowedOrigins) }));
  app.use('/api/image-studio', imageBodyLimit());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  if (typeof mountImageRoutes === 'function') mountImageRoutes(app);
  if (typeof registerRoutes === 'function') registerRoutes(app);

  return app;
}
