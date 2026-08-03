/**
 * build-info.spec.ts
 *
 * WHY THIS EXISTS. On 2026-08-02 a run failed twice with `Retryable HTTP Error: Service
 * Unavailable` — the exact message commit `0ded189` had removed. The fix was correct; it had never
 * been loaded. `npm run server` was plain `node server/index.js`, so the Express half kept running
 * the code it read at boot while `ng serve` beside it hot-reloaded `src/**`. The process started at
 * 10:16:31; the fix was committed at 11:32:44. Nothing in the log said so, and the diagnosis cost a
 * full session.
 *
 * The boot line this formatter produces makes that self-evident: a pasted log now names the commit
 * the process is actually executing. `--watch` (package.json) stops the drift; this stops the
 * *silence* about it, which is the half that wasted the time.
 *
 * Only the pure half is tested, matching call-log.js's split — `readBuild()` shells out to git, and
 * mocking execSync would assert the mock rather than the behaviour. Its real evidence is the boot
 * line itself.
 */
import { describe, it, expect } from 'vitest';

import { formatBuild } from '../server/utils/build-info.js';

const COMMITTED = new Date(2026, 7, 2, 11, 32);   // 2026-08-02 11:32, local — as git reports it
const ENV_READ = new Date(2026, 7, 2, 10, 14);

describe('formatBuild', () => {
  it('names the commit the running process was built from', () => {
    expect(formatBuild({ sha: '8a86493', date: COMMITTED, dirty: false, envMtime: ENV_READ }))
      .toBe('[Server] Build 8a86493 (2026-08-02 11:32) · clean · .env 2026-08-02 10:14');
  });

  /**
   * Scoped to `server/` deliberately. A dirty `src/` says nothing about what this process is
   * executing — ng serve already reloaded it. Uncommitted SERVER code is the thing you need to know
   * when a log line disagrees with the tree.
   */
  it('says when the process is running uncommitted server code', () => {
    expect(formatBuild({ sha: '8a86493', date: COMMITTED, dirty: true, envMtime: ENV_READ }))
      .toContain('· dirty (uncommitted server changes)');
  });

  /**
   * git is not a runtime dependency of the server. A missing binary, a tarball deploy or a detached
   * checkout must degrade to a line that says nothing, never to `Build undefined` and never to a
   * throw — this runs inside the listen callback, so throwing here takes the boot down with it.
   */
  it('degrades to "unknown" when git could not answer, without throwing', () => {
    expect(formatBuild({ sha: null, date: null, dirty: false, envMtime: null }))
      .toBe('[Server] Build unknown');
  });

  it('keeps the .env clause even when git is unavailable — the two are independent', () => {
    expect(formatBuild({ sha: null, date: null, dirty: false, envMtime: ENV_READ }))
      .toBe('[Server] Build unknown · .env 2026-08-02 10:14');
  });

  /** Same suppression call-log.js uses for its optional fields: absent means absent, not `null`. */
  it('omits the .env clause when there is no .env to stamp', () => {
    const line = formatBuild({ sha: '8a86493', date: COMMITTED, dirty: false, envMtime: null });
    expect(line).toBe('[Server] Build 8a86493 (2026-08-02 11:32) · clean');
    expect(line).not.toContain('.env');
  });

  it('drops the date parenthetical rather than printing an empty one', () => {
    expect(formatBuild({ sha: '8a86493', date: null, dirty: false, envMtime: null }))
      .toBe('[Server] Build 8a86493 · clean');
  });

  /**
   * The whole point is comparing this line against a wall-clock time, so a zero-padded, sortable
   * stamp matters more than locale prettiness. December and single-digit minutes are where a naive
   * implementation drifts — month is 0-indexed, and `:5` is not a minute.
   */
  it('zero-pads every field of the stamp', () => {
    expect(formatBuild({
      sha: 'abc1234', date: new Date(2026, 11, 5, 9, 5), dirty: false, envMtime: null,
    })).toBe('[Server] Build abc1234 (2026-12-05 09:05) · clean');
  });
});
