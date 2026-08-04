/**
 * tov-second-person.spec.ts
 *
 * Style B confines direct second-person address to the operating-tips block and the CTA.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateSecondPersonScope, validateSecondPersonScopeDoc } from './tov-second-person';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const C3D = 'Center 3D Print';

const doc = (...blocks: string[]) => blocks.join('\n');

const TIPS_BLOCK =
  `<h2>Поради щодо експлуатації Ortur Laser Master 3</h2>` +
  `<ul><li><b>Дотримуйтеся умов у приміщенні. </b>Забезпечте вашу вентиляцію.</li></ul>`;

const CTA_BLOCK =
  `<h2>Чому варто купити Ortur Laser Master 3 у Center 3D Print?</h2>` +
  `<p class="cta">Зв'яжіться з нашими спеціалістами, щоб обговорити ваші виробничі вимоги.</p>`;

describe('validateSecondPersonScope', () => {
  /**
   * The regression that makes this linter non-trivial. JS \b covers only [A-Za-z0-9_], so a
   * naive /\bви\b/ fires inside ВИготовлення, ВИкористання, ВИсокий, ВИмоги, ВИтрати — the exact
   * vocabulary this content is built from.
   */
  it('does not match "ви" inside ordinary Ukrainian words', () => {
    const html = doc(
      `<p>Верстат придатний для виготовлення та використання у високоточних задачах.</p>`,
      `<p>Він відповідає вимогам виробництва і знижує витрати на вироби.</p>`,
      `<p>Виконує вирізання, вигравіювання та вимірювання.</p>`,
    );
    expect(validateSecondPersonScope(html, 'uk-UA', C3D)).toEqual([]);
  });

  it('flags «ваш» in body prose', () => {
    const issues = validateSecondPersonScope(`<p>Це прискорить ваше виробництво.</p>`, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('tov-second-person-outside-scope');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toContain('ваше');
  });

  it('flags a second-person table header — the §2 defect, in its model-authored form', () => {
    const html = `<table><thead><tr><th>Параметр</th><th>Ваша перевага</th></tr></thead></table>`;
    const issues = validateSecondPersonScope(html, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('Ваша');
  });

  it('allows second person inside the operating-tips block', () => {
    expect(validateSecondPersonScope(TIPS_BLOCK, 'uk-UA', C3D)).toEqual([]);
  });

  it('allows second person inside <p class="cta">', () => {
    expect(validateSecondPersonScope(CTA_BLOCK, 'uk-UA', C3D)).toEqual([]);
  });

  it('ends the tips exemption at the next <h2> or <hr>', () => {
    const afterH2 = doc(TIPS_BLOCK, `<h2>Де застосовують Ortur</h2>`, `<p>Пасує вашому цеху.</p>`);
    expect(validateSecondPersonScope(afterH2, 'uk-UA', C3D)).toHaveLength(1);

    const afterHr = doc(TIPS_BLOCK, `<hr>`, `<p>Пасує вашому цеху.</p>`);
    expect(validateSecondPersonScope(afterHr, 'uk-UA', C3D)).toHaveLength(1);
  });

  it('handles a full document: tips + CTA exempt, body flagged', () => {
    const html = doc(
      `<p>Верстат знижує витрати на виготовлення.</p>`,
      `<table><thead><tr><th>Параметр</th><th>Ваша перевага</th></tr></thead></table>`,
      `<hr>`,
      TIPS_BLOCK,
      `<hr>`,
      CTA_BLOCK,
    );
    const issues = validateSecondPersonScope(html, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('Ваша');
  });

  it('reports each distinct form once, with context', () => {
    const html = `<p>Ваш верстат і ваш цех та ваша лінія.</p>`;
    const issues = validateSecondPersonScope(html, 'uk-UA', C3D);
    expect(issues).toHaveLength(2); // "ваш" and "ваша", not three hits
    expect(issues[0].detail).toContain('Context:');
  });

  it('recognizes the Russian tips heading too', () => {
    const ru = `<h2>Советы по эксплуатации Ortur</h2><ul><li>Проверяйте ваши настройки.</li></ul>`;
    expect(validateSecondPersonScope(ru, 'ru-UA', C3D)).toEqual([]);
  });

  describe('scoping', () => {
    it('is inert for every store except Center 3D Print', () => {
      const html = `<p>Це прискорить ваше виробництво.</p>`;
      for (const store of ['Drukarka 3D', 'EXPERT3D', '3DDevice', '']) {
        expect(validateSecondPersonScope(html, 'uk-UA', store), store).toEqual([]);
      }
    });

    /** de "Sie"/"Ihr" are homographs of the third person; pl Style B mandates impersonal forms. */
    it('is inert for non-Cyrillic locales, where the pattern would be noise', () => {
      const html = `<p>Це прискорить ваше виробництво.</p>`;
      for (const locale of ['pl-PL', 'de-DE', 'en-GB']) {
        expect(validateSecondPersonScope(html, locale, C3D), locale).toEqual([]);
      }
    });

    it('returns nothing for empty html', () => {
      expect(validateSecondPersonScope('', 'uk-UA', C3D)).toEqual([]);
    });
  });
});

describe('validateSecondPersonScopeDoc — Doc-reading sibling', () => {
  function baseDoc(overrides: Partial<ProductDescriptionDoc> = {}): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: 'Ortur Laser Master 3',
      hook: 'Верстат придатний для виготовлення та використання у високоточних задачах.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'why a' },
        { label: 'B', value: '2', why: 'why b' },
        { label: 'C', value: '3', why: 'why c' },
      ],
      keyBenefits: [{ kind: 'paragraph', text: 'Переваги виробу.' }],
      functionality: [{ heading: 'Функціональність', blocks: [{ kind: 'paragraph', text: 'Опис роботи.' }] }],
      applications: { heading: 'Застосування', items: [{ scenario: 'Сценарій. ', text: 'Текст.' }] },
      specs: { heading: 'Технічні характеристики', categories: [{ title: 'Cat', rows: [{ label: 'L', value: 'V' }] }] },
      cta: {
        heading: 'Чому варто купити Ortur Laser Master 3 у Center 3D Print?',
        text: "Зв'яжіться з нашими спеціалістами, щоб обговорити ваші виробничі вимоги.",
      },
      figures: [],
      videos: [],
      ...overrides,
    };
  }

  it('does not match "ви" inside ordinary Ukrainian words', () => {
    const doc = baseDoc({
      hook: 'Верстат придатний для виготовлення та використання у високоточних задачах.',
      functionality: [{
        heading: 'Функціональність',
        blocks: [{ kind: 'paragraph', text: 'Він відповідає вимогам виробництва і знижує витрати на вироби. Виконує вирізання, вигравіювання та вимірювання.' }],
      }],
    });
    expect(validateSecondPersonScopeDoc(doc, 'uk-UA', C3D)).toEqual([]);
  });

  it('flags «ваш» in a functionality block and names the JSON path in detail', () => {
    const doc = baseDoc({
      functionality: [{ heading: 'Функціональність', blocks: [{ kind: 'paragraph', text: 'Це прискорить ваше виробництво.' }] }],
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('tov-second-person-outside-scope');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toContain('ваше');
    expect(issues[0].path).toBe('functionality[0].blocks[0]');
    expect(issues[0].detail).toContain('functionality[0].blocks[0]');
  });

  it('flags a bullet lead-in or text independently, each with its own path', () => {
    const doc = baseDoc({
      keyBenefits: [{ kind: 'bullets', items: [{ lead: 'Ваша перевага. ', text: 'Це прискорить ваш процес.' }] }],
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    const paths = issues.map(i => i.path).sort();
    expect(paths).toEqual(['keyBenefits[0].items[0].lead', 'keyBenefits[0].items[0].text']);
  });

  it('allows second person inside the operatingTips subsection', () => {
    const doc = baseDoc({
      operatingTips: {
        heading: 'Поради щодо експлуатації Ortur Laser Master 3',
        blocks: [{ kind: 'bullets', items: [{ lead: 'Дотримуйтеся умов у приміщенні. ', text: 'Забезпечте вашу вентиляцію.' }] }],
      },
    });
    expect(validateSecondPersonScopeDoc(doc, 'uk-UA', C3D)).toEqual([]);
  });

  it('allows second person inside cta.text but NOT cta.heading', () => {
    const doc = baseDoc({
      cta: { heading: 'Це ваш найкращий вибір?', text: "Обговоримо ваші виробничі вимоги." },
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('cta.heading');
  });

  it('flags second person inside compatibility when present', () => {
    const doc = baseDoc({
      compatibility: { heading: 'Сумісність', blocks: [{ kind: 'paragraph', text: 'Підходить для вашого обладнання.' }] },
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    expect(issues.some(i => i.path === 'compatibility.blocks[0]')).toBe(true);
  });

  it('flags second person in a spec row value, addressed by its full JSON path', () => {
    const doc = baseDoc({
      specs: { heading: 'Технічні характеристики', categories: [{ title: 'Cat', rows: [{ label: 'Параметр', value: 'Ваша перевага' }] }] },
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('specs.categories[0].rows[0].value');
    expect(issues[0].detail).toContain('Ваша');
  });

  it('reports each distinct form once, with context', () => {
    const doc = baseDoc({
      functionality: [{ heading: 'Функціональність', blocks: [{ kind: 'paragraph', text: 'Ваш верстат і ваш цех та ваша лінія.' }] }],
    });
    const issues = validateSecondPersonScopeDoc(doc, 'uk-UA', C3D);
    expect(issues).toHaveLength(2); // "ваш" and "ваша", not three hits
    expect(issues[0].detail).toContain('Context:');
  });

  it('recognizes the Russian tips heading too (operatingTips still exempt for ru-UA)', () => {
    const doc = baseDoc({
      locale: 'ru-UA',
      operatingTips: {
        heading: 'Советы по эксплуатации Ortur',
        blocks: [{ kind: 'bullets', items: [{ lead: 'Совет. ', text: 'Проверяйте ваши настройки.' }] }],
      },
    });
    expect(validateSecondPersonScopeDoc(doc, 'ru-UA', C3D)).toEqual([]);
  });

  describe('null/undefined safety — a doc missing every optional field', () => {
    it('does not throw when compatibility, operatingTips and packageContents are all absent', () => {
      const doc = baseDoc();
      expect(doc.compatibility).toBeUndefined();
      expect(doc.operatingTips).toBeUndefined();
      expect(doc.packageContents).toBeUndefined();
      expect(() => validateSecondPersonScopeDoc(doc, 'uk-UA', C3D)).not.toThrow();
    });

    it('checks packageContents items when present, and skips cleanly when absent', () => {
      const withPkg = baseDoc({ packageContents: { heading: 'Комплект постачання', items: ['Ваш кабель живлення'] } });
      const issues = validateSecondPersonScopeDoc(withPkg, 'uk-UA', C3D);
      expect(issues.some(i => i.path === 'packageContents.items[0]')).toBe(true);

      const withoutPkg = baseDoc();
      expect(validateSecondPersonScopeDoc(withoutPkg, 'uk-UA', C3D)).toEqual([]);
    });
  });

  describe('scoping', () => {
    it('is inert for every store except Center 3D Print', () => {
      const doc = baseDoc({
        functionality: [{ heading: 'Функціональність', blocks: [{ kind: 'paragraph', text: 'Це прискорить ваше виробництво.' }] }],
      });
      for (const store of ['Drukarka 3D', 'EXPERT3D', '3DDevice', '']) {
        expect(validateSecondPersonScopeDoc(doc, 'uk-UA', store), store).toEqual([]);
      }
    });

    it('is inert for non-Cyrillic locales', () => {
      const doc = baseDoc({
        functionality: [{ heading: 'Функціональність', blocks: [{ kind: 'paragraph', text: 'Це прискорить ваше виробництво.' }] }],
      });
      for (const locale of ['pl-PL', 'de-DE', 'en-GB']) {
        expect(validateSecondPersonScopeDoc(doc, locale, C3D), locale).toEqual([]);
      }
    });
  });
});
