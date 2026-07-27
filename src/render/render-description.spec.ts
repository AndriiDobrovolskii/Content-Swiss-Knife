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
          { lead: 'Змінний лазерний модуль', text: '— потужність підбирається під матеріал.' },
          { lead: 'Чотири робочі модулі', text: '— лазер, ніж, чорнило та перо в одній каретці.' },
          { lead: 'Ротаційна насадка RA2 Pro', text: '— циліндричні предмети до 99 мм.' },
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
        { scenario: 'Сувенірне виробництво:', text: 'гравіювання на дереві та акрилі.' },
        { scenario: 'Текстиль:', text: 'ножовий крій аплікацій і трафаретів.' },
        { scenario: 'Прототипування:', text: 'швидкий розкрій макетів із картону.' },
        { scenario: 'Освіта:', text: 'демонстрація адитивних і субтрактивних методів.' },
      ],
    },
    compatibility: {
      heading: 'Сумісність xTool M1 Ultra',
      blocks: [
        {
          kind: 'bullets',
          items: [
            { lead: 'Матеріали', text: 'деревина, акрил, шкіра, папір.' },
            { lead: 'Платформи', text: 'стільникова платформа, підставка-подовжувач.' },
            { lead: 'Насадки', text: 'RA2 Pro, тримач пера.' },
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
  };
}

/** The same document reduced to the mandatory sections only — no §5, no §6, no figures. */
function minimalDoc(): ProductDescriptionDoc {
  const d = fullDoc();
  delete d.compatibility;
  delete d.packageContents;
  d.figures = [];
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

      <section>
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
      </section>
      <hr>

      <section>
      <h2>Програмне забезпечення</h2>
      <p>xTool Creative Space керує всіма модулями.</p>
      </section>
      <hr>

      <section>
      <h2>Сфери застосування</h2>
      <ul>
      <li><b>Сувенірне виробництво:</b> гравіювання на дереві та акрилі.</li>
      <li><b>Текстиль:</b> ножовий крій аплікацій і трафаретів.</li>
      <li><b>Прототипування:</b> швидкий розкрій макетів із картону.</li>
      <li><b>Освіта:</b> демонстрація адитивних і субтрактивних методів.</li>
      </ul>
      </section>
      <hr>

      <section>
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
      </section>
      <hr>

      <section>
      <h2>Комплект постачання</h2>
      <ul>
      <li>Верстат xTool M1 Ultra</li>
      <li>Ротаційна насадка RA2 Pro</li>
      <li>Очищувач повітря AP2</li>
      </ul>
      </section>
      <hr>

      <section class="specs">
      <h2>Технічні характеристики xTool M1 Ultra</h2>
      <div class="table-responsive"><table>
      <tr><th colspan="2" style="text-align: center; padding: 10px; font-weight: bold;">Лазерний модуль</th></tr>
      <tr><td>Потужність</td><td>20 Вт</td></tr>
      <tr><td>Тип</td><td>діодний</td></tr>
      <tr><th colspan="2" style="text-align: center; padding: 10px; font-weight: bold;">Механіка</th></tr>
      <tr><td>Габарити</td><td>620 × 498 × 178 мм</td></tr>
      <tr><th colspan="2" style="text-align: center; padding: 10px; font-weight: bold;">Безпека</th></tr>
      <tr><td>Сертифікація</td><td>клас 1 (TÜV SÜD)</td></tr>
      </table></div>
      </section>
      <hr>

      <section>
      <h2>Чому купити xTool M1 Ultra в EXPERT3D?</h2>
      <p class="cta">EXPERT3D постачає професійне обладнання з 2012 року.</p>
      </section>"
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
    it('emits one flat table with a colspan header per category and no thead', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const specs = doc.querySelector('section.specs')!;

      expect(specs.querySelectorAll('table')).toHaveLength(1);
      expect(specs.querySelectorAll('thead')).toHaveLength(0);

      const categoryCells = Array.from(specs.querySelectorAll('th[colspan="2"]'));
      expect(categoryCells.map(c => c.textContent)).toEqual(['Лазерний модуль', 'Механіка', 'Безпека']);
    });

    it('preserves row order within and across categories', () => {
      const html = render(fullDoc());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('section.specs tr'));
      expect(rows.map(r => r.textContent)).toEqual([
        'Лазерний модуль',
        'Потужність20 Вт',
        'Типдіодний',
        'Механіка',
        'Габарити620 × 498 × 178 мм',
        'Безпека',
        'Сертифікаціяклас 1 (TÜV SÜD)',
      ]);
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
    it('emits §1 and §2 bare, with no wrapping <section> and no <h2>', () => {
      const html = render(fullDoc());
      const preamble = html.slice(0, html.indexOf('<section>'));
      expect(preamble).toContain('<p>xTool M1 Ultra');
      expect(preamble).toContain('<div class="table-responsive">');
      expect(preamble).not.toContain('<h2');
      expect(preamble).not.toContain('<section');
    });

    it('puts an <hr> between sections but never after the last one', () => {
      for (const d of [fullDoc(), minimalDoc()]) {
        const html = render(d);
        const sections = html.match(/<\/section>/g)!.length;
        const rules = (html.match(/<hr>/g) ?? []).length;
        expect(rules).toBe(sections - 1);
        expect(html.trimEnd().endsWith('</section>')).toBe(true);
      }
    });

    it('omits conditional sections entirely rather than emitting empty ones', () => {
      const html = render(minimalDoc());
      expect(html).not.toContain('Сумісність');
      expect(html).not.toContain('Комплект постачання');
      expect(html).not.toMatch(/<section>\s*<\/section>/);
      expect(html).not.toMatch(/<hr>\s*<hr>/);
      // §3 (1) + §4 + §7 + §9 = 4 sections, so 3 rules.
      expect(html.match(/<\/section>/g)!).toHaveLength(4);
      expect(html.match(/<hr>/g)!).toHaveLength(3);
    });

    it('renders nested subsections as <h3> under their parent <h2>', () => {
      const doc = new DOMParser().parseFromString(render(fullDoc()), 'text/html');
      const first = doc.querySelectorAll('section')[0];
      expect(first.querySelector('h2')!.textContent).toBe('Технологія обробки');
      expect(Array.from(first.querySelectorAll('h3')).map(h => h.textContent)).toEqual([
        'Діодний лазер до 20 Вт',
      ]);
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

  it('rejects nesting deeper than two levels', () => {
    const d = fullDoc();
    const deep = d.functionality[0].subsections![0] as Subsection;
    deep.subsections = [{ heading: 'Too deep', blocks: [{ kind: 'paragraph', text: 'nope' }] }];
    expect(ProductDescriptionDocSchema.safeParse(d).success).toBe(false);
  });

  it('rejects prose carrying any tag other than <b>', () => {
    const d = fullDoc();
    d.hook = 'Ось <i>курсив</i>.';
    const result = ProductDescriptionDocSchema.safeParse(d);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error!.issues)).toContain('only <b> tags');
  });
});
