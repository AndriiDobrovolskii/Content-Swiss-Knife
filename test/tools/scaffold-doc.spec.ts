/**
 * scaffold-doc.spec.ts
 *
 * The scaffolder turns an accepted artifact into a DRAFT ProductDescriptionDoc, so growing the
 * reconciliation corpus does not mean hand-typing six 200-line JSON files.
 *
 * WHY THESE TESTS ARE SHAPED THE WAY THEY ARE. A scaffolder that derives the whole Doc from the
 * HTML can make reconciliation pass vacuously: the suite would prove the scaffolder round-trips its
 * own output, not that the renderer reproduces production. The report is explicit that all four
 * renderer corrections so far were "found by hand-authoring rather than by reasoning."
 *
 * So the contract under test is REFUSAL, not coverage. The scaffolder maps only what the Doc model
 * can express exactly, and throws on anything else instead of approximating it. An artifact that
 * the model has no slot for must produce a loud error naming the construct — that is the discovery
 * the corpus exists to generate, and swallowing it would defeat the whole exercise.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSpecs, parseFigures, parseKillerSpecs, scaffoldDoc, TODO } from './scaffold-doc.mjs';

/** Post restyleSpecTables: one <h3> + one themed table per category, all-<td> header row. */
function specCategory(title: string, rows: string): string {
  return (
    `<!-- ${title.toUpperCase()} --><h3>${title}</h3>` +
    `<div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">` +
    `<thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`
  );
}

describe('parseSpecs', () => {
  it('reads a category heading and its data rows', () => {
    const html =
      `<section class="specs"><h2>Технічні характеристики</h2>` +
      specCategory(
        'Корпус та безпека',
        `<tr><td>Матеріал корпусу</td><td>Алюмінієвий сплав</td></tr><tr><td>Дитячий замок</td><td>Так</td></tr>`,
      ) +
      `</section>`;

    expect(parseSpecs(html)).toEqual({
      heading: 'Технічні характеристики',
      categories: [
        {
          title: 'Корпус та безпека',
          rows: [
            { label: 'Матеріал корпусу', value: 'Алюмінієвий сплав' },
            { label: 'Дитячий замок', value: 'Так' },
          ],
        },
      ],
    });
  });

  it('never mistakes the <td><b>…</b></td> header row for a spec row', () => {
    const html =
      `<section class="specs"><h2>Specs</h2>` +
      specCategory('Cat', `<tr><td>a</td><td>1</td></tr>`) +
      `</section>`;
    expect(parseSpecs(html).categories[0].rows).toEqual([{ label: 'a', value: '1' }]);
  });

  it('keeps several categories separate and in document order', () => {
    const html =
      `<section class="specs"><h2>Specs</h2>` +
      specCategory('First', `<tr><td>a</td><td>1</td></tr>`) +
      specCategory('Second', `<tr><td>b</td><td>2</td></tr>`) +
      `</section>`;

    expect(parseSpecs(html).categories.map(c => c.title)).toEqual(['First', 'Second']);
    expect(parseSpecs(html).categories[1].rows).toEqual([{ label: 'b', value: '2' }]);
  });

  /**
   * The store's §7 template replaced the nested <ul> with a comma-joined string, so the cell
   * reads back as one value. Splitting it apart again would be guessing: a comma inside a spec
   * value is prose far more often than it is a separator, and renderSpecs() joins a string[]
   * with ", " anyway, so the string round-trips to identical HTML.
   */
  it('reads a comma-joined multi-value cell as one string rather than guessing a split', () => {
    const html =
      `<section class="specs"><h2>Specs</h2>` +
      specCategory(
        'Зв\'язок',
        `<tr><td>Бездротовий зв'язок</td><td>Підтримка Wi-Fi, Bluetooth: 802.11a/b/g/n/ac, 2.4G Wi-Fi 2412–2472 МГц</td></tr>`,
      ) +
      `</section>`;

    expect(parseSpecs(html).categories[0].rows[0]).toEqual({
      label: "Бездротовий зв'язок",
      value: 'Підтримка Wi-Fi, Bluetooth: 802.11a/b/g/n/ac, 2.4G Wi-Fi 2412–2472 МГц',
    });
  });

  it('throws rather than guessing when a data row is not the expected two cells', () => {
    const html =
      `<section class="specs"><h2>Specs</h2>` +
      specCategory('Cat', `<tr><td>only one cell</td></tr>`) +
      `</section>`;

    expect(() => parseSpecs(html)).toThrow(/1 cell/i);
  });

  it('throws when a data row appears before any category heading', () => {
    const html =
      `<section class="specs"><h2>Specs</h2><div class="table-responsive"><table>` +
      `<tbody><tr><td>orphan</td><td>row</td></tr></tbody></table></div></section>`;

    expect(() => parseSpecs(html)).toThrow(/before any <h3> category/i);
  });

  it('throws when the artifact has no specs section at all', () => {
    expect(() => parseSpecs('<p>no specs here</p>')).toThrow(/section class="specs"/i);
  });
});

describe('parseFigures', () => {
  it('reads file, alt and caption, keeping the <b> lead-in in the caption', () => {
    const html = `<figure style="display: block;">
<img src="https://cdn.example.com/catalog/Products/Ortur/test/laser-module.jpg" alt="Лазерний модуль" decoding="async" style="max-width: 100%;">
<figcaption style="text-align: left;"><b>Гравіює деревину. </b>Лазерна голівка наносить візерунок.</figcaption>
</figure>`;

    expect(parseFigures(html)).toEqual([
      {
        file: 'laser-module.jpg',
        alt: 'Лазерний модуль',
        caption: '<b>Гравіює деревину. </b>Лазерна голівка наносить візерунок.',
      },
    ]);
  });

  it('returns figures in document order', () => {
    const html = `
<figure><img src="http://x/a.jpg" alt="A"><figcaption>one</figcaption></figure>
<figure><img src="http://x/b.jpg" alt="B"><figcaption>two</figcaption></figure>`;

    expect(parseFigures(html).map(f => f.file)).toEqual(['a.jpg', 'b.jpg']);
  });

  /** A video <figure> holds an <iframe>, not an <img> — it belongs to videos[], a separate manifest. */
  it('ignores a video figure', () => {
    const html = `<figure><iframe src="https://youtube.com/embed/x" title="t"></iframe><figcaption>cap</figcaption></figure>`;
    expect(parseFigures(html)).toEqual([]);
  });

  it('throws on an image figure with no figcaption rather than inventing one', () => {
    const html = `<figure><img src="http://x/a.jpg" alt="A"></figure>`;
    expect(() => parseFigures(html)).toThrow(/figcaption/i);
  });

  /**
   * Prose fields admit <b> and nothing else (see the Prose type). Anything richer means the model
   * cannot represent this artifact, which is a finding, not something to strip on the way past.
   */
  it('throws when a caption carries markup the Prose type does not admit', () => {
    const html = `<figure><img src="http://x/a.jpg" alt="A"><figcaption>see <a href="/x">this</a></figcaption></figure>`;
    expect(() => parseFigures(html)).toThrow(/<a>/i);
  });
});

describe('parseKillerSpecs', () => {
  /** table-finalize.ts collapses §2a to `${label}: ${value}` in one cell. This is the inverse. */
  it('splits the collapsed "label: value" cell and keeps the why cell', () => {
    const html = `<div class="table-responsive"><table>
<thead><tr><th>Параметр</th><th>Практична користь</th></tr></thead>
<tbody>
<tr><td>Робоча зона: 420 × 300 мм</td><td>Розміщує заготовки середнього формату.</td></tr>
</tbody>
</table></div>`;

    expect(parseKillerSpecs(html)).toEqual([
      { label: 'Робоча зона', value: '420 × 300 мм', why: 'Розміщує заготовки середнього формату.' },
    ]);
  });

  /**
   * Splitting on the LAST ": " would corrupt a value containing a colon. The label is written by
   * the model as a short noun phrase and the value follows, so the FIRST separator is the real one.
   */
  it('splits on the first separator when the value itself contains a colon', () => {
    const html = `<div class="table-responsive"><table>
<thead><tr><th>P</th><th>B</th></tr></thead>
<tbody><tr><td>Роздільна здатність: 1920: 1080</td><td>why</td></tr></tbody>
</table></div>`;

    expect(parseKillerSpecs(html)[0]).toEqual({
      label: 'Роздільна здатність',
      value: '1920: 1080',
      why: 'why',
    });
  });

  it('throws when the collapsed cell has no separator to split on', () => {
    const html = `<div class="table-responsive"><table>
<thead><tr><th>P</th><th>B</th></tr></thead>
<tbody><tr><td>no separator here</td><td>why</td></tr></tbody>
</table></div>`;

    expect(() => parseKillerSpecs(html)).toThrow(/separator/i);
  });
});

describe('scaffoldDoc', () => {
  const artifact = `<p>Вступний абзац про продукт.</p>

<div class="table-responsive"><table>
<thead><tr><th>Параметр</th><th>Практична користь</th></tr></thead>
<tbody>
<tr><td>Робоча зона: 420 × 300 мм</td><td>Розміщує заготовки.</td></tr>
</tbody>
</table></div>

<ul>
<li><b>Складається швидко. </b>Тришарова конструкція.</li>
</ul>

<h2>Як працює пристрій</h2>
<p>Абзац у розділі.</p>
<figure><img src="http://cdn/x/y/one.jpg" alt="A"><figcaption><b>Підпис. </b>Текст.</figcaption></figure>

<section class="specs">
<h2>Технічні характеристики</h2>
<!-- КАТЕГОРІЯ -->
<h3>Категорія</h3>
<div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">
<thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>
<tbody>
<tr><td>Потужність</td><td>20 Вт</td></tr>
</tbody>
</table></div>
</section>
<hr>`;

  it('derives the mechanical fields without asking the author for anything', () => {
    const doc = scaffoldDoc(artifact, { locale: 'uk-UA' });

    expect(doc.schemaVersion).toBe('3.0');
    expect(doc.locale).toBe('uk-UA');
    expect(doc.hook).toBe('Вступний абзац про продукт.');
    expect(doc.killerSpecs).toHaveLength(1);
    expect(doc.specs.categories[0].title).toBe('Категорія');
    expect(doc.figures).toEqual([{ file: 'one.jpg', alt: 'A', caption: '<b>Підпис. </b>Текст.' }]);
    expect(doc.videos).toEqual([]);
  });

  /**
   * The whole point of the split. Section assignment is where the §4.3 class of error lives —
   * C3D's operating-tips block was mapped onto `compatibility` because no better slot existed, and
   * a tool that guessed would have made that mistake silently and permanently.
   */
  it('leaves every judgment field as a TODO sentinel', () => {
    const doc = scaffoldDoc(artifact, { locale: 'uk-UA' });

    expect(doc.localizedName).toBe(TODO);
    expect(doc.applications.heading).toBe(TODO);
    expect(doc.cta.heading).toBe(TODO);
  });

  /** Within one <h2> group the paragraph/figure interleaving is mechanical — that is the tedium. */
  it('parses the blocks inside an <h2> group, in order, as a functionality subsection', () => {
    const doc = scaffoldDoc(artifact, { locale: 'uk-UA' });

    expect(doc.functionality).toEqual([
      {
        heading: 'Як працює пристрій',
        blocks: [
          { kind: 'paragraph', text: 'Абзац у розділі.' },
          { kind: 'figure', ref: 0 },
        ],
      },
    ]);
  });

  /**
   * An unfinished Doc must fail LOUDLY. A TODO that validated would let a half-authored fixture
   * reconcile by accident, which is precisely the vacuous pass the harness is built to prevent.
   */
  it('produces a document that does not yet validate, so an unfinished draft cannot pass', async () => {
    const { ProductDescriptionDocSchema } = await import('../../src/domain/description-doc.schema');
    const doc = scaffoldDoc(artifact, { locale: 'uk-UA' });

    expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
  });
});

/**
 * Characterization tests, not a TDD cycle — the tool already passed these when first run, and they
 * are here to pin that result.
 *
 * They are the strongest evidence available that the scaffolder is correct. The two Docs it is
 * checked against were authored BY HAND, before this tool existed, and both reconcile against
 * production across all five checks. Independent agreement on every mechanical field — including
 * EXPERT3D's `string[]` spec value, the shape that forced SpecRow to widen — means the scaffolder
 * is reading the artifacts the same way a careful human did, not merely round-tripping itself.
 *
 * If either of these ever fails, the scaffolder has drifted from a known-good reading of a real
 * artifact. Fix the scaffolder, not the fixture.
 */
describe('scaffoldDoc against the real corpus', () => {
  const CORPUS = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'corpus');
  const slugs = ['center-3d-print-ortur-h20-20w', 'expert3d-ortur-h20-20w'];

  describe.each(slugs)('%s', slug => {
    const html = readFileSync(join(CORPUS, `${slug}.uk-UA.html`), 'utf8');
    const authored = JSON.parse(readFileSync(join(CORPUS, `${slug}.doc.json`), 'utf8'));
    const scaffolded = scaffoldDoc(html, { locale: 'uk-UA' });

    // One `it` per field so a failure names the field rather than dumping a 200-line diff.
    it.each(['hook', 'killerSpecs', 'specs', 'figures', 'videos'])(
      'derives %s identically to the hand-authored Doc',
      field => {
        expect(scaffolded[field]).toEqual(authored[field]);
      },
    );
  });
});

/**
 * §C CONSUMABLES ARTIFACTS — report §5 gap 4, and the answer is not the one PR-2 predicted.
 *
 * PR-2 §5.2 predicted that `ProductDescriptionDocSchema` "cleanly rejects" §C1–§C6 artifacts, and
 * the report recorded that as untested because no consumables-mode export existed. One does now:
 * `3ddevice_formlabs__fuse_1__30w_printer_120v_uptime_kit`, a third store and a genuinely different
 * product from the two Ortur H20 items.
 *
 * The prediction turns out to describe the wrong gate. A §C artifact never reaches the schema —
 * it cannot be expressed as a ProductDescriptionDoc in the first place, because the two MANDATORY
 * fields have no source in it:
 *
 *   §2a killerSpecs — no `<thead>` table anywhere; §C has no killer-specs block at all
 *   §7 specs       — no `<section class="specs">`; §C4 "Склад комплекту" is a bare
 *                    `div.table-responsive` sitting inside an <h2> group, which is a position the
 *                    Doc model has no slot for
 *
 * §C also ends its CTA as a bare `<p>` after the `<hr>` with NO `<h2>`, where §9 always has one.
 *
 * So the conclusion stands but the mechanism is different, and stronger: consumables need their own
 * model, not a rejection path through this one. These tests pin that, so the day someone widens the
 * schema to "just accept" a §C artifact, this fails and asks them to think again.
 *
 * Characterization tests — the behaviour was observed before they were written, not driven by them.
 */
describe('§C consumables artifacts cannot be modelled as a ProductDescriptionDoc', () => {
  const html = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      'fixtures',
      'consumables',
      '3ddevice-formlabs-fuse1-uptime-kit.uk-UA.html',
    ),
    'utf8',
  );

  it('has no §7 specs section, which the schema requires', () => {
    expect(() => parseSpecs(html)).toThrow(/section class="specs"/i);
  });

  it('has no §2a killer-specs table, which the schema also requires', () => {
    expect(() => parseKillerSpecs(html)).toThrow(/killer-specs table/i);
  });

  /**
   * §C4 puts its kit-contents table directly inside an <h2> group. The nearest §1–§9 equivalent is
   * §6 packageContents, which is a plain `items: string[]` list — not a table — so this is a real
   * shape difference, not a formatting variant.
   */
  it('refuses at the §C4 kit-contents table rather than coercing it into a Block', () => {
    expect(() => scaffoldDoc(html, { locale: 'uk-UA' })).toThrow(/<div> has no Block kind/i);
  });
});

/**
 * §6-shaped plain lists. Not a model gap — `packageContents.items` is `string[]` and holds these
 * fine — but a scaffolder limitation worth an accurate error, because the section assignment that
 * resolves it is a judgment call this tool deliberately does not make.
 */
describe('parseBullets — a list with no <b> lead-ins', () => {
  const plainList = `<h2>Комплект постачання</h2>
<ul><li>Верстат xTool M1 Ultra</li><li>Ротаційна насадка RA2 Pro</li></ul>`;

  it('names it as §6 package contents rather than blaming a missing lead-in', () => {
    expect(() => scaffoldDoc(plainList, { locale: 'uk-UA' })).toThrow(/§6 package contents/i);
  });

  it('says the assignment belongs to the author, not the tool', () => {
    expect(() => scaffoldDoc(plainList, { locale: 'uk-UA' })).toThrow(/by hand/i);
  });

  /** A genuinely malformed list — some items have a lead-in, one does not — keeps its own error. */
  it('still reports a non-uniform list as the defect it is', () => {
    const mixed = `<h2>G</h2><ul><li><b>Лейбл. </b>Текст.</li><li>Без лейбла</li></ul>`;
    expect(() => scaffoldDoc(mixed, { locale: 'uk-UA' })).toThrow(/siblings do/i);
  });
});
