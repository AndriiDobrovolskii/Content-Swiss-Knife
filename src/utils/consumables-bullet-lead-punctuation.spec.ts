/**
 * consumables-bullet-lead-punctuation.spec.ts
 *
 * Regression guard for the Consumables Doc pipeline exhausting its repair budget on bullet-lead
 * collisions (features/applications/storage) — see the module's own header comment for why this
 * fixer must run pre-parse, unlike its plain-pipeline sibling.
 *
 * RUN: npm run test
 */
import { describe, it, expect } from 'vitest';
import { normalizeConsumablesBulletLeadPunctuation } from './consumables-bullet-lead-punctuation';

function rawDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'C1',
    locale: 'uk-UA',
    localizedName: 'Test Filament',
    hook: 'A hook sentence.',
    features: { heading: 'Особливості', items: [] },
    applications: { heading: 'Застосування', items: [] },
    specGroups: [],
    storage: { heading: 'Зберігання', items: [] },
    cta: 'Closing sentence.',
    figures: [],
    ...overrides,
  };
}

describe('normalizeConsumablesBulletLeadPunctuation', () => {
  it('appends ": " to a colliding lead in features.items and the result no longer collides', () => {
    const doc = rawDoc({
      features: { heading: 'Особливості', items: [{ lead: 'Швидкість', text: 'до 500 мм/с.' }] },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(1);
    const items = (raw as { features: { items: { lead: string; text: string }[] } }).features.items;
    expect(items[0].lead).toBe('Швидкість: ');
  });

  it('fixes collisions across all three groups in one pass and counts them all', () => {
    const doc = rawDoc({
      features: { heading: 'Особливості', items: [{ lead: 'Перше', text: 'Друге.' }] },
      applications: { heading: 'Застосування', items: [{ lead: 'Маркування металу', text: 'Гравер працює.' }] },
      storage: { heading: 'Зберігання', items: [{ lead: 'Сушіння', text: 'при 50 °C.' }] },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(3);
    const d = raw as {
      features: { items: { lead: string }[] };
      applications: { items: { lead: string }[] };
      storage: { items: { lead: string }[] };
    };
    expect(d.features.items[0].lead).toBe('Перше: ');
    expect(d.applications.items[0].lead).toBe('Маркування металу: ');
    expect(d.storage.items[0].lead).toBe('Сушіння: ');
  });

  it('leaves a lead already ending in ": " or ". " untouched', () => {
    const doc = rawDoc({
      features: {
        heading: 'Особливості',
        items: [
          { lead: 'Матова текстура: ', text: 'розсіює світло.' },
          { lead: 'Точність діаметра. ', text: 'Стабільна екструзія.' },
        ],
      },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(0);
    expect(raw).toEqual(doc);
  });

  it('leaves a lead ending in punctuation other than a letter/digit untouched — never collided', () => {
    const doc = rawDoc({
      features: {
        heading: 'Особливості',
        items: [{ lead: 'Компактний, легкий,', text: 'зручний.' }],
      },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(0);
    expect(raw).toEqual(doc);
  });

  it('leaves a lead with a raw trailing space untouched — matches the schema refine, which does not trim', () => {
    const doc = rawDoc({
      features: { heading: 'Особливості', items: [{ lead: 'Швидкість ', text: 'до 500 мм/с.' }] },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(0);
    expect(raw).toEqual(doc);
  });

  it('passes when the text itself starts with a leading space, even with no trailing separator on lead', () => {
    const doc = rawDoc({
      features: { heading: 'Особливості', items: [{ lead: 'Швидкість', text: ' до 500 мм/с.' }] },
    });
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(0);
    expect(raw).toEqual(doc);
  });

  it('is a no-op on an empty document', () => {
    const doc = rawDoc();
    const { raw, fixed } = normalizeConsumablesBulletLeadPunctuation(doc);
    expect(fixed).toBe(0);
    expect(raw).toEqual(doc);
  });

  it('does not mutate the input', () => {
    const doc = rawDoc({
      features: { heading: 'Особливості', items: [{ lead: 'Швидкість', text: 'до 500 мм/с.' }] },
    });
    const before = structuredClone(doc);
    normalizeConsumablesBulletLeadPunctuation(doc);
    expect(doc).toEqual(before);
  });

  it('does not throw on malformed or missing groups', () => {
    expect(normalizeConsumablesBulletLeadPunctuation(null)).toEqual({ raw: null, fixed: 0 });
    expect(normalizeConsumablesBulletLeadPunctuation(undefined)).toEqual({ raw: undefined, fixed: 0 });
    expect(normalizeConsumablesBulletLeadPunctuation('not an object')).toEqual({ raw: 'not an object', fixed: 0 });
    expect(() => normalizeConsumablesBulletLeadPunctuation({ features: null })).not.toThrow();
    expect(() => normalizeConsumablesBulletLeadPunctuation({ features: { items: 'not an array' } })).not.toThrow();
    expect(() => normalizeConsumablesBulletLeadPunctuation({ features: { items: [null, 42, { lead: 1, text: 2 }] } }))
      .not.toThrow();
    expect(() => normalizeConsumablesBulletLeadPunctuation({})).not.toThrow();
  });
});
