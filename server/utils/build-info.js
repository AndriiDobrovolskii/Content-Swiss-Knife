/**
 * build-info.js
 *
 * One boot line saying which commit the running server was built from.
 *
 * WHY THIS EXISTS. `ng serve` reloads `src/**` on save; `node server/index.js` did not reload
 * anything. So a session could — and on 2026-08-02 did — run a frontend from HEAD against a backend
 * 76 minutes older, and produce a failure whose message had been deleted from the tree over an hour
 * earlier. Every symptom pointed at the code on disk, which was innocent. `--watch` in package.json
 * stops the drift happening; this line stops it being INVISIBLE when it does, which is what actually
 * cost the time. It is the same hazard `server/index.js`'s EADDRINUSE comment already documents for
 * `.env` — an older process answering from its own boot-time snapshot — one layer up.
 *
 * The split follows call-log.js and for the same reason: `formatBuild` is pure and therefore
 * testable, `readBuild` does the I/O, and `server/index.js` owns the `console`.
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Repo root, derived from this file rather than `process.cwd()` — `git -C` must not depend on
 *  which directory the server happened to be launched from. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Sortable and zero-padded, because the whole use of this line is comparing it to a wall clock. */
const pad = (n) => String(n).padStart(2, '0');

const stamp = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
  + `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * `[Server] Build 8a86493 (2026-08-02 11:32) · clean · .env 2026-08-02 10:14`
 *
 * Every field is optional and every clause is independently suppressed — git is not a runtime
 * dependency of this server, and a tarball deploy or a missing `.env` must still boot. Degrading to
 * `Build unknown` matches call-log.js's `target()` degrading to `'unresolved'`: say less, never say
 * `undefined`.
 *
 * @param {object}        o
 * @param {string|null}   o.sha       short commit hash, null when git could not answer
 * @param {Date|null}     o.date      commit date
 * @param {boolean}       o.dirty     uncommitted changes under `server/` — see readBuild
 * @param {Date|null}     o.envMtime  when the `.env` this process read was last written
 */
export function formatBuild({ sha, date, dirty, envMtime }) {
  const build = sha
    ? `Build ${sha}${date ? ` (${stamp(date)})` : ''}`
    : 'Build unknown';
  // Suppressed with the sha rather than defaulting to "clean": without a commit to compare against,
  // claiming the tree is clean would be an assertion nothing checked.
  const status = sha ? (dirty ? 'dirty (uncommitted server changes)' : 'clean') : null;
  const env = envMtime ? `.env ${stamp(envMtime)}` : null;

  return `[Server] ${[build, status, env].filter(Boolean).join(' · ')}`;
}

/**
 * The impure half. Reads git and the filesystem, and swallows every failure: this runs inside the
 * `listen` callback, so a throw here would take the boot down over a diagnostic.
 *
 * The dirty flag is scoped to `server/` on purpose. A dirty `src/` says nothing about what this
 * process is executing — the Angular dev server reloads that on save. "Uncommitted server code" is
 * the fact that explains a log line disagreeing with the tree.
 */
export function readBuild() {
  // execFileSync, not execSync: no shell means no quoting and no `%` expansion. The first draft
  // built a command string, and `--format=%h %cI` came back empty on Windows — cmd.exe split the
  // format at the space and git read `%cI` as a pathspec.
  const git = (...args) =>
    execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

  let sha = null;
  let date = null;
  let dirty = false;
  try {
    // One call for both fields. `%cI` is ISO-8601 with an offset, so `new Date` needs no help and
    // the line prints in the reader's own timezone — the one their clock is in.
    const [hash, iso] = git('log', '-1', '--format=%h %cI').trim().split(' ');
    sha = hash || null;
    const parsed = iso ? new Date(iso) : null;
    date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    dirty = git('status', '--porcelain', '--', 'server').trim().length > 0;
  } catch {
    // No git, no repo, or a checkout too shallow to answer. The line degrades; the server boots.
  }

  let envMtime = null;
  try {
    envMtime = statSync(path.join(ROOT, '.env')).mtime;
  } catch {
    // No .env — a valid configuration when the keys come from the real environment.
  }

  return { sha, date, dirty, envMtime };
}
