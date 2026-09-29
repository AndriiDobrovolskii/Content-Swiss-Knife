/**
 * heading-style.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateHeadingStyle, validateHeadingStyleDoc } from './heading-style';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { productShort } from '../prompt-core/product-name-core';

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
    // A generic, non-product-named heading is prepended so the tested heading is structurally NOT the
    // blessed first §3 heading — FR-6's Pass 1/Pass 2 (heading-style.ts) exempt the degenerate
    // short(=full) form AT a blessed position (see the dedicated FR-6/FR-7 describe block below), and
    // this test's own intent is digit/letter-spacing tolerance in the pattern match, not blessed-position
    // semantics. Without this, the single <h2> would be both structurally first and the only heading,
    // making it blessed and CORRECTLY exempt under the fixed behaviour — so the flagged-count
    // assertion below would fail for a reason unrelated to this test's own intent, not because the
    // pattern match itself stopped tolerating the spacing normalization.
    const html = h2('Загальний вступ') + h2('Поради щодо експлуатації Ortur H20 20 W');
    const issues = validateHeadingStyle(html, 'uk-UA', C3D, 'Ortur H20 20W');
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

/**
 * US-3.1 T7 (AC-2, AC-3; FR-6, FR-7; plan D5).
 *
 * `productShort("Makera Cyclone Dust Collector")` returns the whole string unchanged (no
 * configuration code or packaging suffix to drop — the QA sample's own case, confirmed against
 * `product-name-core.ts`), so `short === full` here throughout. Today's `fullPattern` branch fires
 * on this name unconditionally, with no position check at all — the uk-UA false positive AC-2
 * exists to fix.
 */
describe('validateHeadingStyle — FR-6/FR-7: blessed-position exemption and brand-core presence', () => {
  const NAME = 'Makera Cyclone Dust Collector';
  const STORE = 'EXPERT3D';
  const stuffing = (html: string) =>
    validateHeadingStyle(html, 'uk-UA', STORE, NAME).filter(i => i.rule === 'heading-product-name-stuffing');
  const brandCoreMissing = (html: string) =>
    validateHeadingStyle(html, 'uk-UA', STORE, NAME).filter(i => i.rule === 'heading-brand-core-missing');

  it('fixture premise: productShort(NAME) === NAME for this fixture (the degenerate case)', () => {
    expect(productShort(NAME)).toBe(NAME);
  });

  /** FR-6 — the exact uk-UA regression: the short(=full) form at both blessed positions must never
   *  be flagged by the full-pattern branch, even though it IS the full/invariant name. */
  it('does not flag the short(=full) form at the first §3 heading or the §9 closing', () => {
    const html =
      h2(`Як працює ${NAME}`) +
      h2('Механізми безпеки та захисту') +
      h2('Технічні характеристики') +
      h2(`Чому варто купити ${NAME} у ${STORE}?`);
    expect(stuffing(html)).toEqual([]);
  });

  /**
   * FR-6's own disjointness note: a heading carrying exactly productShort() satisfies both FR-6
   * and FR-7 and triggers neither. Paired with a positive control in the same test (corrupting the
   * CTA on the second half) — a rule that has never been registered would pass the first half
   * vacuously; the second half is what makes this test red until the rule exists.
   */
  it('does not flag heading-brand-core-missing either, for the same correct headings — but DOES fire once the CTA is corrupted', () => {
    const correct =
      h2(`Як працює ${NAME}`) +
      h2('Технічні характеристики') +
      h2(`Чому варто купити ${NAME} у ${STORE}?`);
    expect(brandCoreMissing(correct)).toEqual([]);

    const corrupted =
      h2(`Як працює ${NAME}`) +
      h2('Технічні характеристики') +
      h2('Чому варто купити Cyclone Dust Collector у EXPERT3D?'); // "Makera" dropped
    expect(brandCoreMissing(corrupted)).toHaveLength(1);
  });

  /**
   * FR-7 — mandatory presence. The actual QA-report evidence
   * (`expert3d_makera_cyclone_dust_collector_2026-09-21_2147.zip`'s `description_pt-PT.html`) drops
   * "Makera" from the CTA heading entirely, keeping only "Cyclone" — reachable now that the
   * `named.includes(lastH2)` conjunct is dropped from blessed-closing identification.
   */
  it('flags heading-brand-core-missing when the CTA drops the brand core entirely', () => {
    const html =
      h2(`Як працює ${NAME}`) +
      h2('Технічні характеристики') +
      h2('Чому варто купити Cyclone Dust Collector у EXPERT3D?'); // "Makera" dropped
    const issues = brandCoreMissing(html);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('flags heading-brand-core-missing for a corrupted/partial variant (brand present, rest dropped)', () => {
    const html =
      h2(`Як працює ${NAME}`) +
      h2('Технічні характеристики') +
      h2('Чому варто купити Makera у EXPERT3D?'); // brand survives, category noun does not
    expect(brandCoreMissing(html)).toHaveLength(1);
  });

  /** FR-6's other half: a blessed-position heading carrying MORE than the short form (here, the
   *  same string plus the packaging/config word "Standard Package") is still flagged — the
   *  exemption is scoped to the EXACT productShort() form, not "close enough". */
  it('still flags a blessed-position heading that carries more than the short form', () => {
    const withSuffix = `${NAME} Standard Package`; // productShort() drops "Standard Package"
    const html =
      h2(`Огляд ${withSuffix}`) +
      h2('Технічні характеристики') +
      h2(`Чому варто купити ${withSuffix} у ${STORE}?`);
    expect(validateHeadingStyle(html, 'uk-UA', STORE, withSuffix)
      .filter(i => i.rule === 'heading-product-name-stuffing')).toHaveLength(2);
  });

  /**
   * heading-brand-core-missing is scoped to the CTA-heading position only, as of Specification
   * v16 — a non-blessed §4/§5 heading is unaffected by this new check regardless of what it names.
   * Paired with a positive control (the CTA itself omitting the core) in the same test, so the
   * negative half cannot pass vacuously against a rule that does not exist yet.
   */
  it('does not fire heading-brand-core-missing on a non-blessed heading — but DOES fire when the CTA itself is missing the core', () => {
    const nonBlessedOmitsCore =
      h2(`Як працює ${NAME}`) +
      h2('Сфери застосування') + // §4/§5-shaped, non-blessed, names no product at all
      h2('Технічні характеристики') +
      h2(`Чому варто купити ${NAME} у ${STORE}?`);
    expect(brandCoreMissing(nonBlessedOmitsCore)).toEqual([]);

    const ctaOmitsCore =
      h2(`Як працює ${NAME}`) +
      h2('Сфери застосування') +
      h2('Технічні характеристики') +
      h2('Чому варто купити Cyclone Dust Collector у EXPERT3D?'); // "Makera" dropped
    expect(brandCoreMissing(ctaOmitsCore)).toHaveLength(1);
  });

  /**
   * FR-7, v16 narrowing: the first §3 heading itself is no longer read by this check at all. When
   * BOTH the first heading and the CTA omit the brand core, exactly one finding is still raised —
   * proving the first heading is never independently checked (two omissions would otherwise raise
   * two findings), while the CTA position still is.
   */
  it('does not check the first §3 heading for brand-core presence — only the CTA heading is checked (HTML path)', () => {
    const html =
      h2('Механізми та компоненти') + // first §3 heading — omits the brand core entirely
      h2('Технічні характеристики') +
      h2('Чому варто купити Cyclone Dust Collector у EXPERT3D?'); // CTA omits it too — "Makera" dropped
    expect(brandCoreMissing(html)).toHaveLength(1);
  });

  /**
   * D5's named, INTENTIONAL widening (AGENTS.md §7.7): once blessed-position identification is
   * structural (the literal first <h2> and a genuinely question-shaped closing), a generic first
   * heading no longer "steals" the first reserved slot for whichever named heading happens to come
   * next — so a document with a generic first heading, no §9 closing, and 3 product-named headings
   * now flags ALL THREE, not two. No existing fixture combined a non-product-named first heading
   * with 3+ product-named headings (Implementation Plan D5), so this is new coverage, not a flipped
   * expectation.
   */
  /**
   * Uses a SHORT !== FULL product name deliberately — with the degenerate NAME above, every
   * fullPattern match is unconditionally flagged today regardless of position (that IS the AC-2
   * bug), which would make this case pass today for the wrong reason. `XGRIDS L2 Pro 32/300
   * Standard Package` exercises the `shortPattern`/`named[]` machinery D5 actually restructures.
   */
  it('widens the flagged set when the true first heading is generic and there is no §9 closing', () => {
    const XGRIDS = 'XGRIDS L2 Pro 32/300 Standard Package'; // productShort() -> "XGRIDS L2 Pro"
    const html =
      h2('Загальний вступний розділ') +                       // structurally first — NOT product-named
      h2('Яке ПЗ підтримує XGRIDS L2 Pro') +                   // named #1
      h2('Сфери застосування XGRIDS L2 Pro') +                 // named #2
      h2('Технічні характеристики') +
      h2('Стандартна комплектація XGRIDS L2 Pro');             // named #3 — no "?", so no §9 closing exists
    const issues = validateHeadingStyle(html, 'uk-UA', STORE, XGRIDS)
      .filter(i => i.rule === 'heading-product-name-stuffing');
    // OLD (content-derived) blessedFirst = named[0] ("Яке ПЗ підтримує…", though structurally the
    // document's SECOND <h2>) — flags only 2. NEW (structural) blessedFirst = the literal first
    // <h2> ("Загальний вступний розділ"), which is not in `named` at all, so it exempts nothing —
    // all three named headings are flagged.
    expect(issues).toHaveLength(3);
  });
});

describe('validateHeadingStyleDoc — FR-6/FR-7: blessed-position exemption and brand-core presence', () => {
  const NAME = 'Makera Cyclone Dust Collector';

  function baseDoc(functionalityHeading: string, ctaHeading: string): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: NAME,
      hook: 'Hook.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [],
      functionality: [{ heading: functionalityHeading, blocks: [] }],
      applications: { heading: 'Застосування', items: [] },
      specs: { heading: 'Технічні характеристики', categories: [] },
      cta: { heading: ctaHeading, text: 'Buy.' },
      figures: [],
      videos: [],
    };
  }

  const brandCoreMissing = (doc: ProductDescriptionDoc) =>
    validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', NAME).filter(i => i.rule === 'heading-brand-core-missing');
  const stuffing = (doc: ProductDescriptionDoc) =>
    validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', NAME).filter(i => i.rule === 'heading-product-name-stuffing');

  it('does not flag the degenerate short(=full) form at either blessed position (Doc path)', () => {
    const doc = baseDoc(`Як працює ${NAME}`, `Чому варто купити ${NAME} у EXPERT3D?`);
    expect(stuffing(doc)).toEqual([]);
    expect(brandCoreMissing(doc)).toEqual([]);
  });

  it('flags heading-brand-core-missing, addressed by JSON path, when the CTA omits the brand core', () => {
    const doc = baseDoc(`Як працює ${NAME}`, 'Чому варто купити Cyclone Dust Collector у EXPERT3D?');
    const issues = brandCoreMissing(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('doc.cta.heading');
    expect(issues[0].severity).toBe('error');
  });

  /**
   * FR-7, v16 narrowing: `doc.functionality[0].heading` is no longer part of this check's
   * mandatory-presence test for either `schemaVersion` — only the CTA-heading position
   * (`doc.cta.heading` for `schemaVersion: '3.0'`) is checked. When BOTH the first heading and the
   * CTA omit the brand core, exactly one finding is still raised, at `doc.cta.heading` only — never
   * at `doc.functionality[0].heading` — proving the first heading is never independently checked
   * (two omissions would otherwise raise two findings).
   */
  it('raises exactly one finding, at doc.cta.heading, when BOTH the first heading and the CTA omit the brand core', () => {
    const doc = baseDoc('Як працює Cyclone Dust Collector', 'Чому варто купити Cyclone Dust Collector у EXPERT3D?');
    const issues = brandCoreMissing(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('doc.cta.heading');
  });

  /**
   * Doc-path mirror of the HTML widening test above, and specifically the shape Implementation
   * Plan's own "Implementation-fidelity note" (D5) flags as unsafe under the reverted T7 attempt:
   * a document that omits §3 (`functionality`) ENTIRELY — `test/fixtures/simplified-docs.ts`'s
   * `sparePartsDoc()` is the confirmed real example. The stash's own `blessedFirst = headings.length
   * > 1 ? headings[0] : undefined` shorthand would incorrectly bless whichever heading happens to
   * come first in `collectHeadings()`'s output (here, `applications.heading`) — Pass 1's correct,
   * path-based rule (blessed only at `path === 'doc.functionality[0].heading'`) has NO first-blessed
   * position at all for such a doc, so every product-named heading below must be flagged, not just
   * the excess over budget-of-two.
   */
  it('flags ALL product-named headings on a doc with no functionality at all (no blessedFirst can exist)', () => {
    const XGRIDS = 'XGRIDS L2 Pro 32/300 Standard Package'; // productShort() -> "XGRIDS L2 Pro"
    const doc: ProductDescriptionDoc = {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: XGRIDS,
      hook: 'Hook.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [],
      functionality: [], // §3 omitted entirely — the sparePartsDoc()-shaped case
      applications: { heading: 'Яке ПЗ підтримує XGRIDS L2 Pro', items: [] },
      compatibility: { heading: 'Сфери застосування XGRIDS L2 Pro', blocks: [] },
      packageContents: { heading: 'Стандартна комплектація XGRIDS L2 Pro', items: [] },
      specs: { heading: 'Технічні характеристики', categories: [] },
      cta: { heading: 'Дякуємо за увагу', text: 'Buy.' }, // no §9-shaped product mention at all
      figures: [],
      videos: [],
    };
    const issues = validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', XGRIDS)
      .filter(i => i.rule === 'heading-product-name-stuffing');
    expect(issues.map(i => i.path).sort()).toEqual([
      'doc.applications.heading', 'doc.compatibility.heading', 'doc.packageContents.heading',
    ]);
  });
});

/**
 * US-3.1 T7 (AC-3; FR-7, D5(f)) — the `schemaVersion`-conditional CTA-heading leaf.
 *
 * `heading-brand-core-missing`'s Doc-path form checks `doc.cta.heading` for `schemaVersion: '3.0'`
 * and `doc.localizedName` for `'4.0'` — a `render-description.ts`-driven retarget (`isV4` discards
 * `doc.cta.heading` unconditionally on the v4/simplified-template path and assembles the shipped
 * heading from `doc.localizedName` instead). Proven symmetrically: swapping which field carries the
 * correct value flips which field is checked.
 */
describe('validateHeadingStyleDoc — FR-7: the doc.localizedName leaf, schemaVersion-conditional retarget', () => {
  const NAME = 'Makera Cyclone Dust Collector';

  function baseDoc(schemaVersion: '3.0' | '4.0', localizedName: string, ctaHeading: string): ProductDescriptionDoc {
    return {
      schemaVersion,
      locale: 'uk-UA',
      localizedName,
      hook: 'Hook.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [],
      functionality: [{ heading: `Як працює ${NAME}`, blocks: [] }],
      applications: { heading: 'Застосування', items: [] },
      specs: { heading: 'Технічні характеристики', categories: [] },
      cta: { heading: ctaHeading, text: 'Buy.' },
      figures: [],
      videos: [],
    };
  }

  const brandCoreMissing = (doc: ProductDescriptionDoc) =>
    validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', NAME).filter(i => i.rule === 'heading-brand-core-missing');

  /**
   * Both directions asserted in one test: a wrong doc.cta.heading is flagged even when
   * doc.localizedName happens to be correct (proving doc.localizedName is NOT read on this
   * schemaVersion), and a correct doc.cta.heading passes even when doc.localizedName is wrong
   * (proving doc.localizedName is never independently checked either).
   */
  it('schemaVersion 3.0: only doc.cta.heading is checked', () => {
    const wrongCta = baseDoc('3.0', NAME, 'Чому варто купити Cyclone Dust Collector у EXPERT3D?');
    const wrongCtaIssues = brandCoreMissing(wrongCta);
    expect(wrongCtaIssues).toHaveLength(1);
    expect(wrongCtaIssues[0].path).toBe('doc.cta.heading');

    const correctCta = baseDoc('3.0', 'unrelated value — not read for schemaVersion 3.0', `Чому варто купити ${NAME} у EXPERT3D?`);
    expect(brandCoreMissing(correctCta)).toEqual([]);
  });

  it('schemaVersion 4.0: only doc.localizedName is checked', () => {
    const wrongName = baseDoc('4.0', 'Cyclone Dust Collector', `Чому варто купити ${NAME} у EXPERT3D?`);
    const wrongNameIssues = brandCoreMissing(wrongName);
    expect(wrongNameIssues).toHaveLength(1);
    expect(wrongNameIssues[0].path).toBe('doc.localizedName');

    const correctName = baseDoc('4.0', NAME, 'this field is never rendered for schemaVersion 4.0');
    expect(brandCoreMissing(correctName)).toEqual([]);
  });
});

/**
 * US-3.1 T7 (AC-3; FR-7, D5(e)) — the Cyrillic-unit-aware presence matcher.
 *
 * `productNamePattern()`'s own digit-flexible regex has no notion of script: a Latin unit
 * abbreviation immediately after a digit in the raw product name ("W", "kg", …) is never treated as
 * interchangeable with the Cyrillic spelling `unit-cyrillize.ts` deterministically produces for
 * every uk-UA/ru-UA generation ("Вт", "кг", …). `heading-brand-core-missing`'s presence test needs a
 * SEPARATE, dedicated matcher for this — confirmed table-driven (not "W"-specific) with a second,
 * independent unit pair. Each "must not fire" case is paired with a positive control using the same
 * fixture shape, so a rule that simply never fires cannot pass these vacuously.
 */
describe('validateHeadingStyleDoc — FR-7: the Cyrillic-unit-aware presence matcher (D5(e))', () => {
  function baseDoc(localizedName: string, ctaHeading: string): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName,
      hook: 'Hook.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [],
      functionality: [{ heading: 'Принцип роботи та модульна конструкція', blocks: [] }], // real corpus string — never names the product; out of FR-7's scope entirely
      applications: { heading: 'Застосування', items: [] },
      specs: { heading: 'Технічні характеристики Ortur H20 20 Вт', categories: [] }, // real corpus §7 heading — non-blessed
      cta: { heading: ctaHeading, text: 'Buy.' },
      figures: [],
      videos: [],
    };
  }

  function v4Doc(localizedName: string): ProductDescriptionDoc {
    return {
      schemaVersion: '4.0',
      locale: 'uk-UA',
      localizedName,
      hook: 'Hook.',
      cta: { heading: 'ignored on this schemaVersion', text: 'Buy.' },
      figures: [],
      videos: [],
    } as unknown as ProductDescriptionDoc;
  }

  const brandCoreMissing = (doc: ProductDescriptionDoc, name: string) =>
    validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', name).filter(i => i.rule === 'heading-brand-core-missing');
  const stuffing = (doc: ProductDescriptionDoc, name: string) =>
    validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', name).filter(i => i.rule === 'heading-product-name-stuffing');

  it('fixture premise: productShort is the degenerate short=full form for all three unit fixtures below', () => {
    expect(productShort('Ortur H20 20 W')).toBe('Ortur H20 20 W');
    expect(productShort('EcoLine X5 5kg')).toBe('EcoLine X5 5kg');
    expect(productShort('xTool D1 Pro 5.5W')).toBe('xTool D1 Pro 5.5W');
  });

  /**
   * Both directions in one test: the real corpus CTA heading (W → Вт, unit-cyrillized) must not be
   * flagged as missing the brand core; the same CTA position, with the brand+model dropped
   * entirely (unit alone means nothing), must fire.
   */
  it('recognizes the Cyrillic-unit form (W → Вт, the real corpus pair)', () => {
    const passDoc = baseDoc('Ortur H20 20 Вт', 'Чому купити Ortur H20 20 Вт в EXPERT3D?'); // verbatim corpus string
    expect(brandCoreMissing(passDoc, 'Ortur H20 20 W')).toEqual([]);

    const failDoc = baseDoc('Ortur H20 20 Вт', 'Чому купити в EXPERT3D?'); // brand+model dropped
    expect(brandCoreMissing(failDoc, 'Ortur H20 20 W')).toHaveLength(1);
  });

  it('is table-driven, not "W"-specific: a second unit pair (kg → кг) is recognized the same way', () => {
    const passDoc = baseDoc('EcoLine X5 5 кг', 'Чому купити EcoLine X5 5 кг в EXPERT3D?');
    expect(brandCoreMissing(passDoc, 'EcoLine X5 5kg')).toEqual([]);

    const failDoc = baseDoc('EcoLine X5 5 кг', 'Чому купити в EXPERT3D?');
    expect(brandCoreMissing(failDoc, 'EcoLine X5 5kg')).toHaveLength(1);
  });

  /**
   * The matcher serves the doc.localizedName leaf too (schemaVersion 4.0), not only doc.cta.heading
   * — the same underlying exposure (UNIT_LOCALIZATION_RULES applies to "repeated Product Names"
   * generally, Specification Background v11 point 4). Failing sibling is Specification's own
   * worked example: three added trailing periods push the occurrence count to 4 against the
   * source's 1.
   */
  it('recognizes the Cyrillic-unit form on the doc.localizedName leaf too (schemaVersion 4.0, xTool D1 Pro 5.5W → 5.5 Вт)', () => {
    const passDoc = v4Doc('xTool D1 Pro 5.5 Вт');
    expect(brandCoreMissing(passDoc, 'xTool D1 Pro 5.5W')).toEqual([]);

    const failDoc = v4Doc('xTool D1 Pro 5.5 Вт...'); // occurrence-count: 4 periods > source's 1
    expect(brandCoreMissing(failDoc, 'xTool D1 Pro 5.5W')).toHaveLength(1);
  });

  /**
   * D5(e)'s own explicit design boundary: the Cyrillic-unit-aware matcher serves ONLY
   * heading-brand-core-missing's presence test — it is never applied to the shared
   * productNamePattern()/shortPattern/fullPattern heading-product-name-stuffing (FR-6) still uses
   * unmodified. Widening the shared matcher would newly trip FR-6 against this exact, real,
   * already-accepted non-blessed §7 heading. **This test is a declared [pin]: it is already green
   * today (the shared matcher was never touched) and must stay green after T7 — it is not
   * red-to-green evidence for any AC.**
   */
  it('[pin] does NOT newly trip heading-product-name-stuffing on the corpus\'s own cyrillized-unit §7 heading (non-blessed)', () => {
    const doc = baseDoc('Ortur H20 20 Вт', `Чому купити Ortur H20 20 Вт в EXPERT3D?`);
    const issues = stuffing(doc, 'Ortur H20 20 W');
    expect(issues.map(i => i.path)).not.toContain('doc.specs.heading');
  });
});

/**
 * US-3.1 T7 (AC-3; FR-7) — the `doc.localizedName` leaf's own shape requirement: a bare name, no
 * sentence-terminal punctuation or quotation marks it did not already carry, no line break — subject
 * to an occurrence-count exemption plus a trailing-position condition, both computed against the raw
 * `opts.input.name`. Only cases where the candidate's PRESENCE (a contiguous, literal match of the
 * short form) is unambiguous are used here — see the Story's own test-generation report for why the
 * interior-relocated-punctuation worked example is not exercised this way.
 */
describe('validateHeadingStyleDoc — FR-7: the doc.localizedName shape requirement (banned characters, occurrence-count, trailing-position)', () => {
  function v4Doc(localizedName: string): ProductDescriptionDoc {
    return {
      schemaVersion: '4.0',
      locale: 'uk-UA',
      localizedName,
      hook: 'Hook.',
      cta: { heading: 'ignored on this schemaVersion', text: 'Buy.' },
      figures: [],
      videos: [],
    } as unknown as ProductDescriptionDoc;
  }

  const brandCoreMissing = (localizedName: string, inputName: string) =>
    validateHeadingStyleDoc(v4Doc(localizedName), 'uk-UA', 'EXPERT3D', inputName)
      .filter(i => i.rule === 'heading-brand-core-missing');

  it('fixture premise: productShort() for both source names used below', () => {
    expect(productShort('Bambu Lab Hardened Steel Nozzle 0.4 mm')).toBe('Bambu Lab Hardened Steel');
    expect(productShort('Filament Bambu Lab PETG 1.75 mm')).toBe('Bambu Lab PETG 1.75');
  });

  it('passes: the bare short form, zero banned characters; fails when an unjustified period is appended (occurrence-count)', () => {
    expect(brandCoreMissing('Bambu Lab PETG 1.75', 'Filament Bambu Lab PETG 1.75 mm')).toEqual([]);
    // candidate's period count (2) exceeds the source's (1) — fails on occurrence-count too.
    expect(brandCoreMissing('Bambu Lab PETG 1.75.', 'Filament Bambu Lab PETG 1.75 mm')).toHaveLength(1);
  });

  it('passes: the full unframed name (interior period matches the source\'s own count); fails when the bare short form alone gains a trailing period (trailing-position, v15)', () => {
    const name = 'Bambu Lab Hardened Steel Nozzle 0.4 mm';
    expect(brandCoreMissing(name, name)).toEqual([]);
    // Trailing-position check (v15): the source name's own trailing character is "m", not ".";
    // occurrence-count alone (1 <= 1) would wrongly exempt this candidate.
    expect(brandCoreMissing('Bambu Lab Hardened Steel.', name)).toHaveLength(1);
  });

  it('fails: quotation marks the source name never carried', () => {
    expect(brandCoreMissing('"Bambu Lab Hardened Steel"', 'Bambu Lab Hardened Steel Nozzle 0.4 mm')).toHaveLength(1);
  });

  it('fails: an embedded line break, unconditionally — never subject to the occurrence-count exemption', () => {
    expect(brandCoreMissing('Bambu Lab Hardened Steel\nNozzle', 'Bambu Lab Hardened Steel Nozzle 0.4 mm')).toHaveLength(1);
  });

  it('passes: a bare comma is excluded from both banned classes outright — the disclosed residual; fails once a period is also added to the same candidate', () => {
    // "Bambu Lab PETG 1.75, matte finish" is CTA/framing-adjacent prose this Story's mechanical
    // check does NOT reject (Specification's own "Accepted residual, new in v16") — asserted here as
    // the check's actual, disclosed behaviour, not as endorsement of the framing itself.
    expect(brandCoreMissing('Bambu Lab PETG 1.75, matte finish', 'Filament Bambu Lab PETG 1.75 mm')).toEqual([]);
    // Same candidate, one trailing period added: occurrence count (2) exceeds the source's (1),
    // and the trailing character ('.') does not match the source's own ('m') — fails on both.
    expect(brandCoreMissing('Bambu Lab PETG 1.75, matte finish.', 'Filament Bambu Lab PETG 1.75 mm')).toHaveLength(1);
  });
});

/**
 * US-3.1 T7 (AC-3; plan Risk 19) — FR-6 and FR-7 stay disjoint at the CTA-heading position: the
 * virtual doc.localizedName entry FR-7 constructs is never added to FR-6's own `named[]` array and
 * never counts toward its budget-of-two. This fixture is built to trip BOTH rules at once, not just
 * one: `doc.cta.heading` carries the FULL name at the blessed CTA position (FR-6 — still flagged,
 * carries more than the short form; this fires both before and after T7, since the shared
 * `fullPattern` branch is unaffected by this Story), while `doc.localizedName` drops the brand
 * entirely (FR-7). Each rule's own findings are asserted independently and exhaustively (`toEqual`,
 * not `toContain`), so neither rule's path can leak into the other's result.
 */
describe('validateHeadingStyleDoc — FR-6/FR-7 disjointness at the CTA-heading position (schemaVersion 4.0)', () => {
  const FULL = 'XGRIDS L2 Pro 32/300 Standard Package'; // productShort() -> "XGRIDS L2 Pro"

  it('a doc.cta.heading carrying the full name (FR-6) and a doc.localizedName missing the brand (FR-7) are reported independently, with no cross-contamination', () => {
    const doc: ProductDescriptionDoc = {
      schemaVersion: '4.0',
      locale: 'uk-UA',
      localizedName: 'L2 Pro', // brand "XGRIDS" dropped — trips FR-7
      hook: 'Hook.',
      functionality: [{ heading: 'Як працює XGRIDS L2 Pro', blocks: [] }], // blessed, exact short form — FR-6 exempt
      cta: { heading: `Чому купити ${FULL} в EXPERT3D?`, text: 'Buy.' }, // full form at the blessed CTA position — still flagged by FR-6
      figures: [],
      videos: [],
    } as unknown as ProductDescriptionDoc;

    const issues = validateHeadingStyleDoc(doc, 'uk-UA', 'EXPERT3D', FULL);
    const stuffingIssues = issues.filter(i => i.rule === 'heading-product-name-stuffing');
    const brandCoreIssues = issues.filter(i => i.rule === 'heading-brand-core-missing');

    expect(stuffingIssues.map(i => i.path)).toEqual(['doc.cta.heading']);
    expect(brandCoreIssues.map(i => i.path)).toEqual(['doc.localizedName']);
  });
});
