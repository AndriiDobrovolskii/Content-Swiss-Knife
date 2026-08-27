/**
 * bullet-lead-punctuation.spec.ts
 *
 * Regression guard for the 2026-08 EXPERT3D Ortur F10 10W incident: "Деревообробка та фанерні
 * вироби" + "Фанера 8 мм ріжеться…" shipped as "виробиФанера" — a bold bullet lead glued to its
 * following text with no separator, in every one of §4's six list items.
 *
 * RUN: npm run test
 */
import { describe, it, expect } from 'vitest';
import { validateBulletLeadPunctuationDoc, normalizeBulletLeadPunctuation } from './bullet-lead-punctuation';
import type { ProductDescriptionDoc, Block } from '../domain/description-doc';

function baseDoc(overrides: Partial<ProductDescriptionDoc> = {}): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Ortur F10 10W',
    hook: 'Hook.',
    killerSpecs: [
      { key: 'a', label: 'A', value: '1', why: 'why a' },
      { key: 'b', label: 'B', value: '2', why: 'why b' },
      { key: 'c', label: 'C', value: '3', why: 'why c' },
    ],
    keyBenefits: [],
    functionality: [],
    applications: { heading: 'Сфери застосування', items: [] },
    specs: { heading: 'Технічні характеристики', categories: [] },
    cta: { heading: 'Чому купити Ortur F10 10W в EXPERT3D?', text: 'Buy.' },
    figures: [],
    videos: [],
    ...overrides,
  };
}

const bulletsBlock = (items: { lead: string; text: string }[]): Block => ({ kind: 'bullets', items });

describe('validateBulletLeadPunctuationDoc', () => {
  it('flags a lead glued directly to its text with no separator — the observed incident', () => {
    const doc = baseDoc({
      functionality: [{
        heading: 'Огляд',
        blocks: [bulletsBlock([
          { lead: 'Деревообробка та фанерні вироби', text: 'Фанера 8 мм ріжеться за один прохід.' },
        ])],
      }],
    });
    const issues = validateBulletLeadPunctuationDoc(doc, 'Doc (base)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].rule).toBe('bullet-lead-collision');
    expect(issues[0].detail).toContain('Деревообробка та фанерні вироби');
    expect(issues[0].detail).toContain('виробиФанера');
    expect(issues[0].context).toBe('Doc (base)');
  });

  it('passes a lead that ends with a colon', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([{ lead: '256 відтінків сірого:', text: 'модуль відтворює тонові переходи.' }])],
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
  });

  it('passes a lead that ends with a period and a space', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([{ lead: 'Деревообробка та фанерні вироби. ', text: 'Фанера 8 мм ріжеться.' }])],
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
  });

  it('passes when the text itself starts with a space, even if the lead has no trailing punctuation', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([{ lead: 'Деревообробка', text: ' Фанера 8 мм ріжеться.' }])],
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
  });

  it('checks nested h3 subsections, not just the top-level functionality blocks', () => {
    const doc = baseDoc({
      functionality: [{
        heading: 'Огляд',
        blocks: [],
        subsections: [{
          heading: 'Деталі',
          blocks: [bulletsBlock([{ lead: 'Ролики:', text: 'подають матеріал.' }])],
        }],
      }],
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
    const glued = baseDoc({
      functionality: [{
        heading: 'Огляд',
        blocks: [],
        subsections: [{
          heading: 'Деталі',
          blocks: [bulletsBlock([{ lead: 'Ролики', text: 'Подають матеріал.' }])],
        }],
      }],
    });
    expect(validateBulletLeadPunctuationDoc(glued, 'Doc (base)')).toHaveLength(1);
  });

  it('checks §4 applications.items, which is not Block-shaped and outside forEachBlockInOrder', () => {
    const doc = baseDoc({
      applications: {
        heading: 'Сфери застосування',
        items: [{ scenario: 'Маркування металу:', text: 'гравер працює з нержавіючою сталлю.' }],
      },
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toEqual([]);
    const glued = baseDoc({
      applications: {
        heading: 'Сфери застосування',
        items: [{ scenario: 'Маркування металу', text: 'Гравер працює з нержавіючою сталлю.' }],
      },
    });
    expect(validateBulletLeadPunctuationDoc(glued, 'Doc (base)')).toHaveLength(1);
  });

  it('reports one issue per colliding item, not a single artifact-level issue', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([
        { lead: 'Перше', text: 'Друге.' },
        { lead: 'Третє:', text: 'Четверте.' },
        { lead: "П'яте", text: 'Шосте.' },
      ])],
    });
    expect(validateBulletLeadPunctuationDoc(doc, 'Doc (base)')).toHaveLength(2);
  });

  it('is a no-op on an empty document', () => {
    expect(validateBulletLeadPunctuationDoc(baseDoc(), 'Doc (base)')).toEqual([]);
  });
});

describe('normalizeBulletLeadPunctuation', () => {
  it('appends ": " to a colliding lead — the observed incident — and the result no longer collides', () => {
    const doc = baseDoc({
      applications: {
        heading: 'Сфери застосування',
        items: [{ scenario: 'Маркування металевих виробів', text: 'ІЧ-промінь поглинається металами.' }],
      },
    });
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(doc);
    expect(count).toBe(1);
    expect(fixed.applications.items[0].scenario).toBe('Маркування металевих виробів: ');
    expect(validateBulletLeadPunctuationDoc(fixed, 'Doc (base)')).toEqual([]);
  });

  it('leaves a lead already ending in ": " or ". " byte-identical', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([
        { lead: 'Гравіювання металу: ', text: 'ІЧ-лазер маркує алюміній.' },
        { lead: 'Деревообробка та фанерні вироби. ', text: 'Фанера 8 мм ріжеться.' },
      ])],
    });
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(doc);
    expect(count).toBe(0);
    expect(fixed.keyBenefits).toEqual(doc.keyBenefits);
  });

  it('leaves a lead ending in punctuation other than a letter/digit untouched — never collided, never touched', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([
        { lead: 'Компактний, легкий,', text: 'зручний для транспортування.' },
        { lead: 'Швидка заміна модуля-', text: 'без інструментів.' },
      ])],
    });
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(doc);
    expect(count).toBe(0);
    expect(fixed.keyBenefits).toEqual(doc.keyBenefits);
  });

  it('fixes a colliding lead inside nested h3 subsections', () => {
    const doc = baseDoc({
      functionality: [{
        heading: 'Огляд',
        blocks: [],
        subsections: [{
          heading: 'Деталі',
          blocks: [bulletsBlock([{ lead: 'Ролики', text: 'Подають матеріал.' }])],
        }],
      }],
    });
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(doc);
    expect(count).toBe(1);
    expect((fixed.functionality[0].subsections![0].blocks[0] as { items: { lead: string }[] }).items[0].lead)
      .toBe('Ролики: ');
  });

  it('fixes every colliding item across a document in one pass and counts them all', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([
        { lead: 'Перше', text: 'Друге.' },
        { lead: 'Третє:', text: 'Четверте.' },
        { lead: "П'яте", text: 'Шосте.' },
      ])],
      applications: {
        heading: 'Сфери застосування',
        items: [{ scenario: 'Маркування металу', text: 'Гравер працює з нержавіючою сталлю.' }],
      },
    });
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(doc);
    expect(count).toBe(3);
    expect(validateBulletLeadPunctuationDoc(fixed, 'Doc (base)')).toEqual([]);
  });

  it('is a no-op on an empty document', () => {
    const { doc: fixed, fixed: count } = normalizeBulletLeadPunctuation(baseDoc());
    expect(count).toBe(0);
    expect(fixed).toEqual(baseDoc());
  });

  it('does not mutate the input document', () => {
    const doc = baseDoc({
      keyBenefits: [bulletsBlock([{ lead: 'Ролики', text: 'Подають матеріал.' }])],
    });
    const before = structuredClone(doc);
    normalizeBulletLeadPunctuation(doc);
    expect(doc).toEqual(before);
  });
});
