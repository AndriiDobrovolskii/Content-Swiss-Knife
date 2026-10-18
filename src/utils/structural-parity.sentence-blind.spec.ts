/**
 * structural-parity.sentence-blind.spec.ts - US-9.1 D13 category 18 / Q-TRANS option (3) (owner decision of
 * 2026-10-18): an unconditional CHARACTERIZATION pin, documentation only, NOT an endorsement.
 *
 * `validateStructuralParity` (`structural-parity.ts`) counts tags only (`<section>`, `<h2>`, `<h3>`, `<hr>`,
 * `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`, `<li>`) at `severity: 'error'`. It is therefore blind
 * to a sentence that is added to, split in, merged into or removed from a `<p>` while the counted tags stay
 * equal. That is the residual risk R1a / R1d of the Story: the master (now carrying the liveliness rules and
 * their self-scoping sentence, FR-20) is `systemBlocks[0]` of the Task C description-translation prompts, and
 * no automated check in the gate can detect a translator that obeys SCENE / RHYTHM / HOOK and rewrites
 * sentences. The owner accepted the risk as declared (Specification note G) and chose not to add a
 * sentence-level check (option (4)) or a scope sentence beside the FR-5 literals (option (2)).
 *
 * GREEN ON ARRIVAL, by design; it has no owner task and is re-run in the T33 checkpoint. If a sentence-level
 * check is ever added to `validateStructuralParity`, this pin is updated DELIBERATELY, in the same change,
 * with a recorded reason - it is never deleted or skipped to make a run go green (AGENTS.md section 7.7).
 */
import { describe, it, expect } from 'vitest';
import { validateStructuralParity } from './structural-parity';

const MASTER =
  '<section><h2>Принцип роботи</h2><p>Сканер їде до об\'єкта. Він знімає модель за дві хвилини. Результат зберігається у файлі.</p>'
  + '<figure><img src="a.jpg" alt="A"><figcaption>Підпис A</figcaption></figure>'
  + '<hr></section>';

const errorsOf = (translated: string) =>
  validateStructuralParity(MASTER, translated, 'HTML (PL)').filter(i => i.severity === 'error');

describe('validateStructuralParity is blind to sentence changes inside a <p> (Q-TRANS option 3, characterization)', () => {
  it('control: the identical document reports nothing, and a dropped counted tag IS an error', () => {
    expect(validateStructuralParity(MASTER, MASTER, 'HTML (PL)')).toEqual([]);
    const droppedHr = MASTER.replace('<hr>', '');
    expect(errorsOf(droppedHr).some(i => i.rule === 'structural-parity-count' && i.detail.includes('<hr>'))).toBe(true);
  });

  it('reports no error when a sentence is ADDED to a <p> and the counted tags stay equal', () => {
    const added = MASTER.replace('Результат зберігається у файлі.', 'Результат зберігається у файлі. Це економить час на кожному об\'єкті.');
    expect(errorsOf(added)).toEqual([]);
  });

  it('reports no error when a sentence is SPLIT in two inside a <p>', () => {
    const split = MASTER.replace('Він знімає модель за дві хвилини.', 'Він знімає модель. Це займає дві хвилини.');
    expect(errorsOf(split)).toEqual([]);
  });

  it('reports no error when two sentences are MERGED inside a <p>', () => {
    const merged = MASTER.replace('Сканер їде до об\'єкта. Він знімає', 'Сканер їде до об\'єкта й знімає');
    expect(errorsOf(merged)).toEqual([]);
  });

  it('reports no error when a sentence is REMOVED from a <p> (for example a pointer sentence deleted in translation)', () => {
    const removed = MASTER.replace(' Результат зберігається у файлі.', '');
    expect(errorsOf(removed)).toEqual([]);
  });
});
