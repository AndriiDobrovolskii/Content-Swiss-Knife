/**
 * history.service.operator-notes.spec.ts - US-9.1 T8 (FR-31 item 1, AC-9): operator notes are persisted in
 * the history record and survive the storage round trip; an entry without them is still valid.
 *
 * "A non-empty `operatorNotes` that was part of the `ProductInput` of a generation is stored in the history
 * record (`seo_gen_history`); the stored record round-trips the four values unchanged. (The history service
 * already stores the whole `ProductInput`; this requirement fixes it as intended behaviour and as a tested
 * one.)" No `history.service.ts` change is planned, so this spec is GREEN ON ARRIVAL by the breakdown's own
 * wording and is a guard that must survive the Story.
 *
 * HOW THE SERVICE IS DRIVEN. `HistoryService`'s constructor calls `effect()`, which needs Angular's
 * `ChangeDetectionScheduler` and `EffectScheduler` - a rendering machinery that `Injector.create` does not
 * provide and that a service spec must not pull in (no TestBed in a service spec). `add()` itself touches only
 * the `history` signal, so the instance is built without running the constructor and given exactly the two
 * fields `add()` reads. The persistence format is then observed the way the service's own effect and
 * constructor use it: `JSON.stringify(history())` out, `JSON.parse(...)` back.
 *
 * `ProductInput.operatorNotes` does not exist until T8, so the field is added through a cast.
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { HistoryService } from './history.service';
import type { GeneratedContent, HistoryItem, ProductInput } from '../app/types';

function newService(): HistoryService {
  const service = Object.create(HistoryService.prototype) as HistoryService;
  Object.assign(service as unknown as Record<string, unknown>, { history: signal<HistoryItem[]>([]), MAX_HISTORY_ITEMS: 20 });
  return service;
}

const OUTPUT: GeneratedContent = { mainHtmlUa: '<p>Опис</p>', translations: {}, seoData: null };
const baseInput = (over: Record<string, unknown> = {}): ProductInput => ({
  website: { name: 'EXPERT3D', group: 'ES', url: 'https://x.example' },
  name: 'Ortur H20',
  description: 'Laser engraver.',
  specs: '| Power | 20 W |',
  supplementalContent: 'Q: heated bed? A: yes.',
  ...over,
}) as unknown as ProductInput;

const NOTES = {
  usageScenarios: 'Prototyping brackets for a workshop,\nsecond line kept as typed',
  testResults: 'Printed 40 parts at 0.2 mm',
  previousGenerationComparison: 'Quieter than the previous model',
  limitations: 'Cable required for the laser mode',
};

/** What the browser storage holds after the service's effect ran, and what its constructor parses back. */
const throughStorage = (service: HistoryService): HistoryItem[] => JSON.parse(JSON.stringify(service.history()));

describe('FR-31 item 1: HistoryService persists and returns operatorNotes unchanged', () => {
  it('add() stores the whole input, so the four values read back identically', () => {
    const service = newService();
    service.add(baseInput({ operatorNotes: NOTES }), OUTPUT);
    expect((service.history()[0].input as unknown as Record<string, unknown>)['operatorNotes']).toEqual(NOTES);
  });

  it('the stored record round-trips the four values unchanged through the storage serialisation', () => {
    const service = newService();
    service.add(baseInput({ operatorNotes: NOTES }), OUTPUT);
    const stored = throughStorage(service);
    expect(stored).toHaveLength(1);
    expect((stored[0].input as unknown as Record<string, unknown>)['operatorNotes']).toEqual(NOTES);
  });

  it('keeps every other input field untouched next to the notes (notes are not merged into supplementalContent)', () => {
    const service = newService();
    service.add(baseInput({ operatorNotes: NOTES }), OUTPUT);
    const stored = throughStorage(service)[0].input;
    expect(stored.supplementalContent).toBe('Q: heated bed? A: yes.');
    expect(stored.specs).toBe('| Power | 20 W |');
    expect(stored.name).toBe('Ortur H20');
  });

  it('a partially filled operatorNotes round-trips with exactly its filled keys', () => {
    const service = newService();
    service.add(baseInput({ operatorNotes: { limitations: 'Cable required' } }), OUTPUT);
    expect((throughStorage(service)[0].input as unknown as Record<string, unknown>)['operatorNotes']).toEqual({ limitations: 'Cable required' });
  });

  it('an entry WITHOUT operatorNotes (every entry stored before this Story) is still a valid record and gains no key', () => {
    const service = newService();
    service.add(baseInput(), OUTPUT);
    const stored = throughStorage(service)[0];
    expect(stored.input.name).toBe('Ortur H20');
    expect(stored.output.mainHtmlUa).toBe('<p>Опис</p>');
    expect('operatorNotes' in stored.input).toBe(false);
  });

  it('entries with and without notes live side by side, newest first, each keeping its own notes', () => {
    const service = newService();
    service.add(baseInput({ name: 'Old product' }), OUTPUT);
    service.add(baseInput({ name: 'New product', operatorNotes: NOTES }), OUTPUT);
    const stored = throughStorage(service);
    expect(stored.map(h => h.input.name)).toEqual(['New product', 'Old product']);
    expect((stored[0].input as unknown as Record<string, unknown>)['operatorNotes']).toEqual(NOTES);
    expect('operatorNotes' in stored[1].input).toBe(false);
  });
});
