/**
 * US-10.5 T1 - the persistence row mapping of a stored turn (plan DD-3, risk R-1).
 * Covers FR-23 ("the save path does not drop them"), FR-25 (old rows read back unchanged), NFR-6 (no data loss).
 *
 * WHY THIS SPEC EXISTS. The IndexedDB adapter has no spec by project decision (no fake-indexeddb), and it used to copy only
 * `id, role, parts` of a turn. A new optional `Turn` field would then pass every in-memory test and silently never reach the
 * disk. The adapter now calls the pure pair below; this spec is the contract of the pair, and
 * `test/image-studio-architecture.spec.ts` ("US-10.5 DD-3 / R-1 (T1)") proves the adapter calls nothing else.
 *
 * PINNED CONTRACT (src/utils/image-studio/turn-record.ts, owner T1):
 *   toTurnRecord(sessionId: string, turn: Turn): TurnRecord      spreads the WHOLE turn and adds `sessionId`
 *   fromTurnRecord(row: unknown): Turn | null                    drops only `sessionId`; the rest goes through parseStoredTurn
 *
 * Logic runner. Red until T1 (the module does not exist yet).
 */
import { describe, it, expect } from 'vitest';
import { toTurnRecord, fromTurnRecord } from './turn-record';
import type { Turn } from './ports';

describe('FR-23 / R-1: a turn carrying every optional field survives a write and a read (T1)', () => {
  const full: Turn = {
    id: 'm1',
    role: 'model',
    parts: [{ text: 'hello' }, { inlineData: { mimeType: 'image/png', data: 'AAAA' }, thoughtSignature: 'sig' }],
    cost: 0.067,
    durationMs: 12_400,
    presetId: 'white-bg',
    inputRefs: [{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }],
  };

  it('the stored row carries each of the four extras under its own key, and the session id', () => {
    const row = toTurnRecord('s1', full) as unknown as Record<string, unknown>;
    expect(row['sessionId']).toBe('s1');
    expect(row['cost']).toBe(0.067);
    expect(row['durationMs']).toBe(12_400);
    expect(row['presetId']).toBe('white-bg');
    expect(row['inputRefs']).toEqual([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }]);
    expect(row['id']).toBe('m1');
    expect(row['role']).toBe('model');
    expect(row['parts']).toEqual(full.parts);
  });

  it('reading the row back gives the turn field for field, without the session id', () => {
    const back = fromTurnRecord(toTurnRecord('s1', full));
    expect(back).toEqual(full);
    expect(back).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(back as object, 'sessionId')).toBe(false);
  });

  it('a value the Specification does not list ("an extra value") is preserved as stored and ignored, never rejected', () => {
    const withExtra = { ...full, futureField: { a: 1 } } as Turn;
    const back = fromTurnRecord(toTurnRecord('s1', withExtra)) as Record<string, unknown> | null;
    expect(back).not.toBeNull();
    expect(back?.['futureField']).toEqual({ a: 1 });
  });
});

describe('FR-25 / NFR-6: an old row (saved before US-10.5) reads back identical (T1)', () => {
  it('a row with only id, role, parts and a session id reads back as exactly {id, role, parts} - no key is invented', () => {
    const oldRow = { sessionId: 's1', id: 'u1', role: 'user', parts: [{ text: 'a mug' }] };
    const back = fromTurnRecord(oldRow);
    expect(back).toEqual({ id: 'u1', role: 'user', parts: [{ text: 'a mug' }] });
    expect(Object.keys(back as object).sort()).toEqual(['id', 'parts', 'role']);
  });

  it('writing an old-shaped turn adds no extra key to the row', () => {
    const row = toTurnRecord('s1', { id: 'u1', role: 'user', parts: [{ text: 'x' }] });
    expect(Object.keys(row).sort()).toEqual(['id', 'parts', 'role', 'sessionId']);
  });
});

describe('FR-23 / P-9: only a core-field failure rejects a row (T1)', () => {
  it('a present-but-invalid optional field does NOT reject the row: the turn is returned and the value is left to the read-side readers', () => {
    const row = { sessionId: 's1', id: 'm1', role: 'model', parts: [{ text: 'x' }], cost: 'abc', durationMs: -5, presetId: 7 };
    const back = fromTurnRecord(row);
    expect(back).not.toBeNull();
    expect(back?.id).toBe('m1');
  });

  it('a row whose role is not user or model is rejected (null), as before', () => {
    expect(fromTurnRecord({ sessionId: 's1', id: 'm1', role: 'system', parts: [] })).toBeNull();
  });
});
