/**
 * image-deixis.spec.ts - US-9.1 T2 (detector, FR-16) and T3 (carriers and issue builder, FR-17, FR-18 builder
 * half). AC-5, AC-6, AC-7 (builder half), NFR-6, NFR-7, NFR-8.
 *
 * "Image deixis" = a sentence that points at the picture or at the page layout ("shown in the image", "on the
 * photo", "the video below"). `findImageDeixis(text, locale)` is the per-language detector;
 * `collectFigureDeixis(html, locale)` walks the three carriers (the paragraph directly above a figure, each
 * figcaption, each img alt); `imageDeixisIssues(doc, locale, context)` turns the paragraph carrier into
 * `warning` issues for `validateGeneratedHtml` (which emits them in T26).
 *
 * RED BY LOAD until T2 creates `src/utils/image-deixis.ts` (task breakdown constraint 1: a spec that imports a
 * symbol a task of this Story creates). Assertions are written from AC-5 / AC-6 / AC-7 and Specification
 * FR-16 / FR-17 / FR-18, never from a proposed implementation or a captured run.
 *
 * WHAT IS AND IS NOT ASSERTED.
 *  - uk: exactly the Specification's required cases (FR-16): three positives, two negatives. Plus the
 *    code-authored `Фото: ` / `Зображення товару:` negatives (Q-CODEALT "no", decided 2026-10-18) and the
 *    «на фотополімерній смолі» word-boundary negative (task breakdown T2). The known precision candidates
 *    («Температура вище 200 °C», «на якому/на яких/на ній») are asserted NEITHER WAY (OD-7, decided
 *    2026-10-18: accepted as built).
 *  - ru, en, pl, de, es, pt: exactly two positives and two negatives each (AC-5's minimum). The sentences are
 *    this spec's own samples of the construction classes (preposition + picture noun; picture noun + show verb
 *    or participle; a spatial pointer adverb opening a clause about a figure or video). The phrase LISTS are
 *    drafted by the builder and unreviewed (OD-7); native review is out of scope.
 *  - Hit shape: `carrier` ('paragraph' | 'figcaption' | 'alt') and the matched text, as FR-17 words it. No
 *    other property name is asserted.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  findImageDeixis, collectFigureDeixis, collectFigureDeixisFromDocument, imageDeixisIssues, DEIXIS_PATTERNS,
} from './image-deixis';
import { STORE_REGISTRY } from '../prompt-core/constants';

afterEach(() => { vi.unstubAllGlobals(); });

// Captured before any test stubs the global away (the injected-parser tests remove DOMParser from globalThis).
const RealDOMParser = DOMParser;
const dom = (html: string) => new RealDOMParser().parseFromString(html, 'text/html');

// ── T2: findImageDeixis ───────────────────────────────────────────────────────────────────────────────

const UK_POSITIVES = [
  'Ряд із трьох круглих модулів ззаду показано на зображенні.',
  'Три кадри показують усі етапи складання.',
  'Нижче розміщено відео з оглядом пристрою.',
];
const UK_NEGATIVES = [
  'Режим працює від -10 °C.',
  'Сенсорний екран запускає сканування й показує 3D-модель.',
];

/** language -> locale used for the lookup, two positives, two negatives (AC-5). */
const OTHER_LANGUAGES: Array<[string, string, string[], string[]]> = [
  ['ru', 'ru-UA',
    ['Ряд из трёх круглых модулей сзади показан на изображении.', 'Ниже размещено видео с обзором устройства.'],
    ['Режим работает от -10 °C.', 'Сенсорный экран запускает сканирование и показывает 3D-модель.']],
  ['en', 'en-GB',
    ['The row of three round modules on the back is shown in the image.', 'The video below shows the setup.'],
    ['The mode works from -10 °C.', 'The touchscreen starts the scan and shows the 3D model.']],
  ['pl', 'pl-PL',
    ['Rząd trzech okrągłych modułów z tyłu pokazano na zdjęciu.', 'Poniżej znajduje się film z przeglądem urządzenia.'],
    ['Tryb działa od -10 °C.', 'Ekran dotykowy uruchamia skanowanie i wyświetla model 3D.']],
  ['de', 'de-DE',
    ['Die Reihe aus drei runden Modulen auf der Rückseite ist auf dem Bild zu sehen.', 'Unten finden Sie das Video zur Einrichtung.'],
    ['Der Modus funktioniert ab -10 °C.', 'Der Touchscreen startet den Scan und zeigt das 3D-Modell.']],
  ['es', 'es-ES',
    ['La fila de tres módulos redondos de la parte trasera se muestra en la imagen.', 'En la foto de abajo se ve el escáner en uso.'],
    ['El modo funciona desde -10 °C.', 'La pantalla táctil inicia el escaneo y muestra el modelo 3D.']],
  ['pt', 'pt-PT',
    ['A fila de três módulos redondos na parte de trás é mostrada na imagem.', 'O vídeo abaixo mostra a montagem.'],
    ['O modo funciona a partir de -10 °C.', 'O ecrã tátil inicia a digitalização e mostra o modelo 3D.']],
];

describe('findImageDeixis - uk-UA (AC-5, FR-16)', () => {
  it.each(UK_POSITIVES)('returns a match for the required positive %j', text => {
    expect(findImageDeixis(text, 'uk-UA')).not.toBeNull();
  });

  it.each(UK_NEGATIVES)('returns null for the required negative %j', text => {
    expect(findImageDeixis(text, 'uk-UA')).toBeNull();
  });

  it.each(['Фото: ', 'Фото: Настільна лампа біля вікна', 'Зображення товару:', 'Зображення товару: настільна лампа'])(
    'returns null for the code-authored text %j (Q-CODEALT: ALT_PREFIX and FALLBACK_LABEL are not matched)', text => {
      expect(findImageDeixis(text, 'uk-UA')).toBeNull();
    },
  );

  it('does not match "на фото" inside a longer word: «на фотополімерній смолі» is a product fact', () => {
    expect(findImageDeixis('Модель друкується на фотополімерній смолі.', 'uk-UA')).toBeNull();
  });

  it('selects by the primary subtag, case-insensitively', () => {
    expect(findImageDeixis(UK_POSITIVES[0], 'UK-ua')).not.toBeNull();
    expect(findImageDeixis(UK_POSITIVES[0], 'uk')).not.toBeNull();
  });
});

describe.each(OTHER_LANGUAGES)('findImageDeixis - %s (AC-5: at least 2 positive and 2 negative tests)', (_lang, locale, positives, negatives) => {
  it.each(positives)('returns a match for the positive %j', text => {
    expect(findImageDeixis(text, locale)).not.toBeNull();
  });

  it.each(negatives)('returns null for the negative %j', text => {
    expect(findImageDeixis(text, locale)).toBeNull();
  });
});

describe('findImageDeixis - locale mapping, unknown language, failure path (AC-5, FR-16)', () => {
  it.each(['en-ES', 'en-US', 'en-GB'])('maps %s to the English pattern (primary subtag)', locale => {
    expect(findImageDeixis('The row of three round modules on the back is shown in the image.', locale)).not.toBeNull();
  });

  it('maps es-MX to the Spanish pattern', () => {
    expect(findImageDeixis('La fila de tres módulos redondos de la parte trasera se muestra en la imagen.', 'es-MX')).not.toBeNull();
  });

  it.each(['ja-JP', 'xx', 'zh-CN', 'xx-XX'])('returns null for the unknown language %s, even for a text that is a positive elsewhere', locale => {
    expect(findImageDeixis(UK_POSITIVES[0], locale)).toBeNull();
    expect(findImageDeixis('The video below shows the setup.', locale)).toBeNull();
  });

  it('returns null for an omitted or empty locale (the plan decides the omitted case: null)', () => {
    expect(findImageDeixis(UK_POSITIVES[0], undefined as unknown as string)).toBeNull();
    expect(findImageDeixis(UK_POSITIVES[0], '')).toBeNull();
  });

  it('never throws: empty, whitespace-only, undefined and non-string text give null', () => {
    for (const text of ['', '   ', undefined, null, 42, {}] as unknown[]) {
      expect(() => findImageDeixis(text as string, 'uk-UA')).not.toThrow();
      expect(findImageDeixis(text as string, 'uk-UA')).toBeNull();
    }
  });

  it('is deterministic (NFR-6): the same input gives the same answer, repeatedly, with no regex state leaking between calls', () => {
    const first = findImageDeixis(UK_POSITIVES[0], 'uk-UA');
    for (let i = 0; i < 5; i++) expect(findImageDeixis(UK_POSITIVES[0], 'uk-UA')).toEqual(first);
    expect(findImageDeixis(UK_NEGATIVES[0], 'uk-UA')).toBeNull();
    expect(findImageDeixis(UK_POSITIVES[0], 'uk-UA')).toEqual(first);
  });
});

describe('DEIXIS_PATTERNS - keyed by language, in step with STORE_REGISTRY (NFR-8)', () => {
  const registryLanguages = new Set(
    Object.values(STORE_REGISTRY).flatMap(profile => profile.languages.map(l => l.toLowerCase().split('-')[0])),
  );

  it('the table keys are exactly the primary subtags of every STORE_REGISTRY language (a new registry language fails here, not silently)', () => {
    expect(Object.keys(DEIXIS_PATTERNS).sort()).toEqual([...registryLanguages].sort());
  });

  it('the seven base languages of the Story are present', () => {
    expect(Object.keys(DEIXIS_PATTERNS).sort()).toEqual(['de', 'en', 'es', 'pl', 'pt', 'ru', 'uk']);
  });

  it('every language has at least one pattern, and no key is a full store locale', () => {
    for (const [lang, patterns] of Object.entries(DEIXIS_PATTERNS)) {
      expect(lang, 'a key that is a store locale').toMatch(/^[a-z]{2}$/);
      expect(patterns.length, `${lang} has no pattern`).toBeGreaterThan(0);
    }
  });
});

describe('image-deixis.ts is a dependency-free leaf (NFR-7, NFR-8, D5)', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'utils', 'image-deixis.ts'), 'utf8');

  it('has only type imports (no runtime import, so no cycle with output-validator.ts or image-placeholder.ts)', () => {
    const imports = source.split(/\r?\n/).filter(l => /^import\s/.test(l));
    expect(imports.filter(l => !/^import\s+type\s/.test(l))).toEqual([]);
  });

  it('does not re-export from another module and never names STORE_REGISTRY', () => {
    expect(source).not.toMatch(/^export\s+.*\sfrom\s/m);
    expect(source).not.toContain('STORE_REGISTRY');
  });
});

// ── T3: collectFigureDeixis, collectFigureDeixisFromDocument, imageDeixisIssues ───────────────────────

const POINTER_UK = 'Ряд із трьох круглих модулів ззаду показано на зображенні.';
const FIGURE_UK = '<figure><img src="a.jpg" alt="Задня панель" decoding="async"><figcaption><b>Задня панель:</b> три круглі модулі</figcaption></figure>';
const hitsOf = (html: string, locale = 'uk-UA') => collectFigureDeixis(html, locale);
const carriers = (html: string, locale = 'uk-UA') => hitsOf(html, locale).map(h => h.carrier);

describe('collectFigureDeixis - the three carriers (AC-6, FR-17)', () => {
  it('reports a phrase in the paragraph directly above a figure, with the carrier "paragraph" and the matched text', () => {
    const hits = hitsOf(`<p>${POINTER_UK}</p>${FIGURE_UK}`);
    expect(hits).toHaveLength(1);
    expect(hits[0].carrier).toBe('paragraph');
    expect(Object.values(hits[0]).some(v => typeof v === 'string' && v.includes('показано на зображенні'))).toBe(true);
  });

  it('reports a phrase in a figcaption with the carrier "figcaption"', () => {
    const html = '<p>Три круглі модулі розташовані на задній панелі.</p>'
      + '<figure><img src="a.jpg" alt="Задня панель"><figcaption><b>Задня панель:</b> Колаж показує три модулі</figcaption></figure>';
    expect(carriers(html)).toEqual(['figcaption']);
  });

  it('reports a phrase in an img alt with the carrier "alt"', () => {
    const html = '<p>Три круглі модулі розташовані на задній панелі.</p>'
      + '<figure><img src="a.jpg" alt="Три кадри показують модулі"><figcaption><b>Задня панель:</b> три модулі</figcaption></figure>';
    expect(carriers(html)).toEqual(['alt']);
  });

  it('counts one hit per carrier instance: paragraph, figcaption and alt of one figure give three hits', () => {
    const html = `<p>${POINTER_UK}</p>`
      + '<figure><img src="a.jpg" alt="Три кадри показують модулі"><figcaption>Колаж показує три модулі</figcaption></figure>';
    expect([...carriers(html)].sort()).toEqual(['alt', 'figcaption', 'paragraph']);
  });

  it('two phrases in one paragraph are ONE hit (counting unit)', () => {
    const html = `<p>${POINTER_UK} Нижче розміщено відео з оглядом.</p>${FIGURE_UK}`;
    expect(carriers(html)).toEqual(['paragraph']);
  });

  it('does NOT report the same phrase in a paragraph that is not the previous sibling of any figure', () => {
    const html = `<p>${POINTER_UK}</p><p>Звичайний абзац про продукт.</p>${FIGURE_UK}`;
    expect(hitsOf(html)).toEqual([]);
  });

  it('does NOT report "нижче -10 °C" in a body paragraph (the AC-7 negative)', () => {
    expect(hitsOf(`<p>Не використовуйте пристрій за температури нижче -10 °C.</p>${FIGURE_UK}`)).toEqual([]);
  });

  it('a heading between the pointer paragraph and the figure removes the paragraph hit (no walk-up, no "nearest preceding p")', () => {
    expect(hitsOf(`<p>${POINTER_UK}</p><h3>Задня панель</h3>${FIGURE_UK}`)).toEqual([]);
  });

  it.each([
    ['an <hr>', '<hr>'],
    ['a <ul>', '<ul><li>пункт</li></ul>'],
    ['a <table>', '<table><tr><td>1</td></tr></table>'],
  ])('a figure whose previous element sibling is %s has no paragraph above it, even after a pointer paragraph', (_n, between) => {
    expect(hitsOf(`<p>${POINTER_UK}</p>${between}${FIGURE_UK}`)).toEqual([]);
  });

  it('a figure whose previous element sibling is another <figure> has no paragraph above it: the pointer paragraph belongs to the FIRST figure only', () => {
    const second = FIGURE_UK.replace('a.jpg', 'b.jpg');
    expect(carriers(`<p>${POINTER_UK}</p>${FIGURE_UK}${second}`)).toEqual(['paragraph']);
  });

  it('a figure that is the first child of its parent has no paragraph above it', () => {
    expect(hitsOf(`<section>${FIGURE_UK}</section>`)).toEqual([]);
    expect(hitsOf(`<ul><li>${FIGURE_UK}</li></ul>`)).toEqual([]);
  });

  it('ignores text nodes and comments between the paragraph and the figure (the previous ELEMENT sibling counts)', () => {
    expect(carriers(`<p>${POINTER_UK}</p>\n  <!-- layout note -->\n  ${FIGURE_UK}`)).toEqual(['paragraph']);
  });

  it('treats a video figure like an image figure: the paragraph above a video <figure> is a carrier', () => {
    const video = '<figure><iframe src="https://www.youtube.com/embed/abc123" title="Огляд"></iframe><figcaption>Відеоогляд Ortur</figcaption></figure>';
    expect(carriers(`<p>Нижче розміщено відео з оглядом пристрою.</p>${video}`)).toEqual(['paragraph']);
  });

  it('does not inspect an iframe title (a video iframe has title, not alt)', () => {
    const video = '<figure><iframe src="https://www.youtube.com/embed/abc123" title="Колаж показує модулі"></iframe><figcaption>Відеоогляд Ortur</figcaption></figure>';
    expect(hitsOf(`<p>Звичайний абзац про продукт.</p>${video}`)).toEqual([]);
  });

  it('inspects every figcaption and every img alt in the document, not only those inside a figure', () => {
    const html = '<p>Звичайний абзац.</p><img src="c.jpg" alt="Три кадри показують модулі"><figcaption>Колаж показує три модулі</figcaption>';
    expect([...carriers(html)].sort()).toEqual(['alt', 'figcaption']);
  });

  it('uses the locale of the artifact: an English pointer paragraph is a hit for en-GB and not for uk-UA', () => {
    const html = '<p>The row of three round modules is shown in the image.</p><figure><img src="a.jpg" alt="Back panel"><figcaption>Back panel</figcaption></figure>';
    expect(carriers(html, 'en-GB')).toEqual(['paragraph']);
    expect(carriers(html, 'uk-UA')).toEqual([]);
  });
});

describe('collectFigureDeixis - failure paths and the injectable parser (FR-17, D12)', () => {
  it('HTML with no figure and no figcaption or img has no hits', () => {
    expect(hitsOf(`<h2>Опис</h2><p>${POINTER_UK}</p><p>Ще один абзац.</p>`)).toEqual([]);
  });

  it.each(['', '   ', '<<<>>', '<p><figure><figcaption>', '<figure><img alt="', 'plain text, no tags'])('malformed or empty HTML %j does not throw and gives no hits', html => {
    expect(() => hitsOf(html)).not.toThrow();
    expect(hitsOf(html)).toEqual([]);
  });

  it('undefined or non-string HTML does not throw and gives no hits', () => {
    for (const html of [undefined, null, 5] as unknown[]) {
      expect(() => collectFigureDeixis(html as string, 'uk-UA')).not.toThrow();
      expect(collectFigureDeixis(html as string, 'uk-UA')).toEqual([]);
    }
  });

  it('with no DOMParser and no injected parser it returns [] and does not throw', () => {
    vi.stubGlobal('DOMParser', undefined);
    expect(() => collectFigureDeixis(`<p>${POINTER_UK}</p>${FIGURE_UK}`, 'uk-UA')).not.toThrow();
    expect(collectFigureDeixis(`<p>${POINTER_UK}</p>${FIGURE_UK}`, 'uk-UA')).toEqual([]);
  });

  it('uses an injected parse function instead of the global DOMParser (the CLI path)', () => {
    const parse = vi.fn((html: string) => dom(html));
    vi.stubGlobal('DOMParser', undefined);
    const hits = collectFigureDeixis(`<p>${POINTER_UK}</p>${FIGURE_UK}`, 'uk-UA', parse);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(hits.map(h => h.carrier)).toEqual(['paragraph']);
  });

  it('collectFigureDeixisFromDocument reads an already parsed document and agrees with collectFigureDeixis', () => {
    const html = `<p>${POINTER_UK}</p>${FIGURE_UK}`;
    expect(collectFigureDeixisFromDocument(dom(html), 'uk-UA').map(h => h.carrier)).toEqual(carriers(html));
  });

  it('is deterministic (NFR-6)', () => {
    const html = `<p>${POINTER_UK}</p>${FIGURE_UK}`;
    expect(JSON.stringify(hitsOf(html))).toBe(JSON.stringify(hitsOf(html)));
  });
});

describe('imageDeixisIssues - the paragraph carrier as warnings (AC-7 builder half, FR-18)', () => {
  const issuesOf = (html: string, locale = 'uk-UA', context = 'HTML (uk-UA)') => imageDeixisIssues(dom(html), locale, context);

  it('returns one warning with rule "image-deixis" and the given context for a pointer paragraph above a figure', () => {
    const issues = issuesOf(`<p>${POINTER_UK}</p>${FIGURE_UK}`);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rule).toBe('image-deixis');
    expect(issues[0].context).toBe('HTML (uk-UA)');
    expect(issues[0].path, 'a document-level finding carries no path').toBeUndefined();
  });

  it('returns one warning per figure whose paragraph above has a hit', () => {
    const second = FIGURE_UK.replace('a.jpg', 'b.jpg');
    const html = `<p>${POINTER_UK}</p>${FIGURE_UK}<p>Звичайний абзац про продукт.</p>${second}<p>Три кадри показують усі етапи складання.</p>${FIGURE_UK.replace('a.jpg', 'c.jpg')}`;
    const issues = issuesOf(html);
    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.rule === 'image-deixis' && i.severity === 'warning')).toBe(true);
  });

  it('returns nothing for the figcaption and alt carriers (the FR-18 carrier table is normative)', () => {
    const html = '<p>Звичайний абзац про продукт.</p>'
      + '<figure><img src="a.jpg" alt="Три кадри показують модулі"><figcaption>Колаж показує три модулі</figcaption></figure>';
    expect(issuesOf(html)).toEqual([]);
  });

  it('returns nothing for "нижче -10 °C" in a paragraph that is not directly above a figure', () => {
    expect(issuesOf(`<p>Не використовуйте пристрій за температури нижче -10 °C.</p><p>Інший абзац.</p>${FIGURE_UK}`)).toEqual([]);
  });

  it('returns nothing for an undefined locale, for malformed HTML and for a document with no figure', () => {
    expect(imageDeixisIssues(dom(`<p>${POINTER_UK}</p>${FIGURE_UK}`), undefined as unknown as string, 'ctx')).toEqual([]);
    expect(() => issuesOf('<p><figure><figcaption>')).not.toThrow();
    expect(issuesOf(`<p>${POINTER_UK}</p>`)).toEqual([]);
  });
});
