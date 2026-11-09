/**
 * US-10.5 T10 + T40 - sessionName: the one value behind the session-list row name (FR-2) and the archive name (FR-12).
 *
 * PINNED CONTRACT (src/utils/image-studio/session-name.ts, owner T10; pure):
 *   sessionName(meta: { versions: Array<{ number: number; prompt: string }> }): string
 *       the prompt of the retained version with the HIGHEST number, whitespace collapsed to single spaces and trimmed; NOT cut
 *       to the alt-text length; '' when the session has no version.
 *
 * Two top-level describe groups, selectable by `-t "\(T10\)"` / `-t "\(T40\)"` (breakdown rule R2):
 *  - (T10) the typed, non-blank latest prompt and the empty-versions case: the same under every reading of the open item.
 *  - (T40) the blank-latest and chip-latest fixtures, written to the OWNER RULING OI-A -> option a recorded in
 *    docs/decisions/US-10.5-open-decisions.md ("Owner rulings on the plan open items OI-A and OI-B", 2026-11-09): the name is the
 *    prompt of the highest-numbered retained version EVEN WHEN BLANK; a blank prompt (an images-only send) therefore yields no
 *    row name and the archive stem `image-studio-versions`; after a quick-edit chip send it is the chip instruction text.
 *    Option c (a stored last-typed field) was NOT chosen, so T38 and T39 have no tests.
 *
 * The archive-name consequences of these fixtures (`image-studio-versions`, the chip stem) are asserted in
 * studio-delivery.service.spec.ts (T40 describe), so this file depends on no module but session-name.ts.
 * Logic runner. Red until T10 (the module does not exist).
 */
import { describe, it, expect } from 'vitest';
import { sessionName } from './session-name';
import { makeVersion } from '../../../test/image-studio/helpers/fakes';

const v = (number: number, prompt: string) => makeVersion({ number, turnId: `m${number}`, prompt });

describe('FR-2 / FR-12: sessionName for a typed, non-blank latest prompt (T10)', () => {
  it('is the prompt of the version with the highest number', () => {
    expect(sessionName({ versions: [v(1, 'red mug'), v(2, 'blue mug'), v(3, 'green mug')] })).toBe('green mug');
  });

  it('takes the highest NUMBER, not the last array element', () => {
    expect(sessionName({ versions: [v(3, 'third'), v(1, 'first'), v(2, 'second')] })).toBe('third');
  });

  it('after a cut that removed the middle versions, the highest retained number still wins', () => {
    expect(sessionName({ versions: [v(1, 'first'), v(4, 'fourth')] })).toBe('fourth');
  });

  it('collapses runs of whitespace and trims', () => {
    const raw = '  red   mug \n on\ta   table  ';
    expect(sessionName({ versions: [v(1, raw)] })).toBe('red mug on a table');
  });

  it('is not cut to the alt-text length: a 250-character prompt is returned in full', () => {
    const long = `${'word '.repeat(50)}end`;
    expect(sessionName({ versions: [v(1, long)] })).toBe(long);
    expect(sessionName({ versions: [v(1, long)] }).length).toBeGreaterThan(100);
  });

  it('a session with no version has an empty name (the row then shows no name element)', () => {
    expect(sessionName({ versions: [] })).toBe('');
  });

});

describe('FR-2 / FR-12 (owner ruling OI-A, option a): sessionName for a blank or chip latest prompt (T40)', () => {
  it('an images-only latest send (blank prompt) gives an EMPTY name even though earlier versions had typed prompts', () => {
    expect(sessionName({ versions: [v(1, 'red mug'), v(2, '')] })).toBe('');
  });

  it('a whitespace-only latest prompt also gives an empty name', () => {
    expect(sessionName({ versions: [v(1, 'red mug'), v(2, '   \n ')] })).toBe('');
  });

  it('after a quick-edit chip send the name is the chip instruction text', () => {
    expect(sessionName({ versions: [v(1, 'red mug'), v(2, 'Make the shadow softer.')] })).toBe('Make the shadow softer.');
  });

  it('the latest version decides even when it is the only blank one in a longer session', () => {
    expect(sessionName({ versions: [v(1, 'a'), v(2, ''), v(3, 'c'), v(4, '')] })).toBe('');
    expect(sessionName({ versions: [v(1, ''), v(2, ''), v(3, 'typed')] })).toBe('typed');
  });
});
