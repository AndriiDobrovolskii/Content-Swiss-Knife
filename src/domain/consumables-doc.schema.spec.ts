import { describe, it, expect } from 'vitest';

import { ConsumablesDescriptionDocSchema } from './consumables-doc.schema';
import type { ConsumablesDescriptionDoc } from './consumables-doc';

/** A minimal valid document sitting exactly at each field's lower bound. */
function validDoc(): ConsumablesDescriptionDoc {
  return {
    schemaVersion: 'C1',
    locale: 'uk-UA',
    localizedName: 'Filament PLA',
    hook: 'hook',
    features: {
      heading: 'Особливості',
      items: [
        { lead: 'A.', text: ' a' },
        { lead: 'B.', text: ' b' },
        { lead: 'C.', text: ' c' },
        { lead: 'D.', text: ' d' },
      ],
    },
    applications: {
      heading: 'Застосування',
      items: [
        { lead: 'A:', text: ' a' },
        { lead: 'B:', text: ' b' },
        { lead: 'C:', text: ' c' },
      ],
    },
    specGroups: [
      { heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] },
    ],
    storage: {
      heading: 'Зберігання',
      items: [
        { lead: 'A:', text: ' a' },
        { lead: 'B:', text: ' b' },
      ],
    },
    cta: 'cta text',
  };
}

const errorsFor = (doc: ConsumablesDescriptionDoc) => {
  const r = ConsumablesDescriptionDocSchema.safeParse(doc);
  return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
};

describe('ConsumablesDescriptionDocSchema — valid document', () => {
  it('accepts a minimal valid document', () => {
    expect(errorsFor(validDoc())).toEqual([]);
  });

  it('accepts an empty specGroups array — §C4 is conditional', () => {
    const doc = validDoc();
    doc.specGroups = [];
    expect(errorsFor(doc)).toEqual([]);
  });

  it('accepts three specGroups — the schema upper bound', () => {
    const doc = validDoc();
    doc.specGroups = [
      { heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] },
      { heading: 'Mechanical Properties', rows: [{ label: 'Tensile strength', value: '50 MPa' }] },
      { heading: 'Physical Properties', rows: [{ label: 'Density', value: '1.24 g/cm³' }] },
    ];
    expect(errorsFor(doc)).toEqual([]);
  });
});

describe('ConsumablesDescriptionDocSchema — count bounds', () => {
  it('rejects fewer than 4 features items', () => {
    const doc = validDoc();
    doc.features.items = doc.features.items.slice(0, 3);
    expect(errorsFor(doc).some(e => e.startsWith('features.items'))).toBe(true);
  });

  it('rejects more than 6 features items', () => {
    const doc = validDoc();
    doc.features.items = Array.from({ length: 7 }, (_, i) => ({ lead: `L${i}.`, text: ` t${i}` }));
    expect(errorsFor(doc).some(e => e.startsWith('features.items'))).toBe(true);
  });

  it('rejects fewer than 3 applications items', () => {
    const doc = validDoc();
    doc.applications.items = doc.applications.items.slice(0, 2);
    expect(errorsFor(doc).some(e => e.startsWith('applications.items'))).toBe(true);
  });

  it('rejects more than 4 applications items', () => {
    const doc = validDoc();
    doc.applications.items = Array.from({ length: 5 }, (_, i) => ({ lead: `L${i}:`, text: ` t${i}` }));
    expect(errorsFor(doc).some(e => e.startsWith('applications.items'))).toBe(true);
  });

  it('rejects more than 3 specGroups', () => {
    const doc = validDoc();
    doc.specGroups = Array.from({ length: 4 }, (_, i) => ({
      heading: `Group ${i}`,
      rows: [{ label: 'L', value: 'V' }],
    }));
    expect(errorsFor(doc).some(e => e.startsWith('specGroups'))).toBe(true);
  });

  it('rejects a specGroup with zero rows', () => {
    const doc = validDoc();
    doc.specGroups = [{ heading: 'Print Settings', rows: [] }];
    expect(errorsFor(doc).length).toBeGreaterThan(0);
  });

  it('rejects fewer than 2 storage items', () => {
    const doc = validDoc();
    doc.storage.items = doc.storage.items.slice(0, 1);
    expect(errorsFor(doc).some(e => e.startsWith('storage.items'))).toBe(true);
  });

  it('rejects more than 3 storage items', () => {
    const doc = validDoc();
    doc.storage.items = Array.from({ length: 4 }, (_, i) => ({ lead: `L${i}:`, text: ` t${i}` }));
    expect(errorsFor(doc).some(e => e.startsWith('storage.items'))).toBe(true);
  });
});

describe('ConsumablesDescriptionDocSchema — bullet lead/text collision', () => {
  it('rejects a lead ending in a letter with text starting in a letter', () => {
    const doc = validDoc();
    doc.features.items[0] = { lead: 'Топографічне знімання', text: 'Дальність лідара 300 м' };
    expect(errorsFor(doc).some(e => e.includes('run together'))).toBe(true);
  });

  it('accepts a lead ending in punctuation regardless of text', () => {
    const doc = validDoc();
    doc.features.items[0] = { lead: 'Топографічне знімання:', text: 'Дальність лідара 300 м' };
    expect(errorsFor(doc)).toEqual([]);
  });

  it('accepts a lead ending in a letter when text starts with a space', () => {
    const doc = validDoc();
    doc.features.items[0] = { lead: 'Топографічне знімання', text: ' Дальність лідара 300 м' };
    expect(errorsFor(doc)).toEqual([]);
  });
});

describe('ConsumablesDescriptionDocSchema — prose vs. plain-text fields', () => {
  it('rejects <em> in a Prose field (hook)', () => {
    const doc = validDoc();
    doc.hook = 'text with <em>emphasis</em>';
    expect(errorsFor(doc).some(e => e.startsWith('hook'))).toBe(true);
  });

  it('allows <b> and <strong> in a Prose field (cta)', () => {
    const doc = validDoc();
    doc.cta = 'Buy <b>now</b> from <strong>Store</strong>.';
    expect(errorsFor(doc)).toEqual([]);
  });

  it('rejects <b> in a plain-text field (lead) — the renderer supplies the wrapper itself', () => {
    const doc = validDoc();
    doc.features.items[0] = { lead: '<b>Транспортування:</b>', text: ' рюкзак' };
    expect(errorsFor(doc).some(e => e.startsWith('features.items'))).toBe(true);
  });

  it('rejects any tag in a heading', () => {
    const doc = validDoc();
    doc.features.heading = '<b>Features</b>';
    expect(errorsFor(doc).some(e => e.startsWith('features.heading'))).toBe(true);
  });
});

describe('ConsumablesDescriptionDocSchema — strict shape', () => {
  it('rejects a stray "figures" key — proves figures are not silently accepted', () => {
    const doc = { ...validDoc(), figures: [] } as ConsumablesDescriptionDoc & { figures: unknown[] };
    expect(errorsFor(doc).length).toBeGreaterThan(0);
  });

  it('rejects a stray key on a nested spec group', () => {
    const doc = validDoc();
    (doc.specGroups[0] as unknown as { extra: string }).extra = 'nope';
    expect(errorsFor(doc).length).toBeGreaterThan(0);
  });

  it('rejects the wrong schemaVersion literal', () => {
    const doc = { ...validDoc(), schemaVersion: '3.0' } as unknown as ConsumablesDescriptionDoc;
    expect(errorsFor(doc).some(e => e.startsWith('schemaVersion'))).toBe(true);
  });
});
