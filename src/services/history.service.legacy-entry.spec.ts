/**
 * history.service.legacy-entry.spec.ts - US-9.1 FR-44 item 3 (task breakdown P9a; stay green T46 to T49).
 *
 * The operator-notes feature is withdrawn (Story v5, 2026-10-19). A browser that ran it may hold, in `seo_gen_history`, an
 * entry whose stored `ProductInput` carries an `operatorNotes` property. NFR-13: no migration. FR-44 item 3 (a): such a
 * stored entry is restored by `HistoryService` WITHOUT error, and its other fields are intact.
 *
 * HOW THE SERVICE IS DRIVEN. The constructor of `HistoryService` is what restores history: it reads `seo_gen_history` from
 * `localStorage`, parses it and sets the `history` signal. It then registers a persistence `effect()`, which needs Angular's
 * rendering schedulers that a service spec must not pull in (no TestBed in a service spec, see
 * `content-orchestrator.ua-doc-pipeline.spec.ts`). So the REAL constructor runs against a stubbed `localStorage`, with only the
 * `effect` boundary replaced by a no-op (the persistence effect is not what this spec observes). The unit under test, the
 * restore code, is real.
 *
 * CAST CONSTRAINT (plan W8, F6): the stored entry with `operatorNotes` is built through `unknown` (a JSON text), never a typed
 * literal, so this file compiles BOTH while `ProductInput.operatorNotes` still exists AND after T49 removes it.
 *
 * GREEN ON ARRIVAL: `HistoryService` is not edited by the removal and ignores the property. This is a guard that must survive it.
 */
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@angular/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@angular/core')>()),
  effect: vi.fn(),
}));

import { HistoryService } from './history.service';

interface FakeStorage { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> }

function stubStorage(saved: string | null): FakeStorage {
  const storage: FakeStorage = {
    getItem: vi.fn((key: string) => (key === 'seo_gen_history' ? saved : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

/** A stored history entry as the withdrawn feature wrote it: the whole ProductInput, `operatorNotes` included. */
const storedEntry = (id: string, name: string, withNotes: boolean): Record<string, unknown> => ({
  id,
  timestamp: 1_760_000_000_000,
  input: {
    website: { name: 'EXPERT3D', group: 'ES', url: 'https://x.example' },
    name,
    description: 'Laser engraver.',
    specs: '| Power | 20 W |',
    supplementalContent: 'Q: heated bed? A: yes.',
    ...(withNotes ? { operatorNotes: { usageScenarios: 'Prototyping brackets', testResults: 'Printed 40 parts', limitations: 'Cable required' } } : {}),
  },
  output: { mainHtmlUa: '<p>Опис</p>', translations: {}, seoData: null },
});

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('FR-44 item 3 (a): HistoryService restores a stored entry that carries operatorNotes without error', () => {
  it('constructing the service over a stored entry with operatorNotes does not throw, logs nothing and does not discard the stored history', () => {
    const storage = stubStorage(JSON.stringify([storedEntry('a', 'Ortur H20', true)]));
    let service!: HistoryService;
    expect(() => { service = new HistoryService(); }).not.toThrow();
    expect(service.history()).toHaveLength(1);
    expect(errorSpy, 'the restore logged a load failure').not.toHaveBeenCalled();
    expect(storage.removeItem, 'the stored history was discarded').not.toHaveBeenCalled();
  });

  it('the restored entry keeps its other fields (name, specs, supplementalContent, output) intact', () => {
    stubStorage(JSON.stringify([storedEntry('a', 'Ortur H20', true)]));
    const item = new HistoryService().history()[0];
    expect(item.id).toBe('a');
    expect(item.input.name).toBe('Ortur H20');
    expect(item.input.specs).toBe('| Power | 20 W |');
    expect(item.input.supplementalContent).toBe('Q: heated bed? A: yes.');
    expect(item.output.mainHtmlUa).toBe('<p>Опис</p>');
  });

  it('entries with and without the stray property restore side by side, newest first, in stored order', () => {
    stubStorage(JSON.stringify([storedEntry('new', 'New product', true), storedEntry('old', 'Old product', false)]));
    const service = new HistoryService();
    expect(service.history().map(h => h.input.name)).toEqual(['New product', 'Old product']);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('a restored legacy entry can be deleted and a new entry added on top of it without error', () => {
    stubStorage(JSON.stringify([storedEntry('a', 'Ortur H20', true)]));
    const service = new HistoryService();
    const fresh = JSON.parse(JSON.stringify(storedEntry('b', 'Fresh', false))) as { input: never; output: never };
    expect(() => service.add(fresh.input, fresh.output)).not.toThrow();
    expect(service.history()).toHaveLength(2);
    service.delete('a');
    expect(service.history().map(h => h.input.name)).toEqual(['Fresh']);
  });
});
