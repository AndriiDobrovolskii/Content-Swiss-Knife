import type { SessionMeta } from './ports';

/**
 * The session lifecycle rules (US-10.1 FR-48 to FR-50, FR-86, SD-32, SD-33, SD-41, D-23 to D-25). Pure: the clock is
 * always a parameter, nothing is mutated.
 */

/** A session older than seven days since its last activity is deleted (SD-33). */
export const SESSION_TTL_MS = 604_800_000;
/** The most sessions kept at once (FR-86). */
export const SESSION_CAP = 20;

/** Strictly more than seven days since the last activity. Exactly seven days is KEPT (SD-33). */
export function isExpired(lastActivity: number, now: number): boolean {
  return now - lastActivity > SESSION_TTL_MS;
}

export interface EvictionOptions {
  cap: number;
  /** The session being left: never a victim (D-23). */
  leavingId?: string;
  /** A session with a generation in flight: never a victim (D-23). */
  inFlightId?: string;
  /** The session being created: never a candidate (D-23). */
  creatingId?: string;
}

/**
 * The ids to delete so that, after one more session is created, no more than `cap` remain (D-25 heals a stored count
 * above the cap). `metas` are the stored sessions BEFORE the creation. Victims are chosen oldest LAST ACTIVITY first
 * (not oldest created, FR-86); a tie is broken by the smaller id in UTF-16 code-unit order (SD-41). The protected
 * sessions are never returned, even when that leaves the cap unmet.
 */
export function pickEvictionVictims(metas: readonly SessionMeta[], opts: EvictionOptions): string[] {
  const needed = metas.length + 1 - opts.cap;
  if (needed <= 0) return [];

  const excluded = new Set([opts.leavingId, opts.inFlightId, opts.creatingId].filter((id): id is string => id !== undefined));
  return metas
    .filter((meta) => !excluded.has(meta.id))
    .sort((a, b) => a.lastActivity - b.lastActivity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, needed)
    .map((meta) => meta.id);
}

/** The only events that renew a session's last activity (SD-32). Everything else is not activity. */
const ACTIVITY_EVENTS: ReadonlySet<string> = new Set(['commit', 'cut', 'downloaded-changed']);

/** A COPY of `meta` whose `lastActivity` is `now` for an SD-32 event, and an unchanged copy otherwise. */
export function touchOnEvent(meta: SessionMeta, event: string, now: number): SessionMeta {
  const copy = structuredClone(meta);
  if (ACTIVITY_EVENTS.has(event)) copy.lastActivity = now;
  return copy;
}
