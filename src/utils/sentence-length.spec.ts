/**
 * sentence-length.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateSentenceLength, validateSentenceLengthDoc, countWords } from './sentence-length';
import { extractBlocks, getBlock } from './block-repair';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const p = (t: string) => `<p>${t}</p>`;
const run = (html: string, locale = 'uk-UA') => validateSentenceLength(html, locale, 'HTML (base)');

/** The real 27-word sentence from the QA pass; uk-UA ceiling is 20. */
const TOO_LONG =
  'Лазерний модуль потужністю 20 Вт підходить як для гравіювання, так і для різання дерева, ' +
  'акрилу та подібних матеріалів, а на нержавіючій сталі відтворює понад 380 відтінків кольору.';

describe('validateSentenceLength', () => {
  it('flags the reported 27-word sentence and quotes it with its count', () => {
    const issues = run(p(TOO_LONG));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('sentence-too-long');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toMatch(/exceeds the uk-UA hard ceiling of 20/);
    expect(issues[0].detail).toContain('380 відтінків кольору');
  });

  it('accepts the two-sentence rewrite of it', () => {
    const fixed =
      'Лазерний модуль потужністю 20 Вт підходить як для гравіювання, так і для різання дерева, ' +
      'акрилу та подібних матеріалів. На нержавіючій сталі він відтворює понад 380 відтінків кольору.';
    expect(run(p(fixed))).toEqual([]);
  });

  it('is a strict >, so a sentence exactly at the ceiling passes', () => {
    const exactly20 = Array.from({ length: 20 }, (_, i) => `слово${i}`).join(' ') + '.';
    expect(countWords(exactly20)).toBe(20);
    expect(run(p(exactly20))).toEqual([]);
    expect(run(p(`${exactly20.slice(0, -1)} іще.`))).toHaveLength(1);
  });

  /**
   * Regression suite for the XGRIDS L2 Pro 23:14 run: 3 of its 9 sentence-too-long warnings were
   * §2b bullets of the form `<li><b>Label:</b> sentence</li>`. A colon is not a sentence
   * terminator, so measuring el.textContent counted label + sentence as ONE sentence:
   *
   *   4 + 19 = 23   |   6 + 15 = 21   |   8 + 14 = 22
   *
   * Every one of the three sentences is under the ceiling on its own. The domain model has always
   * treated these as separate fields — BulletItem { lead, text } in description-doc.ts, rendered
   * by renderBullets as `<b>${lead}</b>${text}`.
   */
  describe('bold lead-in is a label, not part of the sentence', () => {
    const li = (t: string) => `<ul><li>${t}</li></ul>`;

    it('accepts the three real bullets from the run (23, 21 and 22 words with their labels)', () => {
      const bullets = [
        `<b>Миттєва кольорова хмара точок:</b> алгоритм LixelUpSample™ обробляє дані на льоту, ` +
        `тому оператор отримує готовий результат одразу в полі, без окремого етапу камеральної обробки.`,

        `<b>16-канальний LiDAR з діапазоном 0,5–120 м:</b> один прохід охоплює великі об'єкти — ` +
        `від будівельного майданчика до ділянки траси — без додаткових точок стояння.`,

        `<b>Ступінь захисту IP54 та діапазон -20 °C – 50 °C:</b> сканер продовжує роботу на ` +
        `майданчику чи в кар'єрі за пилу, вологи та перепадів температури.`,
      ];
      for (const b of bullets) expect(run(li(b))).toEqual([]);
    });

    it('a lead-in ending in a full stop counts too — the signal is position, not punctuation', () => {
      // Center 3D Print's house style; the space lives inside the <b>.
      const bullet =
        `<b>Складається за лічені хвилини. </b>Тришарова конструкція розкладається без інструментів, ` +
        `а фіксатори утримують раму жорстко навіть на нерівній підлозі майстерні.`;
      expect(run(li(bullet))).toEqual([]);
    });

    it('measures the lead-in itself, so an over-long "label" is still reported', () => {
      const longLead = Array.from({ length: 25 }, (_, i) => `слово${i}`).join(' ');
      const issues = run(li(`<b>${longLead}:</b> коротке речення.`));
      expect(issues).toHaveLength(1);
      expect(issues[0].detail).toContain('слово24');
      // The reported sentence must be the LEAD ALONE. Without this the test also passes on the
      // old behaviour, where lead+sentence were one 27-word blob that happened to contain
      // "слово24" — i.e. it would not discriminate.
      expect(issues[0].detail).not.toContain('коротке речення');
      expect(issues[0].detail).toContain('of 25 words');
    });

    it('bold in the MIDDLE of a sentence splits nothing', () => {
      const withInlineBold = TOO_LONG.replace('гравіювання', '<b>гравіювання</b>');
      expect(run(p(withInlineBold))).toHaveLength(1);
    });

    it('an <li> with no bold lead-in is measured exactly as before', () => {
      expect(run(li(TOO_LONG))).toHaveLength(1);
    });

    it('does not silence the real long paragraphs from the same run', () => {
      const real29 =
        `Обертовий LiDAR, дві панорамні камери та 6DOF IMU працюють як єдина система: ` +
        `алгоритм Multi-SLAM об'єднує їхні дані в реальному часі, тому оператор бачить ` +
        `остаточний результат ще до завершення маршруту.`;
      expect(run(p(real29))).toHaveLength(1);
    });
  });

  describe('sentence splitting hazards', () => {
    it('does not split on an abbreviation followed by a capital', () => {
      const text = 'Комплект містить 500 шт. Наступний етап — калібрування столу.';
      expect(run(p(text))).toEqual([]); // two short sentences, neither over ceiling
    });

    it('does not split inside a decimal number', () => {
      expect(run(p('Товщина 1,75 мм забезпечує стабільну подачу. Допуск 0.05 мм.'))).toEqual([]);
    });

    it('does not split on a lowercase continuation', () => {
      const long = `Цей верстат ${Array.from({ length: 25 }, (_, i) => `слово${i}`).join(' ')} та ін. і далі.`;
      expect(run(p(long))).toHaveLength(1); // one long sentence, not two short ones
    });
  });

  describe('word counting', () => {
    it('merges a unit into the number it follows', () => {
      expect(countWords('Модуль 20 Вт працює.')).toBe(3);
      expect(countWords('Module 20 W runs.')).toBe(3);
    });

    it('merges a dimension chain into one word', () => {
      expect(countWords('Робочий стіл 330 × 330 × 565 мм вміщує великі деталі.')).toBe(6);
    });

    it('does not count bare punctuation as a word', () => {
      expect(countWords('Корпус — закритий.')).toBe(2);
    });

    it('counts a hyphenated compound once', () => {
      expect(countWords('Кварцово-трубчасті нагрівачі гріють.')).toBe(3);
    });
  });

  describe('scope', () => {
    it('ignores spec-table cells, which are not sentences', () => {
      const cell = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<table><tbody><tr><td>${cell}.</td></tr></tbody></table>`)).toEqual([]);
    });

    it('ignores figcaptions', () => {
      const caption = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<figure><figcaption>${caption}.</figcaption></figure>`)).toEqual([]);
    });

    it('ignores everything inside section.specs', () => {
      const long = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<section class="specs"><p>${long}.</p></section>`)).toEqual([]);
    });

    it('checks <li> as well as <p>', () => {
      expect(run(`<ul><li>${TOO_LONG}</li></ul>`)).toHaveLength(1);
    });
  });

  describe('locale bands', () => {
    it('uses the de-DE ceiling of 18', () => {
      const s = Array.from({ length: 19 }, (_, i) => `Wort${i}`).join(' ') + '.';
      expect(run(p(s), 'de-DE')).toHaveLength(1);
      expect(run(p(s), 'es-ES')).toEqual([]); // es-ES ceiling is 27
    });

    it('returns nothing for an unmapped locale rather than guessing', () => {
      expect(run(p(TOO_LONG), 'xx-XX')).toEqual([]);
    });
  });

  it('returns nothing for empty html', () => {
    expect(run('')).toEqual([]);
  });
});

describe('validateSentenceLength — machine-addressable output', () => {
  it('addresses the offending block with a path the block patcher resolves', () => {
    const html = `<h2>Заголовок</h2>${p('Коротке речення.')}${p(TOO_LONG)}`;
    const [issue] = run(html);
    expect(issue.path).toBeDefined();
    // The index must be extractBlocks' index, not "the Nth <p>" — the patcher resolves it there.
    expect(getBlock(html, issue.path!)).toBe(p(TOO_LONG));
  });

  it('agrees with extractBlocks on numbering when non-prose blocks sit in between', () => {
    // The failure this prevents is silent: a validator counting only <p> and a patcher counting
    // <h2> too would disagree about which block is number 1, and the repair would rewrite the
    // wrong paragraph while reporting success.
    const html = `${p('Перше.')}<h2>Заголовок</h2><figcaption>Підпис</figcaption>${p(TOO_LONG)}`;
    const [issue] = run(html);
    const blocks = extractBlocks(html);
    const index = Number(/^block\[(\d+)\]$/.exec(issue.path!)![1]);
    expect(blocks[index].outerHTML).toBe(p(TOO_LONG));
  });

  it('reports the measured word count and the ceiling as structured operands', () => {
    // Never re-parsed out of `detail` — that is what `measured` exists to prevent. Tied to
    // countWords rather than a copied literal, so the two cannot drift apart: "20 Вт" counts as
    // one token, which is why the figure is not the naive word count.
    const [issue] = run(p(TOO_LONG));
    expect(issue.measured).toEqual({ actual: countWords(TOO_LONG), limit: 20, unit: 'words' });
  });

  it('gives each offending block its own path', () => {
    const html = `${p(TOO_LONG)}${p('Коротке.')}${p(TOO_LONG.replace('20 Вт', '30 Вт'))}`;
    const paths = run(html).map(i => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('validateSentenceLength — sentence boundaries', () => {
  it('splits after a metric unit, instead of gluing two sentences into one', () => {
    // The 37-word finding from the second real run was two correct sentences glued together:
    // ABBREVIATIONS held "мм", so the period after "300 мм" was read as an abbreviation dot. The
    // model had already split the sentence properly and the validator merged it back — it could
    // not win, and the block burned a second rung for nothing.
    const first = 'Ortur H20 20 Вт це діодний лазерний верстат із закритим корпусом та робочою зоною 420 × 300 мм.';
    const second = 'Лазерна головка з ручним фокусуванням переміщується над столом зі швидкістю до 20000 мм/хв.';
    expect(run(p(`${first} ${second}`))).toEqual([]);
  });

  it('does not read a word ENDING in an abbreviation as one', () => {
    // head.endsWith('ст') matched "міст", "лист", "хвіст"; 'ін' matched "магазин". A far wider
    // class of false merges than the units.
    // Each half must sit under the ceiling while the merged pair clearly exceeds it — otherwise
    // the test passes whether or not the split happens, and proves nothing.
    const first = 'Через усю робочу зону верстата проходить довгий та жорсткий алюмінієвий міст.';
    const second = 'Далі стоїть блок керування з окремим кабелем живлення та власним запобіжником.';
    expect(countWords(first)).toBeLessThan(20);
    expect(countWords(second)).toBeLessThan(20);
    expect(countWords(`${first} ${second}`)).toBeGreaterThan(20);
    expect(run(p(`${first} ${second}`))).toEqual([]);
  });

  it('still refuses to split on a genuine abbreviation', () => {
    // The guard has to keep working for what it was written for.
    const glued = 'Верстат ріже дерево, акрил, шкіру та ін. Матеріали підбирає оператор за таблицею '
      + 'потужності, швидкості та кількості проходів для кожного окремого типу заготовки.';
    expect(run(p(glued)).length).toBe(1);
  });

  it('still does not split when the next word is lowercase', () => {
    // "5 мм. і далі" — the uppercase requirement in SENTENCE_BREAK already covers this, which is
    // why dropping the units from the list is safe.
    const glued = 'Товщина матеріалу становить 5 мм. і залежить від обраного режиму роботи верстата '
      + 'та від того, скільки проходів оператор задає для конкретної заготовки.';
    expect(run(p(glued)).length).toBe(1);
  });
});

describe('validateSentenceLengthDoc — Doc-reading sibling', () => {
  function baseDoc(overrides: Partial<ProductDescriptionDoc> = {}): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: 'Ortur H20',
      hook: 'Коротке речення.',
      killerSpecs: [
        { label: 'A', value: '1', why: 'Коротке why a.' },
        { label: 'B', value: '2', why: 'Коротке why b.' },
        { label: 'C', value: '3', why: 'Коротке why c.' },
      ],
      keyBenefits: [],
      functionality: [],
      applications: { heading: 'Застосування', items: [] },
      specs: { heading: 'Технічні характеристики', categories: [] },
      cta: { heading: 'CTA', text: 'Коротке cta речення.' },
      figures: [],
      videos: [],
      ...overrides,
    };
  }

  const runDoc = (doc: ProductDescriptionDoc, locale = 'uk-UA') => validateSentenceLengthDoc(doc, locale, 'Doc (base)');

  it('flags the reported 27-word sentence in doc.hook, addressed by path "hook"', () => {
    const issues = runDoc(baseDoc({ hook: TOO_LONG }));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('sentence-too-long');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toMatch(/exceeds the uk-UA hard ceiling of 20/);
    expect(issues[0].detail).toContain('380 відтінків кольору');
    expect(issues[0].detail).toContain('hook');
    expect(issues[0].path).toBe('hook');
  });

  it('accepts the two-sentence rewrite of it', () => {
    const fixed =
      'Лазерний модуль потужністю 20 Вт підходить як для гравіювання, так і для різання дерева, ' +
      'акрилу та подібних матеріалів. На нержавіючій сталі він відтворює понад 380 відтінків кольору.';
    expect(runDoc(baseDoc({ hook: fixed }))).toEqual([]);
  });

  it('is a strict >, so a sentence exactly at the ceiling passes', () => {
    const exactly20 = Array.from({ length: 20 }, (_, i) => `слово${i}`).join(' ') + '.';
    expect(runDoc(baseDoc({ hook: exactly20 }))).toEqual([]);
    expect(runDoc(baseDoc({ hook: `${exactly20.slice(0, -1)} іще.` }))).toHaveLength(1);
  });

  it('measures killerSpecs[].why independently, addressed by its own path', () => {
    const doc = baseDoc({
      killerSpecs: [
        { label: 'A', value: '1', why: TOO_LONG },
        { label: 'B', value: '2', why: 'Коротко.' },
        { label: 'C', value: '3', why: 'Коротко.' },
      ],
    });
    const issues = runDoc(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('killerSpecs[0].why');
  });

  describe('bullets — lead and text are already separate fields, no heuristic needed', () => {
    it('measures a bullet lead-in and its text as two independent segments, each addressed by its own path', () => {
      const longLead = Array.from({ length: 25 }, (_, i) => `слово${i}`).join(' ');
      const doc = baseDoc({
        keyBenefits: [{ kind: 'bullets', items: [{ lead: `${longLead}:`, text: 'Коротке речення.' }] }],
      });
      const issues = runDoc(doc);
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('keyBenefits[0].items[0].lead');
      expect(issues[0].detail).toContain('слово24');
      expect(issues[0].detail).not.toContain('Коротке речення');
    });

    it('accepts the three real bullets from the QA run, lead + text both under ceiling', () => {
      const doc = baseDoc({
        keyBenefits: [{
          kind: 'bullets',
          items: [
            {
              lead: 'Миттєва кольорова хмара точок:',
              text: 'алгоритм LixelUpSample™ обробляє дані на льоту, тому оператор отримує готовий результат одразу в полі, без окремого етапу камеральної обробки.',
            },
          ],
        }],
      });
      expect(runDoc(doc)).toEqual([]);
    });
  });

  it('strips inline <b>/<strong> tags (the only markup Prose may carry) before counting words', () => {
    const withBold = TOO_LONG.replace('гравіювання', '<b>гравіювання</b>');
    expect(runDoc(baseDoc({ hook: withBold }))).toHaveLength(1);
    // The tags themselves must not be counted as extra tokens or leak into the quoted sentence.
    expect(runDoc(baseDoc({ hook: withBold }))[0].detail).not.toContain('<b>');
  });

  it('walks functionality (incl. nested subsections), applications.blocks, compatibility and operatingTips — matching forEachBlockInOrder\'s field coverage', () => {
    const doc = baseDoc({
      functionality: [{
        heading: 'H',
        blocks: [{ kind: 'paragraph', text: 'Коротко.' }],
        subsections: [{ heading: 'Sub', blocks: [{ kind: 'paragraph', text: TOO_LONG }] }],
      }],
      applications: { heading: 'A', blocks: [{ kind: 'paragraph', text: TOO_LONG.replace('20 Вт', '21 Вт') }], items: [] },
      compatibility: { heading: 'C', blocks: [{ kind: 'paragraph', text: TOO_LONG.replace('20 Вт', '22 Вт') }] },
      operatingTips: { heading: 'T', blocks: [{ kind: 'paragraph', text: TOO_LONG.replace('20 Вт', '23 Вт') }] },
    });
    const issues = runDoc(doc);
    expect(issues.map(i => i.path).sort()).toEqual([
      'applications.blocks[0]',
      'compatibility.blocks[0]',
      'functionality[0].subsections[0].blocks[0]',
      'operatingTips.blocks[0]',
    ]);
  });

  it('figure/video blocks carry no text and are silently skipped', () => {
    const doc = baseDoc({
      keyBenefits: [{ kind: 'figure', ref: 0 }],
      functionality: [{ heading: 'H', blocks: [{ kind: 'video', ref: 0 }] }],
    });
    expect(() => runDoc(doc)).not.toThrow();
    expect(runDoc(doc)).toEqual([]);
  });

  it('measures applications.items[].text, addressed by its own path', () => {
    const doc = baseDoc({ applications: { heading: 'A', items: [{ scenario: 'S.', text: TOO_LONG }] } });
    const issues = runDoc(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('applications.items[0].text');
  });

  it('measures packageContents.items, matching the HTML sibling scoring <li> as well as <p>', () => {
    const doc = baseDoc({ packageContents: { heading: 'P', items: [TOO_LONG] } });
    const issues = runDoc(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('packageContents.items[0]');
  });

  // Deliberately EXCLUDED, matching the HTML sibling's isExcludedScope('section.specs') — see
  // this file's own SCOPE comment on validateSentenceLength ("Spec-table cells are not sentences
  // ... no rule asks to shorten them"). validateSentenceLengthDoc must not invent a stricter rule
  // for the Doc pipeline than the HTML pipeline has ever enforced.
  it('does NOT score specs.categories[].rows[].value, even when it is over the ceiling', () => {
    const doc = baseDoc({
      specs: { heading: 'S', categories: [{ title: 'Cat', rows: [{ label: 'L', value: TOO_LONG }] }] },
    });
    expect(runDoc(doc)).toEqual([]);
  });

  it('does NOT score a multi-valued spec row either — the false-positive shape a joined, unpunctuated list would create', () => {
    // A real multi-valued SpecRow.value (e.g. a supported-format list) space-joins into one long
    // unpunctuated blob under the array-join treatment other validators in this codebase apply to
    // SpecRow.value — splitSentences finds no terminator in it, so if this were scored it would
    // read as a single very-long "sentence" and false-positive on a ceiling meant for prose.
    const manyFormats = ['STL', 'OBJ', 'PLY', 'IGES', 'SolidWorks', 'X_T', 'STEP', 'Parasolid', 'CATIA', 'Inventor', 'Rhino', 'Творчий формат довгий'];
    const doc = baseDoc({
      specs: { heading: 'S', categories: [{ title: 'Cat', rows: [{ label: 'Formats', value: manyFormats }] }] },
    });
    expect(runDoc(doc)).toEqual([]);
  });

  it('measures cta.text, addressed by path "cta.text"', () => {
    const issues = runDoc(baseDoc({ cta: { heading: 'CTA', text: TOO_LONG } }));
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('cta.text');
  });

  it('reports the measured word count and the ceiling as structured operands', () => {
    const [issue] = runDoc(baseDoc({ hook: TOO_LONG }));
    expect(issue.measured).toEqual({ actual: countWords(TOO_LONG), limit: 20, unit: 'words' });
  });

  describe('locale bands', () => {
    it('uses the de-DE ceiling of 18', () => {
      const s = Array.from({ length: 19 }, (_, i) => `Wort${i}`).join(' ') + '.';
      expect(runDoc(baseDoc({ hook: s }), 'de-DE')).toHaveLength(1);
      expect(runDoc(baseDoc({ hook: s }), 'es-ES')).toEqual([]); // es-ES ceiling is 27
    });

    it('returns nothing for an unmapped locale rather than guessing', () => {
      expect(runDoc(baseDoc({ hook: TOO_LONG }), 'xx-XX')).toEqual([]);
    });
  });

  describe('null/undefined safety', () => {
    it('does not throw on a doc missing compatibility, operatingTips and packageContents', () => {
      const doc = baseDoc();
      expect(doc.compatibility).toBeUndefined();
      expect(doc.operatingTips).toBeUndefined();
      expect(doc.packageContents).toBeUndefined();
      expect(() => runDoc(doc)).not.toThrow();
      expect(runDoc(doc)).toEqual([]);
    });

    it('does not throw on empty figures/videos/specs.categories arrays', () => {
      const doc = baseDoc({ figures: [], videos: [] });
      expect(() => runDoc(doc)).not.toThrow();
    });
  });

  it('gives each offending field its own path, never colliding', () => {
    const doc = baseDoc({
      hook: TOO_LONG,
      cta: { heading: 'CTA', text: TOO_LONG.replace('20 Вт', '30 Вт') },
    });
    const paths = runDoc(doc).map(i => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
