/**
 * operator-notes-form-state.spec.ts - US-9.1 T40 (category 21): the BEHAVIOUR of `OperatorNotesFormState`, the plain
 * class that holds the four operator-note textarea values and answers what the next Generate / UA Description click
 * builds from them.
 *
 * Why a class and not an `AppComponent` test: H-FR41TEST was answered by the owner (2026-10-18, "accept the default
 * split"): call-site source-text pins (`app.component.operator-notes.spec.ts`: T12, T13, T38, T39) plus THESE behaviour
 * tests satisfy FR-41, FR-31 items 4 and 5 and the form side of FR-25. This file proves what the calls DO.
 *
 * Contract (implementation plan v4 D9, task T40; not fixed by the Specification beyond the observable outcomes):
 *   values: a signal of the four textarea values (four strings, each `''` when empty)
 *   set(values): replaces the four values
 *   restore(notes?): fills the four values from a stored `operatorNotes`; `undefined` or `{}` empties them (OD-2 R2)
 *   clear(): empties the four values (FR-41 item 1)
 *   inputPart(): `{}` when the values are empty by the FR-25 rule, else `{ operatorNotes }` (FR-25, FR-27, FR-41 item 2)
 *
 * The class takes no injection context: the very first test builds one with `new` outside any injector and with no
 * `@angular/compiler` import, which is the check the plan asks for ("signal() works without an injection context under
 * the logic runner"). If it ever fails, the loop-back key is `blocked_by_architecture` (plan-review N18).
 *
 * RED BY LOAD until T40 creates `src/app/operator-notes-form-state.ts` (task breakdown constraint 1).
 * FR-25 empty rule (Specification): a value is empty when it is undefined or its `.trim()` is `''`; `operatorNotes` is empty
 * when all four values are empty, and the Generator's input builder then leaves the KEY ABSENT (never `operatorNotes: undefined`).
 */
import { describe, it, expect } from 'vitest';
import { isSignal } from '@angular/core';
import { OperatorNotesFormState } from './operator-notes-form-state';
import type { OperatorNotes } from './types';

const EMPTY = { usageScenarios: '', testResults: '', previousGenerationComparison: '', limitations: '' };
const FILLED = {
  usageScenarios: 'Desktop scanning of small parts',
  testResults: 'Scanned a 12 cm bracket in 40 s',
  previousGenerationComparison: 'Faster than the previous model',
  limitations: 'Not for glossy black surfaces',
};
const KEYS = Object.keys(EMPTY) as Array<keyof typeof EMPTY>;
const emptyByRule = (v: unknown) => v === undefined || (typeof v === 'string' && v.trim() === '');

/** The built-input property set: no `operatorNotes` KEY at all (not even an `undefined` one), per FR-25 / FR-27. */
const expectNoKey = (state: OperatorNotesFormState) => {
  const part = state.inputPart();
  expect(part).toEqual({});
  expect(Object.keys(part)).toEqual([]);
  expect('operatorNotes' in part).toBe(false);
};

const notesOf = (state: OperatorNotesFormState): OperatorNotes => {
  const part = state.inputPart() as { operatorNotes?: OperatorNotes };
  expect(part.operatorNotes, 'inputPart() has no operatorNotes').toBeDefined();
  return part.operatorNotes as OperatorNotes;
};

describe('OperatorNotesFormState - construction without an injection context (plan D9, N18)', () => {
  it('can be created with `new` outside any injector and exposes values as a readable signal of four empty strings', () => {
    const state = new OperatorNotesFormState();
    expect(isSignal(state.values)).toBe(true);
    expect(state.values()).toEqual(EMPTY);
  });

  it('a fresh state builds no operatorNotes key', () => {
    expectNoKey(new OperatorNotesFormState());
  });

  it('two instances do not share state', () => {
    const a = new OperatorNotesFormState();
    const b = new OperatorNotesFormState();
    a.set(FILLED);
    expect(b.values()).toEqual(EMPTY);
    expectNoKey(b);
  });
});

describe('OperatorNotesFormState.set and inputPart - the form side of FR-25 / FR-27', () => {
  it('set replaces the four values and the signal reads them back', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    expect(state.values()).toEqual(FILLED);
    state.set({ ...EMPTY, limitations: 'Only one' });
    expect(state.values()).toEqual({ ...EMPTY, limitations: 'Only one' });
  });

  it('four filled values give inputPart() = { operatorNotes } carrying all four values', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    expect(Object.keys(state.inputPart())).toEqual(['operatorNotes']);
    expect(notesOf(state)).toEqual(FILLED);
  });

  it('four empty strings give no key', () => {
    const state = new OperatorNotesFormState();
    state.set(EMPTY);
    expectNoKey(state);
  });

  it('four whitespace-only values give no key (empty by the FR-25 rule)', () => {
    const state = new OperatorNotesFormState();
    state.set({ usageScenarios: '   ', testResults: '\n', previousGenerationComparison: '\t \n', limitations: ' ' });
    expectNoKey(state);
  });

  it.each(KEYS)('only %s filled: the key is present and carries it, the three other entries are empty or absent', key => {
    const state = new OperatorNotesFormState();
    state.set({ ...EMPTY, [key]: 'Fact from the operator' });
    const notes = notesOf(state);
    expect(notes[key]).toBe('Fact from the operator');
    for (const other of KEYS.filter(k => k !== key)) expect(emptyByRule(notes[other]), `${other} must be empty or absent`).toBe(true);
  });

  it('a whitespace-only value next to a filled one is treated as empty', () => {
    const state = new OperatorNotesFormState();
    state.set({ ...EMPTY, usageScenarios: 'Used in schools', testResults: '   ' });
    const notes = notesOf(state);
    expect(notes.usageScenarios).toBe('Used in schools');
    expect(emptyByRule(notes.testResults)).toBe(true);
  });

  it('inputPart() follows the signal: typing then deleting a value goes key -> no key', () => {
    const state = new OperatorNotesFormState();
    state.set({ ...EMPTY, limitations: 'x' });
    expect(Object.keys(state.inputPart())).toEqual(['operatorNotes']);
    state.set(EMPTY);
    expectNoKey(state);
  });
});

describe('OperatorNotesFormState.clear - FR-41 items 1 and 2', () => {
  it('after filling four values, clear() leaves four empty values and no operatorNotes key', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.clear();
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('clear() also empties a partly filled form', () => {
    const state = new OperatorNotesFormState();
    state.set({ ...EMPTY, testResults: 'one value' });
    state.clear();
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('clear() on an already empty form is harmless', () => {
    const state = new OperatorNotesFormState();
    state.clear();
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('the form is usable after clear(): a new value builds a key again', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.clear();
    state.set({ ...EMPTY, usageScenarios: 'next product' });
    expect(notesOf(state).usageScenarios).toBe('next product');
  });
});

describe('OperatorNotesFormState.restore - FR-31 items 2, 4, 5 (OD-2 R1, R2)', () => {
  it('restoring an entry with notes puts each of the four values into its textarea (item 2)', () => {
    const state = new OperatorNotesFormState();
    state.restore({ ...FILLED });
    expect(state.values()).toEqual(FILLED);
  });

  it('after the restore, the input built for the next click carries the restored values (item 4, R1: resent)', () => {
    const state = new OperatorNotesFormState();
    state.restore({ ...FILLED });
    expect(notesOf(state)).toEqual(FILLED);
  });

  it('restoring an entry with only some keys fills those and empties the rest', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.restore({ testResults: 'Only the tests' });
    expect(state.values()).toEqual({ ...EMPTY, testResults: 'Only the tests' });
    expect(notesOf(state).testResults).toBe('Only the tests');
  });

  it('restoring replaces earlier values rather than merging with them', () => {
    const state = new OperatorNotesFormState();
    state.restore({ usageScenarios: 'old', limitations: 'old limit' });
    state.restore({ usageScenarios: 'new' });
    expect(state.values()).toEqual({ ...EMPTY, usageScenarios: 'new' });
  });

  it('fill, then restore(undefined): the four values are empty and the next input has no key (item 5, R2)', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.restore(undefined);
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('fill, then restore({}): the four values are empty and the next input has no key (item 5, R2)', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.restore({});
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('restore() with no argument is the same as an entry without notes', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.restore();
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('restoring an entry whose notes are all empty or whitespace-only builds no key', () => {
    const state = new OperatorNotesFormState();
    state.restore({ usageScenarios: '', testResults: '  ', limitations: '\n' });
    expectNoKey(state);
  });

  it('restore does not mutate the object it was given', () => {
    const state = new OperatorNotesFormState();
    const stored: OperatorNotes = { ...FILLED };
    state.restore(stored);
    state.set(EMPTY);
    expect(stored).toEqual(FILLED);
  });
});

describe('OperatorNotesFormState - the restore-then-clear chain (FR-41, second test case)', () => {
  it('restore an entry that has notes, then clear(): four empty values and no operatorNotes key', () => {
    const state = new OperatorNotesFormState();
    state.restore({ ...FILLED });
    expect(notesOf(state)).toEqual(FILLED);
    state.clear();
    expect(state.values()).toEqual(EMPTY);
    expectNoKey(state);
  });

  it('clear() then restore() fills the form again (the two operations are independent)', () => {
    const state = new OperatorNotesFormState();
    state.set(FILLED);
    state.clear();
    state.restore({ limitations: 'back again' });
    expect(state.values()).toEqual({ ...EMPTY, limitations: 'back again' });
  });
});
