import { describe, it, expect } from 'vitest';
import { resolveKillerSpecFromDoc } from './killer-spec-resolver';
import type { ProductDescriptionDoc } from '../domain/description-doc';

/** Minimal shape — only killerSpecs matters to this resolver. */
function docWith(killerSpecs: ProductDescriptionDoc['killerSpecs']): ProductDescriptionDoc {
  return { killerSpecs } as ProductDescriptionDoc;
}

describe('resolveKillerSpecFromDoc', () => {
  it('picks killerSpecs[0], regardless of how many other entries also look eligible', () => {
    const doc = docWith([
      { key: 'power', label: 'Потужність', value: '20 Вт', why: 'w' },
      { key: 'working-area', label: 'Робоча зона', value: '420 × 300 мм', why: 'w' },
      { key: 'speed', label: 'Швидкість', value: '20000 мм/хв', why: 'w' },
    ]);
    expect(resolveKillerSpecFromDoc(doc)).toEqual({ key: 'power', value: '20 Вт' });
  });

  it('picks whichever entry is first, even one no registry will recognize', () => {
    const doc = docWith([
      { key: 'smart-camera', label: 'Смарт-камера', value: '200000 пікселів', why: 'w' },
      { key: 'power', label: 'Потужність', value: '20 Вт', why: 'w' },
    ]);
    expect(resolveKillerSpecFromDoc(doc)).toEqual({ key: 'smart-camera', value: '200000 пікселів' });
  });

  it('returns null for an undefined doc', () => {
    expect(resolveKillerSpecFromDoc(undefined)).toBeNull();
  });

  it('returns null when killerSpecs is empty', () => {
    expect(resolveKillerSpecFromDoc(docWith([]))).toBeNull();
  });

  it('trims the value', () => {
    const doc = docWith([{ key: 'power', label: 'Потужність', value: '  20 Вт  ', why: 'w' }]);
    expect(resolveKillerSpecFromDoc(doc)).toEqual({ key: 'power', value: '20 Вт' });
  });
});
