import { parseStoredTurn } from './schemas';
import type { Turn } from './ports';

/**
 * US-10.5 DD-3 / R-1: the persisted row of a turn (`turns` object store) and the pure pair that maps a `Turn` to it and back.
 *
 * The IndexedDB adapter has no spec of its own (no fake-indexeddb), and it used to copy only `id`, `role` and `parts`. A new
 * optional `Turn` field would then pass every in-memory test and silently never reach the disk. The adapter now calls this
 * pair at its only two sites, so the field set is decided in one tested place: the write spreads the whole turn, the read
 * drops only the session id and lets every other key through `parseStoredTurn` (whose schema is `.passthrough()`).
 */
export type TurnRecord = Turn & { sessionId: string };

/** The stored row of `turn` in `sessionId`: every key of the turn, plus the session id. */
export function toTurnRecord(sessionId: string, turn: Turn): TurnRecord {
  return { ...turn, sessionId };
}

/** The turn of a stored row (everything but `sessionId`), or `null` when a core field is malformed. Never throws. */
export function fromTurnRecord(row: unknown): Turn | null {
  if (typeof row !== 'object' || row === null) return null;
  const { sessionId: _sessionId, ...turn } = row as Record<string, unknown>;
  return parseStoredTurn(turn);
}
