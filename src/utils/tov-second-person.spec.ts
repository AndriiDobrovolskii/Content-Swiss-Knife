/**
 * tov-second-person.spec.ts
 *
 * Style B confines direct second-person address to the operating-tips block and the CTA.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateSecondPersonScope } from './tov-second-person';

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
