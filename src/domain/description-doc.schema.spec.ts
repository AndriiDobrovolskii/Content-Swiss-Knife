/**
 * description-doc.schema.spec.ts
 *
 * WHY THIS EXISTS. The first real 3DDevice Doc generation (2026-08-02) shipped two visible defects
 * that the schema let through, both in the SAME construct — a bullet item:
 *
 *     <li><b>&lt;b&gt;Транспортування:&lt;/b&gt;</b>рюкзак…</li>
 *     <li><b>Топографічне знімання</b>Дальність лідара 300 м…</li>
 *
 * The first is HTML the model wrote into `lead`; the renderer wraps that field in `<b>` itself, so
 * it must `esc()` rather than `prose()`, and the escaped tags rendered as literal text. The second
 * is a label and sentence with no separator on either side.
 *
 * THE CAUSE WAS AN ASYMMETRY, not a renderer bug. `text` was `Prose` — guarded by PROSE_FORBIDDEN,
 * so HTML there is a schema error the repair gate fixes automatically. `lead` beside it was bare
 * `z.string().min(1)`. Identical model behaviour was caught in one field and shipped from the next.
 *
 * Guarding it here rather than in the prompt is what makes it enforceable: a violation becomes a
 * `doc-schema` issue, appendRepairFeedback names the offending field, and the model corrects it —
 * the recovery path already proven live. The prompt rule is the soft half; this is the half that
 * cannot be ignored.
 */
import { describe, it, expect } from 'vitest';

import { ProductDescriptionDocSchema } from './description-doc.schema';
import type { ProductDescriptionDoc } from './description-doc';

/** A minimal valid document; each test mutates one field and re-validates. */
function validDoc(): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'XGRIDS L2 Pro',
    hook: 'hook',
    killerSpecs: [
      { label: 'Точність', value: '3 см', why: 'why-1' },
      { label: 'Дальність', value: '300 м', why: 'why-2' },
      { label: 'Вага', value: '1,7 кг', why: 'why-3' },
    ],
    keyBenefits: [
      {
        kind: 'bullets',
        items: [
          { lead: 'Швидкий результат:', text: ' вбудований алгоритм.' },
          { lead: 'Надійність. ', text: 'Алгоритм Multi-SLAM.' },
          { lead: 'Точність:', text: ' 3 см на об’єкті.' },
        ],
      },
    ],
    functionality: [{ heading: 'Технологія', blocks: [{ kind: 'paragraph', text: 'fn-para' }] }],
    applications: {
      heading: 'Сфери застосування',
      blocks: [{ kind: 'paragraph', text: 'app-para' }],
      items: [
        { scenario: 'Топографія', text: ' — дальність 300 м.' },
        { scenario: 'Інженерія', text: ' — точність 2 см.' },
        { scenario: 'Інспекція', text: ' — щільність сканування.' },
        { scenario: 'Будівництво', text: ' — перевірка на майданчику.' },
      ],
    },
    specs: {
      heading: 'Технічні характеристики',
      categories: [
        {
          title: 'Параметри системи',
          rows: [
            { label: 'Вага', value: '1,7 кг' },
            // The real artifact carries this. A tag guard that rejects it is too broad.
            { label: 'Енергоспоживання', value: '<30 Вт' },
          ],
        },
      ],
    },
    cta: { heading: 'Чому варто купити', text: 'cta-text' },
    figures: [],
    videos: [],
  };
}

/** Replaces the first bullet item, which is where both production defects appeared. */
function docWithBullet(lead: string, text: string): ProductDescriptionDoc {
  const doc = validDoc();
  (doc.keyBenefits[0] as { items: Array<{ lead: string; text: string }> }).items[0] = { lead, text };
  return doc;
}

const errorsFor = (doc: ProductDescriptionDoc) => {
  const r = ProductDescriptionDocSchema.safeParse(doc);
  return r.success ? [] : r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
};

describe('the fixture itself is valid', () => {
  it('parses clean, so every failure below is caused by the mutation', () => {
    expect(errorsFor(validDoc())).toEqual([]);
  });
});

describe('plain-text fields reject HTML', () => {
  /** THE PRODUCTION DEFECT, verbatim. */
  it('rejects the <b> the model wrote into a bullet lead', () => {
    const issues = errorsFor(docWithBullet('<b>Транспортування:</b>', ' рюкзак зі стабілізацією.'));
    expect(issues.join('\n')).toMatch(/lead/);
  });

  /**
   * Stricter than Prose on purpose. `<b>` is legal in `text` because the renderer emits it through
   * prose(); in `lead` the renderer supplies the `<b>` wrapper itself, so a second one would nest.
   */
  it('rejects <b> in a lead even though Prose allows it in the text beside it', () => {
    expect(errorsFor(docWithBullet('<b>Лід</b>', ' текст.'))).not.toEqual([]);
    expect(errorsFor(docWithBullet('Лід:', ' <b>текст</b>.'))).toEqual([]);
  });

  it('rejects HTML in headings, labels and values', () => {
    const h = validDoc(); h.functionality[0].heading = '<h2>Технологія</h2>';
    expect(errorsFor(h)).not.toEqual([]);

    const k = validDoc(); k.killerSpecs[0].label = '<b>Точність</b>';
    expect(errorsFor(k)).not.toEqual([]);

    const s = validDoc(); s.specs.categories[0].rows[0].label = '<i>Вага</i>';
    expect(errorsFor(s)).not.toEqual([]);
  });

  /**
   * THE OVER-BROAD GUARD THIS FORBIDS. `<30 Вт` is a real spec value from the 3DDevice artifact —
   * a less-than sign, not a tag. A guard keying on a bare `<` would reject a correct document.
   */
  it('accepts a spec value that merely starts with "<"', () => {
    const doc = validDoc();
    doc.specs.categories[0].rows[0].value = '<30 Вт';
    expect(errorsFor(doc)).toEqual([]);

    doc.specs.categories[0].rows[0].value = '≤ 0,5 см, 1/2" матриця, 190° × 190°';
    expect(errorsFor(doc)).toEqual([]);
  });
});

describe('a bullet lead and its text need a separator', () => {
  /** THE PRODUCTION DEFECT, verbatim: rendered as `<b>знімання</b>Дальність…`. */
  it('rejects a lead and text that run together', () => {
    const issues = errorsFor(docWithBullet('Топографічне знімання', 'Дальність лідара 300 м.'));
    expect(issues.join('\n')).toMatch(/separator|space|run together/i);
  });

  /**
   * 🔴 THE ASCII TRAP. JavaScript's `\w` is [A-Za-z0-9_]. Every store's master is Cyrillic
   * (masterScriptFor returns 'Cyrillic' for all seven), so a `\w`-based rule would match NONE of
   * the real cases — the defect above included. Polish and German diacritics fail the same way,
   * which is Drukarka 3D and Center 3D Print. The rule must use \p{L}\p{N} with the /u flag.
   */
  it.each([
    ['Cyrillic', 'Топографічне знімання', 'Дальність лідара 300 м.'],
    ['Polish', 'Wskazówki eksploatacyjne', 'Żywica wymaga wentylacji.'],
    ['German', 'Betriebshinweise für Öfen', 'Über die Lüftung nachdenken.'],
  ])('catches glued text in %s, which an ASCII-only \\w would miss', (_lang, lead, text) => {
    expect(errorsFor(docWithBullet(lead, text))).not.toEqual([]);
  });

  /**
   * Both corpus conventions must survive untouched — render-description.ts:174-183 documents why
   * the renderer injects nothing: Center 3D Print puts the space INSIDE the bold, EXPERT3D puts it
   * outside. A rule that rejects either would break reconciliation.
   */
  it.each([
    ['space inside the bold (C3D)', 'Складається за лічені хвилини. ', 'Тришарова конструкція.'],
    ['space outside the bold (EXPERT3D)', 'Гравіювання деревини:', ' гравер працює.'],
    ['lead ends in a colon', 'Точність:', ' 3 см.'],
    ['lead ends in a dash', 'Точність —', ' 3 см.'],
  ])('accepts %s', (_case, lead, text) => {
    expect(errorsFor(docWithBullet(lead, text))).toEqual([]);
  });
});

/**
 * §5 compatibility's bullets floor is relaxed to 2, unlike every other bullets-bearing field. A
 * datasheet may confirm only 2 physical accessories; §5's prompt instruction (master-system-prompt.ts)
 * now routes a 1-item case to prose instead, so the schema only needs to accept the 2-item edge case
 * the prompt cannot avoid without fabricating a 3rd source-confirmed item.
 */
describe('relaxed bullets floor (min 2, not min 3) — §5 compatibility and keyBenefits', () => {
  const bulletsBlock = (n: number) => ({
    kind: 'bullets' as const,
    items: Array.from({ length: n }, (_, i) => ({ lead: `Пункт ${i + 1}:`, text: ` опис ${i + 1}.` })),
  });

  it('accepts a compatibility bullets block with only 2 items', () => {
    const doc = validDoc();
    doc.compatibility = { heading: 'Сумісність', blocks: [bulletsBlock(2)] };
    expect(errorsFor(doc)).toEqual([]);
  });

  it('still rejects a compatibility bullets block with only 1 item', () => {
    const doc = validDoc();
    doc.compatibility = { heading: 'Сумісність', blocks: [bulletsBlock(1)] };
    const issues = errorsFor(doc);
    expect(issues.join('\n')).toMatch(/at least 2 element/i);
  });

  it('does NOT relax the floor for functionality — a 2-item bullets block there still fails', () => {
    const doc = validDoc();
    doc.functionality = [{ heading: 'Технологія', blocks: [bulletsBlock(2)] }];
    const issues = errorsFor(doc);
    expect(issues.join('\n')).toMatch(/at least 3 element/i);
  });

  /**
   * Flipped 2026-08-17: keyBenefits now shares the relaxed floor with §5 compatibility — see the
   * comment on RelaxedBlockSchema in description-doc.schema.ts. A live run shipped a keyBenefits
   * bullets Block with only 2 items and the repair budget exhausted before the model produced a
   * valid Doc (there is no cheaper repair instrument than full regeneration for this failure
   * today — see doc-schema-issues.ts). functionality (above) deliberately still rejects at 2,
   * pending its own evidence of the same failure.
   */
  it('accepts a keyBenefits bullets block with only 2 items', () => {
    const doc = validDoc();
    doc.keyBenefits = [bulletsBlock(2)];
    expect(errorsFor(doc)).toEqual([]);
  });

  it('still rejects a keyBenefits bullets block with only 1 item', () => {
    const doc = validDoc();
    doc.keyBenefits = [bulletsBlock(1)];
    const issues = errorsFor(doc);
    expect(issues.join('\n')).toMatch(/at least 2 element/i);
  });
});

/**
 * Most products have no video, and buildVideoBlock (task-a.ts) then omits the [VIDEO MANIFEST]
 * section entirely — leaving the model with no positive instruction to emit "videos": [] rather
 * than dropping the key or writing null. See the comment on `videos` in description-doc.schema.ts.
 */
describe('videos tolerates a missing or null manifest', () => {
  it('defaults an omitted "videos" key to an empty array', () => {
    const doc = validDoc();
    delete (doc as { videos?: unknown }).videos;
    expect(errorsFor(doc)).toEqual([]);
    expect(ProductDescriptionDocSchema.parse(doc).videos).toEqual([]);
  });

  it('defaults a null "videos" to an empty array', () => {
    const doc = { ...validDoc(), videos: null } as unknown as ProductDescriptionDoc;
    expect(errorsFor(doc)).toEqual([]);
    expect(ProductDescriptionDocSchema.parse(doc).videos).toEqual([]);
  });
});
