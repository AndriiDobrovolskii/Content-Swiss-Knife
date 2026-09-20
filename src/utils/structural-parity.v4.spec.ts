/**
 * structural-parity.v4.spec.ts — US-2.1 validation category V11 (FR-20, and residual R9).
 *
 * 🔵 EVERY TEST IN THIS FILE IS GREEN ON ARRIVAL, AND THAT IS THE POINT.
 * `src/utils/structural-parity.ts` is in the plan's *Explicitly NOT modified* list. The file exists
 * because `validateStructuralParity` is the WHOLE enforcement story for the nine translated
 * locales: a `ProductDescriptionDoc` exists only for uk-UA (both `buildPromptADoc` call sites pass
 * `'Ukrainian (uk-UA)'`, and `buildPromptC` translates rendered HTML), so `schemaVersion` and every
 * Zod bound govern exactly one locale. The other nine inherit v4 as HTML SHAPE, policed by tag
 * counts against the master and by nothing else (D7).
 *
 * That makes this a characterization suite with two jobs. First, it states what a v4 master
 * actually asks of a translation — the §2 `<h2>` that appears, the `<table>` that disappears and
 * the bounded `<li>` count — so R7 ("the §2 change shifts three parity counts at once") is a known
 * property rather than a surprise on the first v4 translation run. Second, it records R9.
 *
 * 🔴 R9 — ACCEPTED, ASSERTED, NOT CLOSED. `COUNTED_TAGS` (`structural-parity.ts:33-43`) holds ten
 * tags and includes NEITHER `<ol>` NOR `<ul>`, verified by reading the array in full. A translated
 * locale that reverts §6's v4 `<ol>` to a `<ul>` reproduces every counted tag and passes, while
 * FR-20 asks for v4 structure in every locale. The negative test below records that gap instead of
 * hiding it. DO NOT CLOSE IT BY ADDING THE TWO TAGS TO `COUNTED_TAGS`: that would retroactively
 * fail every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set
 * with no `schemaVersion` to scope against — D7's version-blindness argument, applied to parity.
 */
import { describe, it, expect } from 'vitest';

import { validateStructuralParity } from './structural-parity';

/**
 * A v4 uk-UA master, in the shape `renderDescription` produces for a `'4.0'` document: §2 is one
 * `<h2>` over one `<ul>` with six items and no table, §6 is an `<ol>`, and §7 is the only
 * `<section>` and the only `<hr>`.
 *
 * Hand-written rather than rendered, because parity is a pure function of two HTML strings and
 * `renderDescription` does not produce this shape until T5/T13. Keeping it literal also makes the
 * mutations below readable as the single change each one is.
 */
const V4_MASTER = `<p><b>Ortur H20 20 W</b> — лазерний гравер.</p>

<h2>Ключові характеристики та переваги</h2>
<ul>
<li><b>Потужність лазера: 20 Вт</b> — Ріже фанеру за один прохід.</li>
<li><b>Робоче поле: 400 × 400 мм</b> — Вміщує аркуш A3.</li>
<li><b>Швидкість: 10 000 мм/хв</b> — Скорочує час замовлення.</li>
<li><b>Перевага 1:</b> пояснення номер 1.</li>
<li><b>Перевага 2:</b> пояснення номер 2.</li>
<li><b>Перевага 3:</b> пояснення номер 3.</li>
</ul>

<h2>Як працює лазерний модуль</h2>
<p>Діодний модуль фокусує промінь.</p>

<h2>Що в коробці?</h2>
<ol>
<li>Гравер Ortur H20 20 W</li>
<li>Лазерний модуль 20 Вт</li>
</ol>

<section class="specs">
<h2>Технічні характеристики</h2>
<h3>Лазерний модуль</h3>
<div class="table-responsive"><table><tbody><tr><td>Потужність</td><td>20 Вт</td></tr></tbody></table></div>
</section>
<hr>

<h2>Чому варто купити Ortur H20 20 W в EXPERT3D?</h2>
<p class="cta">EXPERT3D постачає обладнання з 2012 року.</p>`;

/** The same document, translated into Polish with every counted tag reproduced exactly. */
const FAITHFUL_PL = V4_MASTER
  .replace('лазерний гравер', 'grawerka laserowa')
  .replace('Ключові характеристики та переваги', 'Kluczowe parametry i zalety')
  .replace('Як працює лазерний модуль', 'Jak działa moduł laserowy')
  .replace('Що в коробці?', 'Co jest w pudełku?')
  .replace('Технічні характеристики', 'Dane techniczne');

const rulesFired = (translated: string) =>
  validateStructuralParity(V4_MASTER, translated, 'HTML (PL)').map(i => i.rule);

const countIssues = (translated: string, tag: string) =>
  validateStructuralParity(V4_MASTER, translated, 'HTML (PL)')
    .filter(i => i.rule === 'structural-parity-count' && i.detail.includes(tag));

describe('V11 / FR-20 — a faithful v4 translation passes', () => {
  it('reports nothing when only the prose changed', () => {
    expect(validateStructuralParity(V4_MASTER, FAITHFUL_PL, 'HTML (PL)')).toEqual([]);
  });
});

describe('V11 / FR-20 — the three counts the v4 §2 shifts, each caught on its own', () => {
  /**
   * R7. A v4 master gains an `<h2>`, loses a `<table>` and carries a bounded `<li>` count, all at
   * once. A translation that reproduces two of the three fails loudly — which is the desired
   * behaviour, and the reason D7 needs no validator rule for the nine locales.
   */
  it('flags a translation that drops the §2 <h2>', () => {
    const dropped = FAITHFUL_PL.replace('<h2>Kluczowe parametry i zalety</h2>\n', '');
    expect(countIssues(dropped, '<h2>')).toHaveLength(1);
  });

  it('flags a translation that re-adds a §2 <table>', () => {
    const regressed = FAITHFUL_PL.replace(
      '<ul>',
      '<div class="table-responsive"><table><tbody><tr><td>Moc</td><td>20 W</td></tr></tbody></table></div>\n<ul>',
    );
    expect(countIssues(regressed, '<table>')).toHaveLength(1);
  });

  /** The FR-17 ceiling is inherited by the nine locales through `<li>` parity and nothing else. */
  it('flags a translation that changes the §2 <li> count', () => {
    const padded = FAITHFUL_PL.replace('</ul>', '<li><b>Zaleta 4:</b> dodatkowa.</li>\n</ul>');
    expect(countIssues(padded, '<li>')).toHaveLength(1);
  });

  it('flags a translation that merges two §3 groups into one', () => {
    const merged = FAITHFUL_PL.replace('<h2>Jak działa moduł laserowy</h2>\n', '');
    expect(rulesFired(merged)).toContain('structural-parity-count');
  });
});

describe('R9 — the §6 list element is INVISIBLE to structural parity, in both directions', () => {
  /**
   * 🔴 THIS TEST PASSING IS THE GAP, NOT THE FIX. FR-20 requires v4 structure in every locale, and
   * a translation that reverts the `<ol>` to a `<ul>` is not v4 — but `COUNTED_TAGS` counts
   * `<li>`, not its container, so every counted tag still matches and parity reports nothing.
   * Recorded here so the residual is a stated property of the system with a test naming it, rather
   * than an assumption a reader has to reconstruct.
   */
  it('does NOT flag a translation that renders §6 as a <ul> instead of an <ol>', () => {
    const reverted = FAITHFUL_PL.replace('<ol>', '<ul>').replace('</ol>', '</ul>');
    expect(reverted).not.toBe(FAITHFUL_PL);
    expect(validateStructuralParity(V4_MASTER, reverted, 'HTML (PL)')).toEqual([]);
  });

  it('does not flag the reverse either — a `3.0`-shaped master against a v4 `<ol>` translation', () => {
    const v3Master = V4_MASTER.replace('<ol>', '<ul>').replace('</ol>', '</ul>');
    expect(validateStructuralParity(v3Master, FAITHFUL_PL, 'HTML (PL)')).toEqual([]);
  });

  /** The direct statement of the residual: neither container is in the counted set. */
  it('counts <li> but neither of its containers', () => {
    const noContainers = FAITHFUL_PL.replace('<ol>\n', '').replace('</ol>', '');
    const issues = validateStructuralParity(V4_MASTER, noContainers, 'HTML (PL)');
    expect(issues.filter(i => i.detail.includes('<ol>'))).toHaveLength(0);
    expect(issues.filter(i => i.detail.includes('<ul>'))).toHaveLength(0);
  });
});
