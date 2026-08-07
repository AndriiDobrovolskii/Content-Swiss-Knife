import { describe, it, expect } from 'vitest';
import { renderDescription, type RenderContext } from './render-description';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import type { ProductDescriptionDoc, Subsection } from '../domain/description-doc';
import { getKillerSpecsHeaders } from '../prompt-core/constants';

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'xtool',
  modelFolder: 'm1-ultra',
};

/**
 * Fully-populated uk-UA document: 3 figures, 3 spec categories, a nested <h3>, and both
 * conditional sections present. Shared by the snapshot and most structural assertions.
 */
function fullDoc(): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'xTool M1 Ultra',
    hook: 'xTool M1 Ultra — це багатофункціональний верстат для художньо-ремісничого виробництва.',
    killerSpecs: [
      { label: 'Потужність лазера', value: '20 Вт', why: 'Ріже деревину за один прохід.' },
      { label: 'Точність', value: '0,02 мм', why: 'Дозволяє поєднувати друк і різання.' },
      { label: 'Швидкість', value: '400 мм/с', why: 'Скорочує час серійного замовлення.' },
    ],
    keyBenefits: [
      {
        kind: 'bullets',
        items: [
          { lead: 'Змінний лазерний модуль', text: ' — потужність підбирається під матеріал.' },
          { lead: 'Чотири робочі модулі', text: ' — лазер, ніж, чорнило та перо в одній каретці.' },
          { lead: 'Ротаційна насадка RA2 Pro', text: ' — циліндричні предмети до 99 мм.' },
        ],
      },
    ],
    functionality: [
      {
        heading: 'Технологія обробки',
        blocks: [
          { kind: 'paragraph', text: 'В основі лежить принцип швидкої заміни робочого модуля.' },
          { kind: 'figure', ref: 0 },
        ],
        subsections: [
          {
            heading: 'Діодний лазер до 20 Вт',
            blocks: [
              { kind: 'paragraph', text: 'Змінна лазерна голівка фокусується в точку.' },
              { kind: 'figure', ref: 1 },
            ],
          },
        ],
      },
      {
        heading: 'Програмне забезпечення',
        blocks: [{ kind: 'paragraph', text: 'xTool Creative Space керує всіма модулями.' }],
      },
    ],
    applications: {
      heading: 'Сфери застосування',
      items: [
        { scenario: 'Сувенірне виробництво:', text: ' гравіювання на дереві та акрилі.' },
        { scenario: 'Текстиль:', text: ' ножовий крій аплікацій і трафаретів.' },
        { scenario: 'Прототипування:', text: ' швидкий розкрій макетів із картону.' },
        { scenario: 'Освіта:', text: ' демонстрація адитивних і субтрактивних методів.' },
      ],
    },
    compatibility: {
      heading: 'Сумісність xTool M1 Ultra',
      blocks: [
        {
          kind: 'bullets',
          items: [
            { lead: 'Матеріали', text: ' деревина, акрил, шкіра, папір.' },
            { lead: 'Платформи', text: ' стільникова платформа, підставка-подовжувач.' },
            { lead: 'Насадки', text: ' RA2 Pro, тримач пера.' },
          ],
        },
        { kind: 'figure', ref: 2 },
      ],
    },
    packageContents: {
      heading: 'Комплект постачання',
      items: ['Верстат xTool M1 Ultra', 'Ротаційна насадка RA2 Pro', 'Очищувач повітря AP2'],
    },
    specs: {
      heading: 'Технічні характеристики xTool M1 Ultra',
      categories: [
        {
          title: 'Лазерний модуль',
          rows: [
            { label: 'Потужність', value: '20 Вт' },
            { label: 'Тип', value: 'діодний' },
          ],
        },
        {
          title: 'Механіка',
          rows: [{ label: 'Габарити', value: '620 × 498 × 178 мм' }],
        },
        {
          title: 'Безпека',
          rows: [{ label: 'Сертифікація', value: 'клас 1 (TÜV SÜD)' }],
        },
      ],
    },
    cta: {
      heading: 'Чому купити xTool M1 Ultra в EXPERT3D?',
      text: 'EXPERT3D постачає професійне обладнання з 2012 року.',
    },
    figures: [
      { file: 'craft-machine.jpg', alt: 'Порівняльна таблиця функцій', caption: '<b>Порівняння:</b> лазер 20 Вт.' },
      { file: 'capabilities.jpg', alt: 'Схема модульного пристрою', caption: '<b>Модульність:</b> один корпус.' },
      { file: 'combo-pack.jpg', alt: 'Комплект верстата', caption: '<b>Комплект:</b> насадка та модуль.' },
    ],
    videos: [],
  };
}

/** fullDoc plus a video embed referenced from §3. */
function docWithVideo(): ProductDescriptionDoc {
  const d = fullDoc();
  d.videos = [
    {
      src: 'https://www.youtube.com/embed/s7orBhLydgI',
      title: 'Ortur H20 20 W Overview',
      caption: '<b>Відеоогляд:</b> xTool M1 Ultra у роботі.',
    },
  ];
  d.functionality[1].blocks.push({ kind: 'video', ref: 0 });
  return d;
}

/** The same document reduced to the mandatory sections only — no §5, no §6, no figures. */
function minimalDoc(): ProductDescriptionDoc {
  const d = fullDoc();
  delete d.compatibility;
  delete d.packageContents;
  d.figures = [];
  d.videos = [];
  d.functionality = [
    { heading: 'Технологія обробки', blocks: [{ kind: 'paragraph', text: 'Один абзац без ілюстрацій.' }] },
  ];
  return d;
}

const render = (d: ProductDescriptionDoc, ctx: RenderContext = CTX) => renderDescription(d, ctx);

describe('renderDescription', () => {
  it('renders a fully-populated document to the production HTML shape', () => {
    expect(render(fullDoc())).toMatchInlineSnapshot(`
      "<p>xTool M1 Ultra — це багатофункціональний верстат для художньо-ремісничого виробництва.</p>

      <div class="table-responsive"><table>
      <thead><tr><th>Параметр</th><th>Ваша перевага</th></tr></thead>
      <tbody>
      <tr><td>Потужність лазера: 20 Вт</td><td>Ріже деревину за один прохід.</td></tr>
      <tr><td>Точність: 0,02 мм</td><td>Дозволяє поєднувати друк і різання.</td></tr>
      <tr><td>Швидкість: 400 мм/с</td><td>Скорочує час серійного замовлення.</td></tr>
      </tbody>
      </table></div>

      <ul>
      <li><b>Змінний лазерний модуль</b> — потужність підбирається під матеріал.</li>
      <li><b>Чотири робочі модулі</b> — лазер, ніж, чорнило та перо в одній каретці.</li>
      <li><b>Ротаційна насадка RA2 Pro</b> — циліндричні предмети до 99 мм.</li>
      </ul>

      <h2>Технологія обробки</h2>
      <p>В основі лежить принцип швидкої заміни робочого модуля.</p>
      <figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">
      <img src="https://impresora-3d.es/image/catalog/products/xtool/m1-ultra/craft-machine.jpg" alt="Порівняльна таблиця функцій" decoding="async" style="max-width: 100%; height: auto; display: block;">
      <figcaption style="text-align: left;"><b>Порівняння:</b> лазер 20 Вт.</figcaption>
      </figure>

      <h3>Діодний лазер до 20 Вт</h3>
      <p>Змінна лазерна голівка фокусується в точку.</p>
      <figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">
      <img src="https://impresora-3d.es/image/catalog/products/xtool/m1-ultra/capabilities.jpg" alt="Схема модульного пристрою" loading="lazy" decoding="async" style="max-width: 100%; height: auto; display: block;">
      <figcaption style="text-align: left;"><b>Модульність:</b> один корпус.</figcaption>
      </figure>

      <h2>Програмне забезпечення</h2>
      <p>xTool Creative Space керує всіма модулями.</p>

      <h2>Сфери застосування</h2>
      <ul>
      <li><b>Сувенірне виробництво:</b> гравіювання на дереві та акрилі.</li>
      <li><b>Текстиль:</b> ножовий крій аплікацій і трафаретів.</li>
      <li><b>Прототипування:</b> швидкий розкрій макетів із картону.</li>
      <li><b>Освіта:</b> демонстрація адитивних і субтрактивних методів.</li>
      </ul>

      <h2>Сумісність xTool M1 Ultra</h2>
      <ul>
      <li><b>Матеріали</b> деревина, акрил, шкіра, папір.</li>
      <li><b>Платформи</b> стільникова платформа, підставка-подовжувач.</li>
      <li><b>Насадки</b> RA2 Pro, тримач пера.</li>
      </ul>
      <figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">
      <img src="https://impresora-3d.es/image/catalog/products/xtool/m1-ultra/combo-pack.jpg" alt="Комплект верстата" loading="lazy" decoding="async" style="max-width: 100%; height: auto; display: block;">
      <figcaption style="text-align: left;"><b>Комплект:</b> насадка та модуль.</figcaption>
      </figure>

      <h2>Комплект постачання</h2>
      <ul>
      <li>Верстат xTool M1 Ultra</li>
      <li>Ротаційна насадка RA2 Pro</li>
      <li>Очищувач повітря AP2</li>
      </ul>

      <section class="specs">
      <h2>Технічні характеристики xTool M1 Ultra</h2>
      <!-- ЛАЗЕРНИЙ МОДУЛЬ -->
      <h3>Лазерний модуль</h3>
      <div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">
      <thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>
      <tbody>
      <tr><td>Потужність</td><td>20 Вт</td></tr>
      <tr><td>Тип</td><td>діодний</td></tr>
      </tbody>
      </table></div>
      <!-- МЕХАНІКА -->
      <h3>Механіка</h3>
      <div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">
      <thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>
      <tbody>
      <tr><td>Габарити</td><td>620 × 498 × 178 мм</td></tr>
      </tbody>
      </table></div>
      <!-- БЕЗПЕКА -->
      <h3>Безпека</h3>
      <div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">
      <thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>
      <tbody>
      <tr><td>Сертифікація</td><td>клас 1 (TÜV SÜD)</td></tr>
      </tbody>
      </table></div>
      </section>
      <hr>

      <h2>Чому купити xTool M1 Ultra в EXPERT3D?</h2>
      <p class="cta">EXPERT3D постачає професійне обладнання з 2012 року.</p>"
    `);
  });

  describe('§2 killer specs', () => {
    it('collapses to two columns with "label: value" in the first cell', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const table = doc.querySelector('table')!;

      expect(table.querySelectorAll('thead th')).toHaveLength(2);
      const firstRow = table.querySelectorAll('tbody tr')[0].querySelectorAll('td');
      expect(firstRow).toHaveLength(2);
      expect(firstRow[0].textContent).toBe('Потужність лазера: 20 Вт');
    });

    it('uses the locale header pair from getKillerSpecsHeaders', () => {
      const html = render(fullDoc());
      const [param, benefit] = getKillerSpecsHeaders('uk-UA', '')!;
      expect(html).toContain(`<thead><tr><th>${param}</th><th>${benefit}</th></tr></thead>`);
      expect(param).toBe('Параметр');
      expect(benefit).toBe('Ваша перевага');
    });

    it('applies the Center 3D Print header override when storeName selects it', () => {
      const html = render(fullDoc(), { ...CTX, storeName: 'Center 3D Print' });
      expect(html).toContain('<th>Параметр</th><th>Практична користь</th>');
      expect(html).not.toContain('Ваша перевага');
    });

    it('falls back to the en-GB pair for a locale with no entry', () => {
      const html = render({ ...fullDoc(), locale: 'fr-FR' });
      expect(html).toContain('<th>Parameter</th><th>Your Advantage</th>');
    });
  });

  describe('§7 technical specifications', () => {
    it('emits one <h3> + one themed table per category', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const specs = doc.querySelector('section.specs')!;

      expect(Array.from(specs.querySelectorAll('h3')).map(h => h.textContent))
        .toEqual(['Лазерний модуль', 'Механіка', 'Безпека']);

      const tables = Array.from(specs.querySelectorAll('table'));
      expect(tables).toHaveLength(3);
      for (const table of tables) {
        expect(table.getAttribute('class')).toBe('table table-bordered table-striped');
        expect(table.getAttribute('style')).toBe('table-layout: fixed;');
      }
      // The colspan category-header row is gone with the flattener it belonged to.
      expect(specs.querySelectorAll('th[colspan="2"]')).toHaveLength(0);
    });

    it('heads every table with two <td><b>…</b></td> cells, localized, first at 45%', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const specs = doc.querySelector('section.specs')!;

      const heads = Array.from(specs.querySelectorAll('thead tr'));
      expect(heads).toHaveLength(3);
      for (const row of heads) {
        const cells = Array.from(row.querySelectorAll('td'));
        expect(cells.map(c => c.textContent)).toEqual(['Параметр', 'Значення']);
        expect(cells.map(c => c.firstElementChild?.tagName)).toEqual(['B', 'B']);
        expect(cells[0].getAttribute('style')).toBe('width: 45%;');
      }
      // <th> is deliberately not used here — see table-finalize.ts's const doc-comment.
      expect(specs.querySelectorAll('th')).toHaveLength(0);
    });

    it('falls back to the en-GB column pair for a locale with no entry', () => {
      const html = render({ ...fullDoc(), locale: 'fr-FR' });
      expect(html).toContain('<td style="width: 45%;"><b>Parameter</b></td><td><b>Value</b></td>');
    });

    it('preserves row order within and across categories', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('section.specs tbody tr'));
      expect(rows.map(r => r.textContent)).toEqual([
        'Потужність20 Вт',
        'Типдіодний',
        'Габарити620 × 498 × 178 мм',
        'Сертифікаціяклас 1 (TÜV SÜD)',
      ]);
    });

    it('renders a multi-valued parameter comma-joined in one cell, not as a nested list', () => {
      const doc = fullDoc();
      doc.specs.categories[0].rows.push({ label: 'Формати', value: ['.las', '.ply'] });
      const rendered = render(doc);
      expect(rendered).toContain('<td>Формати</td><td>.las, .ply</td>');
      expect(rendered).not.toMatch(/<section class="specs">[\s\S]*<ul>[\s\S]*<\/section>/);
    });

    it('marks each category with an uppercase HTML comment', () => {
      expect(render(fullDoc())).toContain('<!-- ЛАЗЕРНИЙ МОДУЛЬ -->');
    });
  });

  describe('invariants that the old validators had to check', () => {
    it('never emits <h1> (duplicate-h1 cannot fire)', () => {
      expect(render(fullDoc())).not.toMatch(/<h1\b/i);
      expect(render(minimalDoc())).not.toMatch(/<h1\b/i);
    });

    it('gives every <figure> a <figcaption> (figure-missing-figcaption cannot fire)', () => {
      const doc = new DOMParser().parseFromString(render(fullDoc()), 'text/html');
      const figures = Array.from(doc.querySelectorAll('figure'));
      expect(figures).toHaveLength(3);
      for (const fig of figures) {
        expect(fig.querySelector('figcaption')).not.toBeNull();
      }
    });

    it('leaves the first image eager and lazies the rest (lcp-image-lazy / image-not-lazy cannot fire)', () => {
      const doc = new DOMParser().parseFromString(render(fullDoc()), 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img'));
      expect(imgs).toHaveLength(3);
      expect(imgs[0].hasAttribute('loading')).toBe(false);
      expect(imgs.slice(1).every(i => i.getAttribute('loading') === 'lazy')).toBe(true);
      expect(imgs.every(i => i.getAttribute('decoding') === 'async')).toBe(true);
    });

    it('keys the lazy rule off document position, not off the figure ref', () => {
      // The first figure to appear in the document references figures[2], not figures[0].
      const d = fullDoc();
      (d.functionality[0].blocks[1] as { kind: 'figure'; ref: number }).ref = 2;
      (d.compatibility!.blocks[1] as { kind: 'figure'; ref: number }).ref = 0;

      const html = render(d);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img'));

      expect(imgs[0].getAttribute('src')).toContain('combo-pack.jpg'); // figures[2], rendered first
      expect(imgs[0].hasAttribute('loading')).toBe(false);
      expect(imgs.slice(1).every(i => i.getAttribute('loading') === 'lazy')).toBe(true);
    });

    it('builds src without a stray slash when brand/model folders are absent', () => {
      const html = render(fullDoc(), { imageBaseUrl: 'https://example.com/img/' });
      expect(html).toContain('src="https://example.com/img/craft-machine.jpg"');
      expect(html).not.toContain('//craft-machine.jpg');
    });
  });

  describe('section and <hr> placement', () => {
    // These encode the PR-2 corpus finding: production emits NO <section> except section.specs,
    // and exactly one <hr>. Verified against the accepted Center 3D Print / EXPERT3D Ortur exports.
    it('emits §1 and §2 bare, with no wrapping <section> and no <h2>', () => {
      const html = render(fullDoc());
      const preamble = html.slice(0, html.indexOf('<h2'));
      expect(preamble).toContain('<p>xTool M1 Ultra');
      expect(preamble).toContain('<div class="table-responsive">');
      expect(preamble).not.toContain('<h2');
      expect(preamble).not.toContain('<section');
    });

    it('emits exactly one <section>, and it is section.specs', () => {
      for (const d of [fullDoc(), minimalDoc(), docWithVideo()]) {
        const html = render(d);
        expect(html.match(/<section\b/g)!).toHaveLength(1);
        expect(html.match(/<\/section>/g)!).toHaveLength(1);
        expect(html).toContain('<section class="specs">');
      }
    });

    it('emits exactly one <hr>, immediately after </section>', () => {
      for (const d of [fullDoc(), minimalDoc(), docWithVideo()]) {
        const html = render(d);
        expect(html.match(/<hr>/g)!).toHaveLength(1);
        expect(html).toContain('</section>\n<hr>');
      }
    });

    it('wraps §3–§6 and §9 as bare <h2> groups, never in a <section>', () => {
      const doc = new DOMParser().parseFromString(render(fullDoc()), 'text/html');
      const headings = Array.from(doc.querySelectorAll('h2'));
      // Only §7's <h2> lives inside a section; every other <h2> is top-level.
      const inSection = headings.filter(h => h.closest('section'));
      expect(inSection).toHaveLength(1);
      expect(inSection[0].textContent).toBe('Технічні характеристики xTool M1 Ultra');
    });

    it('ends on the §9 CTA, not on the specs section', () => {
      const html = render(fullDoc()).trimEnd();
      expect(html.endsWith('</p>')).toBe(true);
      expect(html).toContain('<p class="cta">');
    });

    it('omits conditional sections entirely rather than emitting empty ones', () => {
      const html = render(minimalDoc());
      expect(html).not.toContain('Сумісність');
      expect(html).not.toContain('Комплект постачання');
      expect(html).not.toMatch(/<h2><\/h2>/);
      expect(html).not.toMatch(/<ul>\s*<\/ul>/);
      expect(html).not.toMatch(/<hr>\s*<hr>/);
    });

    it('renders nested subsections as <h3> after their parent <h2>', () => {
      // With no <section> wrappers left, heading order is the only structure — assert on the
      // document-order sequence rather than on containment.
      const doc = new DOMParser().parseFromString(render(fullDoc()), 'text/html');
      const headings = Array.from(doc.querySelectorAll('h2, h3')).map(h => `${h.tagName}:${h.textContent}`);
      expect(headings.slice(0, 3)).toEqual([
        'H2:Технологія обробки',
        'H3:Діодний лазер до 20 Вт',
        'H2:Програмне забезпечення',
      ]);
    });
  });

  describe('video embeds', () => {
    it('renders the exact figure/iframe/figcaption shape from the real artifact', () => {
      expect(render(docWithVideo())).toContain(
        '<figure style="width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;">' +
          '<iframe src="https://www.youtube.com/embed/s7orBhLydgI?rel=0" ' +
          'style="width: 100%; height: 100%; border: 0;" title="Ortur H20 20 W Overview" ' +
          'loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; ' +
          'gyroscope; picture-in-picture; web-share" ' +
          'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe>' +
          '<figcaption style="text-align: center; font-size: 14px; color: #666; margin-top: 10px;">' +
          '<b>Відеоогляд:</b> xTool M1 Ultra у роботі.</figcaption></figure>',
      );
    });

    it('emits allowfullscreen as the exact empty-valued literal', () => {
      const html = render(docWithVideo());
      expect(html).toContain('allowfullscreen=""');
      expect(html).not.toContain('allowfullscreen="undefined"');
      expect(html).not.toMatch(/allowfullscreen(?!="")/);
    });

    it('applies ensureRel0 and escapes the resulting & in the src', () => {
      const d = docWithVideo();
      d.videos[0].src = 'https://www.youtube.com/embed/abc?start=30';
      const html = render(d);
      expect(html).toContain('src="https://www.youtube.com/embed/abc?start=30&amp;rel=0"');
      expect(html).not.toContain('start=30&rel=0"');
    });

    it('keeps a video lazy even when it is the first media element on the page', () => {
      const d = minimalDoc(); // no figures, no §5/§6 — the video is the only media element
      d.videos = [{ src: 'https://vimeo.com/x', title: 'T', caption: 'C' }];
      d.functionality[0].blocks = [{ kind: 'video', ref: 0 }];
      const html = render(d);
      expect(html.match(/<iframe\b[^>]*>/g)![0]).toContain('loading="lazy"');
      expect(html).not.toContain('<img');
    });

    it('escapes a title containing a double quote instead of breaking the attribute', () => {
      const d = docWithVideo();
      d.videos[0].title = 'He said "go"';
      const html = render(d);
      expect(html).toContain('title="He said &quot;go&quot;"');
      expect(html).not.toContain('title="He said "go""');
    });

    it('indexes videos independently of figures', () => {
      // 3 figures and 1 video coexist; the video ref 0 must not collide with figures[0].
      const html = render(docWithVideo());
      expect(html.match(/<img\b/g)!).toHaveLength(3);
      expect(html.match(/<iframe\b/g)!).toHaveLength(1);
      expect(html).toContain('craft-machine.jpg');
    });
  });

  describe('escaping', () => {
    it('escapes markup in non-prose fields', () => {
      const d = fullDoc();
      d.specs.categories[0].rows[0].label = '<script>alert(1)</script>';
      const html = render(d);
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<script>');
    });

    it('keeps <b> live in prose fields', () => {
      const d = fullDoc();
      d.hook = 'Ось <b>жирний</b> текст.';
      expect(render(d)).toContain('<p>Ось <b>жирний</b> текст.</p>');
    });

    it('neutralizes markup smuggled inside a <b> in prose', () => {
      const d = fullDoc();
      d.hook = '<b><script>alert(1)</script></b>';
      const html = render(d);
      expect(html).toContain('<p><b>&lt;script&gt;alert(1)&lt;/script&gt;</b></p>');
      expect(html).not.toContain('<script>');
    });

    it('never re-admits a <b> carrying attributes', () => {
      const d = fullDoc();
      d.hook = '<b onclick="steal()">x</b>';
      const html = render(d);
      // The opening tag stays escaped, so the handler can never execute. The bare closing tag is
      // re-admitted independently, leaving an inert orphan </b> — see prose()'s ACCEPTED EDGE CASE.
      expect(html).toContain('<p>&lt;b onclick=&quot;steal()&quot;&gt;x</b></p>');
      expect(html).not.toContain('onclick="steal()"');
      expect(html).not.toMatch(/<b\s+onclick/);
    });

    it('escapes quotes in attribute values', () => {
      const d = fullDoc();
      d.figures[0].alt = 'a "quoted" alt';
      expect(render(d)).toContain('alt="a &quot;quoted&quot; alt"');
    });
  });
});

describe('ProductDescriptionDocSchema', () => {
  it('accepts the fully-populated fixture', () => {
    const result = ProductDescriptionDocSchema.safeParse(fullDoc());
    expect(result.success).toBe(true);
  });

  it('accepts the minimal fixture', () => {
    expect(ProductDescriptionDocSchema.safeParse(minimalDoc()).success).toBe(true);
  });

  it('rejects a figure that is never referenced', () => {
    const d = fullDoc();
    d.figures.push({ file: 'orphan.jpg', alt: 'orphan', caption: 'orphan' });
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error!.issues)).toContain('referenced exactly once');
  });

  it('rejects a figure referenced twice', () => {
    const d = fullDoc();
    (d.compatibility!.blocks[1] as { kind: 'figure'; ref: number }).ref = 0;
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error!.issues)).toContain('referenced exactly once');
  });

  it('counts refs nested inside a subsection', () => {
    // figures[1] is referenced ONLY from a nested subsection. A walker that skipped
    // `subsections` would report it as unreferenced and reject a valid document.
    expect(ProductDescriptionDocSchema.safeParse(fullDoc()).success).toBe(true);
  });

  it('accepts a doc carrying both figures and videos', () => {
    expect(ProductDescriptionDocSchema.safeParse(docWithVideo()).success).toBe(true);
  });

  it('rejects a video that is never referenced', () => {
    const d = fullDoc();
    d.videos.push({ src: 'https://youtu.be/x', title: 'T', caption: 'C' });
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error!.issues)).toContain('Every video must be referenced exactly once');
  });

  it('rejects a video referenced twice', () => {
    const d = docWithVideo();
    d.functionality[0].blocks.push({ kind: 'video', ref: 0 });
    expect(ProductDescriptionDocSchema.safeParse(d).success).toBe(false);
  });

  it('does not let a video ref satisfy a figure slot', () => {
    // The guard against a shared ref counter: one figure in the manifest, referenced only by a
    // {kind:'video'} block. A combined count would see 1 ref for 1 figure and wrongly pass.
    const d = minimalDoc();
    d.figures = [{ file: 'a.jpg', alt: 'A', caption: 'A' }];
    d.videos = [];
    d.functionality[0].blocks = [
      { kind: 'paragraph', text: 'Текст.' },
      { kind: 'video', ref: 0 },
    ];
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    const issues = JSON.stringify(result.error!.issues);
    expect(issues).toContain('Every figure must be referenced exactly once');
    expect(issues).toContain('Every video must be referenced exactly once');
  });

  it('rejects nesting deeper than two levels', () => {
    const d = fullDoc();
    const deep = d.functionality[0].subsections![0] as Subsection;
    deep.subsections = [{ heading: 'Too deep', blocks: [{ kind: 'paragraph', text: 'nope' }] }];
    expect(ProductDescriptionDocSchema.safeParse(d).success).toBe(false);
  });

  it('rejects prose carrying any tag other than <b> or <strong>', () => {
    const d = fullDoc();
    d.hook = 'Ось <i>курсив</i>.';
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error!.issues)).toContain('only <b> and <strong> tags');
  });
});

describe('§4 applications — blocks between the heading and the list', () => {
  // Both committed corpus artifacts carry a lead-in paragraph and a figure between <h2> and <ul>
  // in §4. The model had no slot for them, so reconciliation could not pass on either item — gap
  // §5.5 of render-reconciliation.report.md, deferred there until a corpus item confirmed the
  // shape. Two now do, from two different stores.
  function docWithApplicationFigure(): ProductDescriptionDoc {
    const doc = fullDoc();
    doc.figures.push({ file: 'use-cases.jpg', alt: 'Приклади виробів', caption: '<b>Приклади:</b> дерево, акрил.' });
    doc.applications.blocks = [
      { kind: 'paragraph', text: 'Верстат охоплює творчі та комерційні сценарії.' },
      { kind: 'figure', ref: doc.figures.length - 1 },
    ];
    return doc;
  }

  it('places the blocks after <h2> and before <ul>', () => {
    const html = renderDescription(docWithApplicationFigure(), CTX);
    const section = html.slice(html.indexOf('<h2>Сфери застосування</h2>'));
    const heading = section.indexOf('<h2>');
    const paragraph = section.indexOf('<p>Верстат охоплює');
    const figure = section.indexOf('<figure');
    const list = section.indexOf('<ul>');
    expect(heading).toBeLessThan(paragraph);
    expect(paragraph).toBeLessThan(figure);
    expect(figure).toBeLessThan(list);
  });

  it('counts an applications figure in DOCUMENT order, so it is lazy', () => {
    // figurePositions() walked keyBenefits, functionality and compatibility only. A figure it
    // never saw resolves to position 0 — the LCP slot — and ships without loading="lazy", which
    // output-validator flags as lcp-image-lazy. Silent until a §4 figure exists; both corpus
    // items have one.
    const html = renderDescription(docWithApplicationFigure(), CTX);
    const applicationFigure = html.slice(html.indexOf('<h2>Сфери застосування</h2>'));
    expect(applicationFigure).toContain('use-cases.jpg');
    expect(applicationFigure.slice(applicationFigure.indexOf('use-cases.jpg') - 200)).toContain('loading="lazy"');
  });

  it('still renders exactly one <ul> in §4', () => {
    // The items list is §4's own mechanism; blocks must not add a competing one.
    const html = renderDescription(docWithApplicationFigure(), CTX);
    // Bounded by the NEXT <h2>, not by the specs section — §5 and §6 sit in between and carry
    // their own lists, which would make this assertion pass or fail for the wrong reason.
    const start = html.indexOf('<h2>Сфери застосування</h2>');
    const nextHeading = html.indexOf('<h2>', start + 1);
    const section = html.slice(start, nextHeading === -1 ? undefined : nextHeading);
    expect((section.match(/<ul>/g) ?? []).length).toBe(1);
  });

  it('renders exactly as before when blocks are absent', () => {
    expect(renderDescription(fullDoc(), CTX)).toBe(renderDescription({ ...fullDoc(), applications: { ...fullDoc().applications } }, CTX));
  });

  describe('schema', () => {
    it('accepts a paragraph and a figure', () => {
      expect(ProductDescriptionDocSchema.safeParse(docWithApplicationFigure()).success).toBe(true);
    });

    it('rejects bullets, which would be a second competing list', () => {
      const doc = docWithApplicationFigure();
      // Cast deliberately: the TYPE already rejects this, which is the stronger guarantee. The
      // runtime gate still has to hold, because a Doc arrives from the model as JSON that no
      // compiler ever saw.
      doc.applications.blocks = [{ kind: 'bullets', items: [
        { lead: 'a', text: 'x' }, { lead: 'b', text: 'y' }, { lead: 'c', text: 'z' },
      ] }] as unknown as ProductDescriptionDoc['applications']['blocks'];
      expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
    });

    it('rejects video, which no artifact shows in §4', () => {
      const doc = docWithApplicationFigure();
      doc.applications.blocks =
        [{ kind: 'video', ref: 0 }] as unknown as ProductDescriptionDoc['applications']['blocks'];
      expect(ProductDescriptionDocSchema.safeParse(doc).success).toBe(false);
    });
  });
});

describe('§7 spec values — a parameter may hold several values', () => {
  // A multi-valued parameter USED to render as a nested <ul> inside the cell. The store's §7
  // template replaced that with a comma-joined string, and master §7 was changed to match, so
  // the array shape survives in the Doc model but flattens on the way out.
  function docWithListValue(): ProductDescriptionDoc {
    const doc = fullDoc();
    doc.specs.categories[0].rows.push({
      label: 'Програмне забезпечення',
      value: ['ORTUR (власний застосунок)', 'Lightburn', 'LaserGRBL'],
    });
    return doc;
  }

  it('renders an array value comma-joined in one cell, with no nested list', () => {
    const html = render(docWithListValue());
    expect(html).toContain(
      '<td>Програмне забезпечення</td><td>ORTUR (власний застосунок), Lightburn, LaserGRBL</td>',
    );
    expect(html).not.toMatch(/<section class="specs">[\s\S]*<ul>[\s\S]*<\/section>/);
  });

  it('still renders a plain string value as plain text', () => {
    expect(render(fullDoc())).toContain('<td>Потужність</td><td>20 Вт</td>');
  });

  it('escapes list entries like any other cell text', () => {
    const doc = fullDoc();
    doc.specs.categories[0].rows.push({ label: 'Формат', value: ['<b>A</b> & B'] });
    expect(render(doc)).toContain('<td>Формат</td><td>&lt;b&gt;A&lt;/b&gt; &amp; B</td>');
  });

  it('accepts both shapes in the schema, and rejects an empty list', () => {
    expect(ProductDescriptionDocSchema.safeParse(docWithListValue()).success).toBe(true);
    const empty = fullDoc();
    empty.specs.categories[0].rows.push({ label: 'Порожньо', value: [] });
    expect(ProductDescriptionDocSchema.safeParse(empty).success).toBe(false);
  });
});

/**
 * PROSE ADMITS <strong> AS WELL AS <b>.
 *
 * The model was wrong, not the artifacts. master-system-prompt.ts §[FORMAT] instructs:
 * "Reserve <strong> for brands / main model / core USPs at a density of 2–3 per 500 characters
 * maximum; use <b> for inline spec scannability." Two distinct tags, deliberately distinguished —
 * and `Prose` admitted only one of them, so an artifact that followed the prompt's own instruction
 * could not be represented.
 *
 * WHY THE FIRST TWO CORPUS ITEMS MISSED IT: both carry ZERO <strong>. A survey of 20 recent
 * exports found 4 that use it (one with 6 instances), so roughly one artifact in five was
 * unrepresentable. This is the clearest case yet for growing the corpus across PRODUCTS rather than
 * stores — the gap was invisible to two artifacts of the same product and surfaced on the first
 * genuinely different one.
 */
describe('Prose — <strong> alongside <b>', () => {
  function docWithStrong(): ProductDescriptionDoc {
    const d = fullDoc();
    d.hook = 'Флагман <strong>Bambu Lab P2S</strong> друкує з <b>0,01 мм</b> точністю.';
    return d;
  }

  it('accepts <strong> in a Prose field', () => {
    expect(ProductDescriptionDocSchema.safeParse(docWithStrong()).success).toBe(true);
  });

  it('emits <strong> live rather than escaping it', () => {
    expect(render(docWithStrong()))
      .toContain('<p>Флагман <strong>Bambu Lab P2S</strong> друкує з <b>0,01 мм</b> точністю.</p>');
  });

  /**
   * The security property that makes re-admitting a tag safe: the pattern has no attribute slot,
   * so only the bare literals come back to life. Widening the allow-list must not widen that.
   */
  it('never re-admits an attribute on <strong>, so no handler can survive', () => {
    const d = fullDoc();
    d.hook = 'x <strong onclick="alert(1)">y</strong> z';
    const html = render(d);

    // The opening tag stays fully escaped — the handler is inert text, not an attribute.
    expect(html).toContain('&lt;strong onclick=&quot;alert(1)&quot;&gt;');
    // No LIVE <strong> carrying anything. The literal string "onclick" survives inside the escaped
    // text, which is the point: it is displayed, not executed.
    expect(html).not.toMatch(/<strong\s[^>]*>/);
    // Same accepted edge case documented on prose(): the closing literal is re-admitted on its own
    // and left as an orphan. An unmatched </strong> is inert in every browser.
    expect(html).toContain('y</strong> z');
  });

  it('still rejects any other tag', () => {
    const d = fullDoc();
    d.hook = 'see <a href="/x">this</a>';
    expect(ProductDescriptionDocSchema.safeParse(d).success).toBe(false);
  });

  it('still rejects <em>, which the prompt does not authorise', () => {
    const d = fullDoc();
    d.hook = 'an <em>emphasis</em> tag';
    expect(ProductDescriptionDocSchema.safeParse(d).success).toBe(false);
  });
});

/**
 * VIDEO TITLE FALLBACK — ported from wrapVideoFigures(), which PR-3 deletes.
 *
 * Under the Doc pipeline the title is model-authored prose: task-a.ts instructs the model to write
 * it in the body language, and it lands in VideoEmbed.title. The schema requires it non-empty, so
 * on the normal path this fallback never fires.
 *
 * It is ported anyway, for the same reason prose() re-escapes what the schema already rejected:
 * defence in depth. An empty title="" on an iframe is an accessibility regression that NO existing
 * check catches — the validator has no rule for it — so the renderer guarantees by construction
 * that one can never ship. `restoreMissingVideos` repairs a dropped embed with no model involved
 * and is the other caller that keeps this alive after wrapVideoFigures dies.
 */
describe('renderVideo — the iframe title can never be empty', () => {
  function docWithVideoTitle(title: string): ProductDescriptionDoc {
    const d = docWithVideo();
    d.videos[0].title = title;
    return d;
  }

  it('uses the model-authored title when there is one', () => {
    expect(render(docWithVideoTitle('Огляд xTool M1 Ultra')))
      .toContain('title="Огляд xTool M1 Ultra"');
  });

  it('falls back to a localized title rather than emitting title=""', () => {
    const html = render(docWithVideoTitle(''));
    expect(html).not.toContain('title=""');
    // uk-UA document → the Ukrainian fallback, built from the localized product name.
    expect(html).toContain('title="Відео: xTool M1 Ultra"');
  });

  it('falls back for a whitespace-only title too', () => {
    expect(render(docWithVideoTitle('   '))).toContain('title="Відео: xTool M1 Ultra"');
  });

  it('picks the fallback language from the document locale, not a hardcoded default', () => {
    const d = docWithVideoTitle('');
    d.locale = 'pl-PL';
    expect(render(d)).toContain('title="Wideo: xTool M1 Ultra"');
  });

  /**
   * The renderer must stay DOM-free so the BFF can share it — see this module's header.
   *
   * video-figure.ts calls `new DOMParser()`, so pulling the fallback from there would have broken
   * that guarantee for the sake of a lookup table. The map lives in video-title.ts instead, and
   * this test is what stops someone "simplifying" the import back.
   */
  it('reaches the fallback without importing anything that touches the DOM', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/render/render-description.ts', 'utf8');

    expect(src).toMatch(/from '\.\.\/utils\/video-title'/);
    expect(src).not.toMatch(/from '\.\.\/utils\/video-figure'/);

    // Comments are stripped first. This file EXPLAINS why it avoids DOMParser, so a naive scan of
    // the raw text matches its own rationale — the check has to look at code, not prose.
    const code = src.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/DOMParser|XMLSerializer|\bdocument\./);
  });
});
