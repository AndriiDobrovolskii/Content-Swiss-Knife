/**
 * heading-style.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateHeadingStyle, validateHeadingStyleDoc } from './heading-style';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const C3D = 'Center 3D Print';
const h2 = (t: string) => `<h2>${t}</h2>`;
const rules = (html: string, locale = 'uk-UA', store = C3D) => validateHeadingStyle(html, locale, store);
const headings = (html: string) => rules(html).map(i => i.detail);

describe('validateHeadingStyle', () => {
  /** The four headings observed in the regressed artifact. */
  it('flags bare nominal topics', () => {
    const observed = [
      'Лазерний модуль 20 Вт для гравіювання та різання',
      'ПЗ та автоматизація',
      'Безпека під час роботи',
      'Електронне керування та аварійні системи',
    ];
    for (const heading of observed) {
      const issues = rules(h2(heading));
      expect(issues, heading).toHaveLength(1);
      expect(issues[0].rule).toBe('h2-nominal-heading');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].detail).toContain(heading);
    }
  });

  it('passes headings that open with a functional/question word', () => {
    const good = [
      'Як працює Ortur H20',
      'Як платформа підйому та камера підвищують точність',
      'Яке ПЗ підтримує Ortur H20',
      'Які механізми безпеки застосовує Ortur H20',
      'Яким стандартам відповідає Ortur H20',
      'Де застосовують Ortur H20',
    ];
    for (const heading of good) {
      expect(rules(h2(heading)), heading).toEqual([]);
    }
  });

  it('passes a heading whose verb is not the first word', () => {
    expect(rules(h2('Корпус захищає від диму та пилу'))).toEqual([]);
    expect(rules(h2('Камера визначає краї заготовки'))).toEqual([]);
  });

  /**
   * Regression: bare "-ти" was in the infinitive branch and matched «роботи» (genitive of
   * робота), silently passing a real observed regression. That ending collides with the whole
   * -та noun class, and Style B headings use the 3rd-person present, not infinitives.
   */
  it('does not treat a genitive -ти noun as a verb', () => {
    for (const heading of ['Безпека під час роботи', 'Розмір робочої плати', 'Параметри кімнати']) {
      expect(rules(h2(heading)), heading).toHaveLength(1);
    }
  });

  describe('allow-list routes', () => {
    it('§7: any <h2> inside section.specs', () => {
      const html = `<section class="specs">${h2('Технічні характеристики Ortur H20')}</section>`;
      expect(rules(html)).toEqual([]);
    });

    it('§7 header outside the wrapper still passes via MANDATED_NOMINAL_H2', () => {
      expect(rules(h2('Технічні характеристики Ortur H20'))).toEqual([]);
      expect(rules(h2('Матеріали та сумісне обладнання'))).toEqual([]);
    });

    it('§9: the closing question', () => {
      expect(rules(h2('Чому варто купити Ortur H20 у Center 3D Print?'))).toEqual([]);
    });

    /**
     * Deliberately NOT exempt. Exempting any heading containing the product name would also
     * exempt most of the nominal headings this linter exists to catch. Warning-tier, so the
     * cost is one glance; promoting it is a one-line addition to MANDATED_NOMINAL_H2.
     */
    it('an umbrella heading carrying the product name is NOT exempt', () => {
      expect(rules(h2('Безпечна експлуатація Ortur H20'))).toHaveLength(1);
    });
  });

  /**
   * THE ANTI-REGRESSION TEST. An earlier unscoped heading ban made the model generalize from
   * <h2> to every level and stop emitting nominal <h3> spec categories, collapsing 15 rows into
   * one. This linter must never push in that direction.
   */
  it('never flags an <h3>, however nominal', () => {
    const html =
      `<section class="specs"><h2>Технічні характеристики</h2>` +
      ['Лазерний модуль', 'Безпека', 'Електроніка та підключення', 'Механіка', 'Живлення']
        .map(t => `<h3>${t}</h3>`).join('') +
      `</section>`;
    expect(rules(html)).toEqual([]);
  });

  it('restates the <h3> carve-out in the detail, since repair feedback echoes it', () => {
    expect(headings(h2('ПЗ та автоматизація'))[0]).toContain('<h2> ONLY');
    expect(headings(h2('ПЗ та автоматизація'))[0]).toContain('stay concise nominal labels');
  });

  it('reports each offending heading separately in a full document', () => {
    const html = [
      '<p>Вступ.</p>',
      h2('Як працює Ortur H20'),
      h2('ПЗ та автоматизація'),
      h2('Безпека під час роботи'),
      h2('Чому варто купити Ortur H20 у Center 3D Print?'),
    ].join('');
    expect(rules(html)).toHaveLength(2);
  });

  describe('scoping', () => {
    it('is inert for every store except Center 3D Print', () => {
      for (const store of ['Drukarka 3D', 'EXPERT3D', '3DDevice', '']) {
        expect(rules(h2('ПЗ та автоматизація'), 'uk-UA', store), store).toEqual([]);
      }
    });

    it('is inert for locales with no heading lexicon', () => {
      for (const locale of ['pl-PL', 'de-DE', 'en-GB']) {
        expect(rules(h2('Oprogramowanie i automatyzacja'), locale), locale).toEqual([]);
      }
    });

    it('works for ru-UA', () => {
      expect(rules(h2('Как работает Ortur H20'), 'ru-UA')).toEqual([]);
      expect(rules(h2('ПО и автоматизация'), 'ru-UA')).toHaveLength(1);
    });

    it('returns nothing for empty html or a document with no headings', () => {
      expect(rules('')).toEqual([]);
      expect(rules('<p>Опис без заголовків.</p>')).toEqual([]);
    });
  });
});

/**
 * heading-product-name-stuffing — the global rule, deliberately NOT gated on store or locale.
 *
 * Every case below is drawn from the real regressed export (XGRIDS L2 Pro 32/300 Standard
 * Package, Center 3D Print, 2026-08-03), where the full name appeared in ~every <h2> of all
 * five locales.
 */
describe('validateHeadingStyle — product-name stuffing', () => {
  const NAME = 'XGRIDS L2 Pro 32/300 Standard Package';
  const stuffing = (html: string, locale = 'uk-UA', store = C3D) =>
    validateHeadingStyle(html, locale, store, NAME).filter(i => i.rule === 'heading-product-name-stuffing');

  it('flags the full product name in an <h2>', () => {
    const issues = stuffing(h2('Технічні характеристики 3D-сканера XGRIDS L2 Pro 32/300 Standard Package'));
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('FULL product name');
    expect(issues[0].detail).toContain('XGRIDS L2 Pro');
  });

  it('accepts the short form in the first §3 heading and the §9 closing — two is the budget', () => {
    const html =
      h2('Як працює 3D-сканер XGRIDS L2 Pro') +
      h2('Механізми безпеки та захисту') +
      h2('Технічні характеристики') +
      h2('Чому варто купити сканер XGRIDS L2 Pro у Center 3D Print?');
    expect(stuffing(html)).toEqual([]);
  });

  it('flags the <h2>s that name the product outside the two reserved slots', () => {
    const html =
      h2('Як працює 3D-сканер XGRIDS L2 Pro') +
      h2('Яке ПЗ підтримує XGRIDS L2 Pro') +
      h2('Сфери застосування XGRIDS L2 Pro') +
      h2('Чому варто купити XGRIDS L2 Pro у Center 3D Print?');
    const issues = stuffing(html);
    // The two middle headings — the first §3 heading and the §9 closing keep their slots. Under the
    // old positional budget the count was the same but the SET differed: the CTA was flagged and
    // «Яке ПЗ підтримує» passed.
    expect(issues).toHaveLength(2);
    expect(issues.map(i => i.detail).join(' ')).toContain('Яке ПЗ підтримує XGRIDS L2 Pro');
    expect(issues.map(i => i.detail).join(' ')).toContain('Сфери застосування XGRIDS L2 Pro');
    expect(issues[0].detail).toContain('neither the first §3 heading nor the §9 closing');
  });

  /**
   * The budget's two slots are the first §3 heading and the §9 closing SPECIFICALLY — not
   * "whichever two come first". The §9 closing sorts last, so the old positional `named.slice(2)`
   * blessed the first two and flagged the CTA whenever a stray §4–§7 heading also named the
   * product: the one heading the rule explicitly permits was reported, and the actual offender
   * passed. Latent while the finding was unrepairable; live once repair-strategy.ts could address
   * it, because the ladder would then rewrite a correct CTA and leave the real one in place.
   */
  it('blames the stray §7 heading, NOT the §9 closing, when a third <h2> names the product', () => {
    const html =
      h2('Як працює 3D-сканер XGRIDS L2 Pro') +
      h2('Механізми безпеки та захисту') +
      h2('Технічні характеристики XGRIDS L2 Pro') +
      h2('Чому варто купити XGRIDS L2 Pro у Center 3D Print?');
    const issues = stuffing(html);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('Технічні характеристики XGRIDS L2 Pro');
    expect(issues[0].detail).not.toContain('Чому варто купити');
    // `detail` is spliced verbatim into the field-scoped repair prompt, so it has to be coherent
    // as an instruction. The old positional wording ("is the Nth <h2>; at most TWO may") held only
    // while slice(2) guaranteed N >= 3 — here the flagged heading is the 2nd, and telling the model
    // "you are the 2nd of at most 2" gives it no reason to rewrite anything.
    expect(issues[0].detail).not.toMatch(/\bis the \d+th\b/);
    expect(issues[0].detail).toContain('neither the first §3 heading nor the §9 closing');
  });

  /**
   * "Last <h2>" alone would be unsafe: with no §9 emitted, the last <h2> is «Технічні
   * характеристики» (§7), and blessing it would license the product name in exactly the heading
   * the XGRIDS regression was about. The closing must be question-shaped as well as last.
   */
  it('does not bless a trailing §7 heading just for being last when there is no §9', () => {
    // Three named headings so the budget actually engages. With no §9 emitted, the last <h2> is
    // «Технічні характеристики …» — last, but not question-shaped, so it gets no reserved slot and
    // is flagged alongside the other extra. Blessing on position alone would have licensed the
    // product name in exactly the heading the XGRIDS regression was about.
    const html =
      h2('Як працює 3D-сканер XGRIDS L2 Pro') +
      h2('Яке ПЗ підтримує XGRIDS L2 Pro') +
      h2('Технічні характеристики XGRIDS L2 Pro');
    const issues = stuffing(html);
    expect(issues).toHaveLength(2);
    const flagged = issues.map(i => i.detail).join(' ');
    expect(flagged).toContain('Технічні характеристики XGRIDS L2 Pro');
    expect(flagged).toContain('Яке ПЗ підтримує XGRIDS L2 Pro');
  });

  it('stays silent at two product-named <h2>s even when neither is the §9 closing', () => {
    // The budget is TWO, not two assigned seats. Identity decides who is at fault only once a third
    // heading appears — flagging while still within budget would rewrite headings that always
    // passed, and now costs a repair call because these paths became addressable.
    const html =
      h2('Як працює 3D-сканер XGRIDS L2 Pro') +
      h2('Технічні характеристики XGRIDS L2 Pro');
    expect(stuffing(html)).toEqual([]);
  });

  it('gives <h3> a budget of zero — pushing the keyword down a level is still stuffing', () => {
    const issues = stuffing('<h3>Лідар XGRIDS L2 Pro</h3>');
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('never carry the product name');
  });

  it('leaves an ordinary nominal <h3> alone', () => {
    expect(stuffing('<h3>Лазерний модуль</h3><h3>Безпека</h3>')).toEqual([]);
  });

  it('fires for every store and every locale, unlike the Style B rule', () => {
    const stuffed = h2('Technical specifications of the XGRIDS L2 Pro 32/300 Standard Package');
    for (const [locale, store] of [['en-GB', '3DDevice'], ['de-DE', 'EXPERT3D'], ['pl-PL', C3D]] as const) {
      expect(stuffing(stuffed, locale, store), `${locale}/${store}`).toHaveLength(1);
    }
  });

  it('is inert when no product name is supplied (Optimizer path)', () => {
    expect(validateHeadingStyle(h2('Технічні характеристики XGRIDS L2 Pro'), 'uk-UA', C3D))
      .toEqual([]);
  });

  it('tolerates the unit-spacing normalization the artifact applies to the name', () => {
    // "20W" in the input renders as "20 W" after fixNumberFormatting; the pattern must still match.
    const issues = validateHeadingStyle(h2('Поради щодо експлуатації Ortur H20 20 W'), 'uk-UA', C3D, 'Ortur H20 20W');
    expect(issues.filter(i => i.rule === 'heading-product-name-stuffing')).toHaveLength(1);
  });
});

describe('validateHeadingStyleDoc — Doc-reading sibling', () => {
  function baseDoc(
    functionalityHeadings: string[],
    overrides: Partial<ProductDescriptionDoc> = {},
  ): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: 'Ortur H20',
      hook: 'Hook.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [],
      functionality: functionalityHeadings.map(heading => ({ heading, blocks: [] })),
      applications: { heading: 'Застосування', items: [] },
      specs: { heading: 'Технічні характеристики', categories: [] },
      cta: { heading: 'Чому варто купити Ortur H20 у Center 3D Print?', text: 'Buy.' },
      figures: [],
      videos: [],
      ...overrides,
    };
  }

  const rules = (doc: ProductDescriptionDoc, locale = 'uk-UA', store = C3D) =>
    validateHeadingStyleDoc(doc, locale, store, '');

  describe('h2-nominal-heading — scoped to functionality[].heading only', () => {
    it('flags bare nominal topics', () => {
      const observed = [
        'Лазерний модуль 20 Вт для гравіювання та різання',
        'ПЗ та автоматизація',
        'Безпека під час роботи',
        'Електронне керування та аварійні системи',
      ];
      for (const heading of observed) {
        const issues = rules(baseDoc([heading]));
        expect(issues, heading).toHaveLength(1);
        expect(issues[0].rule).toBe('h2-nominal-heading');
        expect(issues[0].severity).toBe('warning');
        expect(issues[0].detail).toContain(heading);
        expect(issues[0].path).toBe('doc.functionality[0].heading');
      }
    });

    it('passes headings that open with a functional/question word', () => {
      const good = [
        'Як працює Ortur H20',
        'Яке ПЗ підтримує Ortur H20',
        'Де застосовують Ortur H20',
      ];
      for (const heading of good) {
        expect(rules(baseDoc([heading])), heading).toEqual([]);
      }
    });

    it('passes a heading whose verb is not the first word', () => {
      expect(rules(baseDoc(['Корпус захищає від диму та пилу']))).toEqual([]);
      expect(rules(baseDoc(['Камера визначає краї заготовки']))).toEqual([]);
    });

    it('does not treat a genitive -ти noun as a verb', () => {
      for (const heading of ['Безпека під час роботи', 'Розмір робочої плати']) {
        expect(rules(baseDoc([heading])), heading).toHaveLength(1);
      }
    });

    it('never flags a nested subsection heading, however nominal (the anti-regression case)', () => {
      const doc = baseDoc(['Технічні характеристики'], {
        functionality: [{
          heading: 'Як працює Ortur H20',
          blocks: [],
          subsections: ['Лазерний модуль', 'Безпека', 'Електроніка'].map(heading => ({ heading, blocks: [] })),
        }],
      });
      // The one functionality[].heading is "Як працює..." (functional opener, passes); its
      // subsections are never candidates for h2-nominal-heading at all.
      expect(rules(doc)).toEqual([]);
    });

    it('restates the scope in the detail, since repair feedback echoes it', () => {
      const issues = rules(baseDoc(['ПЗ та автоматизація']));
      expect(issues[0].detail).toContain('functionality[].heading (§3) ONLY');
      expect(issues[0].detail).toContain('stay concise nominal labels');
    });

    it('reports each offending functionality heading separately, with its own index', () => {
      const doc = baseDoc(['Як працює Ortur H20', 'ПЗ та автоматизація', 'Безпека під час роботи']);
      const issues = rules(doc);
      expect(issues).toHaveLength(2);
      expect(issues.map(i => i.path)).toEqual(['doc.functionality[1].heading', 'doc.functionality[2].heading']);
    });

    it('other sections are never candidates — a §7/§9-shaped string never reaches this check because it never sits in functionality[]', () => {
      const doc = baseDoc([], {
        applications: { heading: 'Сфери застосування', items: [] },
        specs: { heading: 'Технічні характеристики', categories: [] },
      });
      expect(rules(doc).filter(i => i.rule === 'h2-nominal-heading')).toEqual([]);
    });

    describe('scoping', () => {
      it('is inert for every store except Center 3D Print', () => {
        for (const store of ['Drukarka 3D', 'EXPERT3D', '3DDevice', '']) {
          expect(rules(baseDoc(['ПЗ та автоматизація']), 'uk-UA', store), store).toEqual([]);
        }
      });

      it('is inert for locales with no heading lexicon', () => {
        for (const locale of ['pl-PL', 'de-DE', 'en-GB']) {
          expect(rules(baseDoc(['Oprogramowanie i automatyzacja']), locale), locale).toEqual([]);
        }
      });

      it('works for ru-UA', () => {
        expect(rules(baseDoc(['Как работает Ortur H20']), 'ru-UA')).toEqual([]);
        expect(rules(baseDoc(['ПО и автоматизация']), 'ru-UA')).toHaveLength(1);
      });

      it('returns nothing for a doc with no functionality sections', () => {
        expect(rules(baseDoc([]))).toEqual([]);
      });
    });
  });

  describe('heading-product-name-stuffing — the global rule', () => {
    const NAME = 'XGRIDS L2 Pro 32/300 Standard Package';
    const stuffing = (doc: ProductDescriptionDoc, locale = 'uk-UA', store = C3D) =>
      validateHeadingStyleDoc(doc, locale, store, NAME).filter(i => i.rule === 'heading-product-name-stuffing');

    it('flags the full product name in a functionality heading, addressed by JSON path', () => {
      const doc = baseDoc(['Технічні характеристики 3D-сканера XGRIDS L2 Pro 32/300 Standard Package']);
      const issues = stuffing(doc);
      expect(issues).toHaveLength(1);
      expect(issues[0].detail).toContain('FULL product name');
      expect(issues[0].path).toBe('doc.functionality[0].heading');
    });

    it('accepts the short form in the first §3 heading and the §9 closing — two is the budget', () => {
      const doc = baseDoc(['Як працює 3D-сканер XGRIDS L2 Pro', 'Механізми безпеки та захисту'], {
        specs: { heading: 'Технічні характеристики', categories: [] },
        cta: { heading: 'Чому варто купити сканер XGRIDS L2 Pro у Center 3D Print?', text: 'Buy.' },
      });
      expect(stuffing(doc)).toEqual([]);
    });

    it('flags the headings that name the product outside the two reserved slots', () => {
      const doc = baseDoc(['Як працює 3D-сканер XGRIDS L2 Pro', 'Яке ПЗ підтримує XGRIDS L2 Pro'], {
        applications: { heading: 'Сфери застосування XGRIDS L2 Pro', items: [] },
        cta: { heading: 'Чому варто купити XGRIDS L2 Pro у Center 3D Print?', text: 'Buy.' },
      });
      const issues = stuffing(doc);
      expect(issues).toHaveLength(2);
      expect(issues.map(i => i.path)).toEqual(['doc.functionality[1].heading', 'doc.applications.heading']);
      expect(issues[0].detail).toContain('neither the first §3 heading nor the §9 closing');
      // Never the §9 closing: it holds one of the two blessed slots by right.
      expect(issues.map(i => i.path)).not.toContain('doc.cta.heading');
    });

    /**
     * The reported bug, in its exact shape: the ladder logged
     * `cannot address "doc.cta.heading"` because the CTA was flagged in place of the §7 heading
     * that actually broke the budget. The Doc sibling identifies §9 structurally, so unlike the
     * HTML sibling this needs no question-mark heuristic.
     */
    it('blames the stray §7 heading, NOT the §9 closing', () => {
      const doc = baseDoc(['Як працює 3D-сканер XGRIDS L2 Pro', 'Механізми безпеки та захисту'], {
        specs: { heading: 'Технічні характеристики XGRIDS L2 Pro', categories: [] },
        cta: { heading: 'Чому варто купити XGRIDS L2 Pro у Center 3D Print?', text: 'Buy.' },
      });
      const issues = stuffing(doc);
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('doc.specs.heading');
      // Same coherence requirement as the HTML sibling — this detail becomes the repair prompt.
      expect(issues[0].detail).not.toMatch(/\bis the \d+th\b/);
      expect(issues[0].detail).toContain('neither the first §3 heading nor the §9 closing');
    });

    /**
     * The change to identity-based slots fixes WHO is blamed; it must not also change WHETHER an
     * in-budget artifact is flagged. Two product-named headings stay clean even when neither is the
     * §9 closing — flagging here would rewrite headings that have always passed, and since
     * repair-strategy.ts can now address `doc.specs.heading`, that rewrite would actually happen.
     */
    it('stays silent at two product-named headings even when neither is the §9 closing', () => {
      const doc = baseDoc(['Як працює 3D-сканер XGRIDS L2 Pro'], {
        specs: { heading: 'Технічні характеристики XGRIDS L2 Pro', categories: [] },
        cta: { heading: 'Чому варто купити у Center 3D Print?', text: 'Buy.' },
      });
      expect(stuffing(doc)).toEqual([]);
    });

    it('gives a nested subsection heading a budget of zero — pushing the keyword down a level is still stuffing', () => {
      const doc = baseDoc(['Огляд'], {
        functionality: [{
          heading: 'Огляд',
          blocks: [],
          subsections: [{ heading: 'Лідар XGRIDS L2 Pro', blocks: [] }],
        }],
      });
      const issues = stuffing(doc);
      expect(issues).toHaveLength(1);
      expect(issues[0].detail).toContain('never carry the product name');
      expect(issues[0].path).toBe('doc.functionality[0].subsections[0].heading');
    });

    it('leaves an ordinary nominal nested heading alone', () => {
      const doc = baseDoc(['Огляд'], {
        functionality: [{
          heading: 'Огляд',
          blocks: [],
          subsections: [{ heading: 'Лазерний модуль', blocks: [] }, { heading: 'Безпека', blocks: [] }],
        }],
      });
      expect(stuffing(doc)).toEqual([]);
    });

    it('fires for every store and every locale, unlike the Style B rule', () => {
      const doc = baseDoc(['Technical specifications of the XGRIDS L2 Pro 32/300 Standard Package']);
      for (const [locale, store] of [['en-GB', '3DDevice'], ['de-DE', 'EXPERT3D'], ['pl-PL', C3D]] as const) {
        expect(stuffing(doc, locale, store), `${locale}/${store}`).toHaveLength(1);
      }
    });

    it('is inert when no product name is supplied (Optimizer path)', () => {
      const doc = baseDoc(['Технічні характеристики XGRIDS L2 Pro']);
      expect(validateHeadingStyleDoc(doc, 'uk-UA', C3D, '')).toEqual([]);
    });

    it('tolerates the unit-spacing normalization the artifact applies to the name', () => {
      const doc = baseDoc([], { compatibility: { heading: 'Сумісність з Ortur H20 20 W', blocks: [] } });
      const issues = validateHeadingStyleDoc(doc, 'uk-UA', C3D, 'Ortur H20 20W')
        .filter(i => i.rule === 'heading-product-name-stuffing');
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('doc.compatibility.heading');
    });

    it('checks every section heading — applications, compatibility, packageContents, specs, cta', () => {
      const doc = baseDoc([], {
        applications: { heading: `Застосування ${NAME}`, items: [] },
        compatibility: { heading: `Сумісність з ${NAME}`, blocks: [] },
        packageContents: { heading: `Комплект ${NAME}`, items: [] },
        specs: { heading: `Характеристики ${NAME}`, categories: [] },
        cta: { heading: `Чому купити ${NAME}?`, text: 'Buy.' },
      });
      const issues = stuffing(doc);
      const paths = issues.map(i => i.path).sort();
      expect(paths).toEqual([
        'doc.applications.heading', 'doc.compatibility.heading', 'doc.cta.heading',
        'doc.packageContents.heading', 'doc.specs.heading',
      ]);
    });
  });

  describe('null/undefined safety', () => {
    it('does not throw on a doc with no compatibility or packageContents', () => {
      const doc = baseDoc(['Як працює Ortur H20']);
      expect(doc.compatibility).toBeUndefined();
      expect(doc.packageContents).toBeUndefined();
      expect(() => validateHeadingStyleDoc(doc, 'uk-UA', C3D, 'Ortur H20')).not.toThrow();
    });

    it('does not throw on a doc with no functionality entries at all', () => {
      expect(() => validateHeadingStyleDoc(baseDoc([]), 'uk-UA', C3D, 'Ortur H20')).not.toThrow();
    });
  });
});
