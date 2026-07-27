/**
 * heading-style.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateHeadingStyle } from './heading-style';

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

    it('§8: the operating-tips heading', () => {
      expect(rules(h2('Поради щодо експлуатації Ortur H20'))).toEqual([]);
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
