/**
 * image-deixis.ts - detector for "image deixis": a sentence that points at the picture or at the page layout
 * ("shown in the image", "on the photo", "the video below") instead of stating a product fact.
 *
 * Leaf module (NFR-7): it has only type imports, so `output-validator.ts` and `image-placeholder.ts` can both
 * import it without a runtime cycle, and the measurement script can load it under Node type stripping.
 *
 * The pattern table is keyed by LANGUAGE (the lower-cased primary subtag), never by store locale, and never
 * reads the store registry (NFR-8); a spec cross-checks the key set against the registry's languages.
 *
 * Patterns are built from three construction classes:
 *   1. a preposition + a picture noun ("on the image", «на фото»);
 *   2. a picture noun + a "show" verb, or a "shown" participle with a place word ("the collage shows",
 *      «показано тут»);
 *   3. a spatial pointer adverb opening a clause about a figure or a video ("Below is the video",
 *      «Нижче розміщено відео»), or following a picture/video noun ("the video below").
 * A pointer adverb followed by a number or a sign ("below -10 °C") is a measurement, not a pointer, so
 * class 3 never matches it. Every pattern uses `(?<!\p{L})` / `(?!\p{L})` boundaries so that «на фото» does
 * not match inside «на фотополімерній».
 *
 * REVIEW STATUS: the Ukrainian patterns are built to the Specification's required cases (FR-16). The ru, en,
 * pl, de, es and pt lists are drafted from the same construction classes and are UNREVIEWED by a native
 * speaker (OD-7: accepted as built; native review is out of scope for this Story).
 */
import type { ValidationIssue } from './output-validator';

/** A detector hit: the phrase that matched and where it starts in the inspected text. */
export interface DeixisMatch {
  /** The matched phrase, as it appears in the inspected text. */
  match: string;
  /** Zero-based index of the match in the inspected text. */
  index: number;
}

const B = '(?<!\\p{L})';
const E = '(?!\\p{L})';
/** Start of a sentence or of a clause introduced by a colon / semicolon. */
const SENTENCE_START = '(?:^|[.!?…:;]\\s+)';
/** What may NOT follow a pointer adverb: a number or a sign makes it a measurement ("below -10 °C"). */
const NOT_MEASURE = '(?![-+\\u2212\\u2013\\d])';

const re = (source: string): RegExp => new RegExp(source, 'iu');
const alt = (words: string[]): string => `(?:${words.join('|')})`;

// ── uk ───────────────────────────────────────────────────────────────────────────────────────────────
const UK_PICTURE = alt([
  'зображенн\\p{L}*', 'фото(?:графі\\p{L}*)?', 'знімк\\p{L}*', 'кадр\\p{L}*', 'колаж\\p{L}*', 'картин\\p{L}*',
  'ілюстраці\\p{L}*', 'рисунк\\p{L}*', 'скріншот\\p{L}*', 'відео(?:ролик\\p{L}*)?', 'ролик\\p{L}*',
]);
const UK_SHOW_VERB = alt([
  'показу\\p{L}*', 'демонстру\\p{L}*', 'зображу\\p{L}*', 'ілюстру\\p{L}*', 'відображ\\p{L}*', 'представля\\p{L}*',
]);
const UK_PLACE_WORD = alt(['тут', 'нижче', 'вище', 'на\\s+\\p{L}+']);

// ── ru ───────────────────────────────────────────────────────────────────────────────────────────────
const RU_PICTURE = alt([
  'изображени\\p{L}*', 'фото(?:графи\\p{L}*)?', 'снимк\\p{L}*', 'кадр\\p{L}*', 'коллаж\\p{L}*', 'картин\\p{L}*',
  'иллюстраци\\p{L}*', 'рисунк\\p{L}*', 'скриншот\\p{L}*', 'видео(?:ролик\\p{L}*)?', 'ролик\\p{L}*',
]);
const RU_SHOW_VERB = alt([
  'показыва\\p{L}*', 'демонстриру\\p{L}*', 'изобража\\p{L}*', 'иллюстриру\\p{L}*', 'отобража\\p{L}*', 'представля\\p{L}*',
]);

// ── en ───────────────────────────────────────────────────────────────────────────────────────────────
const EN_PICTURE = alt([
  'images?', 'photos?', 'photographs?', 'pictures?', 'screenshots?', 'frames?', 'collages?', 'illustrations?',
  'figures?', 'videos?', 'clips?',
]);
const EN_SHOW_VERB = alt(['shows?', 'depicts?', 'illustrates?', 'displays?', 'presents?', 'demonstrates?']);

// ── pl ───────────────────────────────────────────────────────────────────────────────────────────────
const PL_PICTURE = alt([
  'zdję\\p{L}*', 'obraz\\p{L}*', 'ilustracj\\p{L}*', 'grafik\\p{L}*', 'kadr\\p{L}*', 'kolaż\\p{L}*',
  'film\\p{L}*', 'wideo', 'zrzut\\p{L}*',
]);
const PL_SHOW_VERB = alt(['pokazuj\\p{L}*', 'przedstawia\\p{L}*', 'ilustruj\\p{L}*', 'prezentuj\\p{L}*', 'demonstruj\\p{L}*']);

// ── de ───────────────────────────────────────────────────────────────────────────────────────────────
const DE_PICTURE = alt([
  'bild\\p{L}*', 'foto\\p{L}*', 'abbildung\\p{L}*', 'aufnahme\\p{L}*', 'screenshot\\p{L}*', 'grafik\\p{L}*',
  'video\\p{L}*', 'film\\p{L}*', 'kollage\\p{L}*',
]);
const DE_SHOW_VERB = alt(['zeigt', 'zeigen', 'stellt', 'stellen', 'veranschaulicht', 'veranschaulichen', 'demonstriert']);

// ── es ───────────────────────────────────────────────────────────────────────────────────────────────
const ES_PICTURE = alt([
  'imágenes', 'imagen', 'fotos?', 'fotografías?', 'capturas?', 'ilustración', 'ilustraciones',
  'vídeos?', 'videos?', 'fotogramas?', 'collage',
]);
const ES_SHOW_VERB = alt(['muestra', 'muestran', 'ilustra', 'ilustran', 'presenta', 'presentan', 'representa', 'representan']);

// ── pt ───────────────────────────────────────────────────────────────────────────────────────────────
const PT_PICTURE = alt([
  'imagens?', 'fotos?', 'fotografias?', 'ilustração', 'ilustrações', 'capturas?', 'vídeos?',
  'fotogramas?', 'colagem', 'figura',
]);
const PT_SHOW_VERB = alt(['mostra', 'mostram', 'ilustra', 'ilustram', 'apresenta', 'apresentam', 'exibe', 'exibem']);

/**
 * language -> patterns. Keys are primary language subtags (NOT store locales). The set of keys must equal the
 * set of primary subtags of every store-registry language; `image-deixis.spec.ts` enforces it.
 */
export const DEIXIS_PATTERNS: Record<string, readonly RegExp[]> = {
  uk: [
    // 1. preposition + picture noun
    re(`${B}(?:на|в|у)\\s+${UK_PICTURE}${E}`),
    // 2. picture noun + show verb ("Три кадри показують"), or a "shown" participle with a place word
    re(`${B}${UK_PICTURE}\\s+(?:\\p{L}+\\s+)?${UK_SHOW_VERB}${E}`),
    re(`${B}(?:показан\\p{L}*|зображен[оаі]|видно)\\s+${UK_PLACE_WORD}${E}`),
    // 3. a spatial pointer adverb opening a clause, or following a picture / video noun
    re(`${SENTENCE_START}${B}(?:нижче|вище)\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${UK_PICTURE}\\s+(?:нижче|вище)${E}`),
  ],
  ru: [
    re(`${B}(?:на|в)\\s+${RU_PICTURE}${E}`),
    re(`${B}${RU_PICTURE}\\s+(?:\\p{L}+\\s+)?${RU_SHOW_VERB}${E}`),
    re(`${B}(?:показан\\p{L}*|изображен[оаы]|видно)\\s+(?:здесь|ниже|выше|на\\s+\\p{L}+)${E}`),
    re(`${SENTENCE_START}${B}(?:ниже|выше)\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${RU_PICTURE}\\s+(?:ниже|выше)${E}`),
  ],
  en: [
    re(`${B}(?:in|on|at)\\s+the\\s+${EN_PICTURE}${E}`),
    re(`${B}${EN_PICTURE}\\s+(?:\\p{L}+\\s+)?${EN_SHOW_VERB}${E}`),
    re(`${B}(?:shown|pictured|depicted|illustrated|displayed|visible|seen)\\s+(?:here|below|above|in\\s+\\p{L}+)${E}`),
    re(`${SENTENCE_START}${B}(?:below|above)\\s*[,:]?\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${EN_PICTURE}\\s+(?:below|above)${E}`),
  ],
  pl: [
    re(`${B}(?:na|w)\\s+${PL_PICTURE}${E}`),
    re(`${B}${PL_PICTURE}\\s+(?:\\p{L}+\\s+)?${PL_SHOW_VERB}${E}`),
    re(`${B}(?:pokazan\\p{L}*|przedstawion\\p{L}*|widoczn\\p{L}*)\\s+(?:tutaj|poniżej|powyżej|na\\s+\\p{L}+)${E}`),
    re(`${SENTENCE_START}${B}(?:poniżej|powyżej)\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${PL_PICTURE}\\s+(?:poniżej|powyżej)${E}`),
  ],
  de: [
    re(`${B}(?:auf|in|im)\\s+(?:(?:dem|den|der|diesem)\\s+)?${DE_PICTURE}${E}`),
    re(`${B}${DE_PICTURE}\\s+(?:\\p{L}+\\s+)?${DE_SHOW_VERB}${E}`),
    re(`${B}(?:gezeigt|abgebildet|dargestellt|zu\\s+sehen)\\s+(?:hier|unten|oben)${E}`),
    re(`${B}(?:ist|sind)\\s+(?:\\p{L}+\\s+){0,8}?zu\\s+sehen${E}`),
    re(`${SENTENCE_START}${B}(?:unten|oben|nachfolgend|untenstehend|obenstehend|darunter|darüber)\\s*[,:]?\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${DE_PICTURE}\\s+(?:unten|oben)${E}`),
  ],
  es: [
    re(`${B}(?:en|con)\\s+(?:la|el|las|los|esta|este)\\s+${ES_PICTURE}${E}`),
    re(`${B}${ES_PICTURE}\\s+(?:\\p{L}+\\s+)?${ES_SHOW_VERB}${E}`),
    re(`${B}(?:se\\s+(?:ve|ven|muestra|muestran)|mostrad[oa]s?)\\s+(?:aquí|abajo|arriba|en\\s+\\p{L}+)${E}`),
    re(`${SENTENCE_START}${B}(?:abajo|arriba|debajo|a\\s+continuación)\\s*[,:]?\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${ES_PICTURE}\\s+(?:de\\s+)?(?:abajo|arriba|siguiente|a\\s+continuación)${E}`),
  ],
  pt: [
    re(`${B}(?:na|nesta|nessa|em)\\s+${PT_PICTURE}${E}`),
    re(`${B}(?:no|neste|nesse)\\s+${PT_PICTURE}${E}`),
    re(`${B}${PT_PICTURE}\\s+(?:\\p{L}+\\s+)?${PT_SHOW_VERB}${E}`),
    re(`${B}(?:mostrad[oa]s?|visível|visíveis)\\s+(?:aqui|abaixo|acima|na\\s+\\p{L}+|no\\s+\\p{L}+)${E}`),
    re(`${SENTENCE_START}${B}(?:abaixo|acima|a\\s+seguir)\\s*[,:]?\\s+${NOT_MEASURE}\\p{L}`),
    re(`${B}${PT_PICTURE}\\s+(?:abaixo|acima|a\\s+seguir)${E}`),
  ],
};

/** The base language of a locale: the lower-cased primary subtag ("uk-UA" -> "uk"). */
function baseLanguage(locale: unknown): string {
  if (typeof locale !== 'string') return '';
  return locale.trim().toLowerCase().split(/[-_]/)[0];
}

/**
 * First image-deixis phrase in `text` for the language of `locale`, or `null`. An unknown language, an
 * omitted / empty locale, an empty text or a non-string input returns `null`; it never throws.
 */
export function findImageDeixis(text: string, locale: string): DeixisMatch | null {
  if (typeof text !== 'string' || text.trim() === '') return null;
  const patterns = Object.prototype.hasOwnProperty.call(DEIXIS_PATTERNS, baseLanguage(locale))
    ? DEIXIS_PATTERNS[baseLanguage(locale)]
    : undefined;
  if (!patterns) return null;
  let best: DeixisMatch | null = null;
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m && (best === null || m.index < best.index)) best = { match: m[0], index: m.index };
  }
  return best;
}

// ── Carrier walk (FR-17) ─────────────────────────────────────────────────────────────────────────────

/** Where in the document a deixis phrase was found. */
export type DeixisCarrier = 'paragraph' | 'figcaption' | 'alt';

/** One hit per carrier instance: the carrier kind, its inspected text and the first matching phrase. */
export interface FigureDeixisHit {
  carrier: DeixisCarrier;
  /** The full text of the carrier that was inspected. */
  text: string;
  /** The first matching phrase inside `text`. */
  match: string;
}

/** Parses HTML into a Document; the CLI injects one because it has no global `DOMParser`. */
export type DeixisParse = (html: string) => Document;

function hitOf(carrier: DeixisCarrier, text: string | null | undefined, locale: string): FigureDeixisHit | null {
  const found = findImageDeixis(text ?? '', locale);
  return found ? { carrier, text: text ?? '', match: found.match } : null;
}

/**
 * Carriers exactly as FR-17: every `<figure>` (image or video) has a paragraph above it only when its previous
 * ELEMENT sibling is a `<p>`; every `<figcaption>`; the `alt` of every `<img>`. One hit per carrier instance.
 * Never throws; a missing document or locale gives no hits.
 */
export function collectFigureDeixisFromDocument(doc: Document, locale: string): FigureDeixisHit[] {
  const hits: FigureDeixisHit[] = [];
  if (!doc || typeof doc.querySelectorAll !== 'function') return hits;
  try {
    for (const figure of Array.from(doc.querySelectorAll('figure'))) {
      const above = figure.previousElementSibling;
      if (above && above.tagName.toLowerCase() === 'p') {
        const hit = hitOf('paragraph', above.textContent, locale);
        if (hit) hits.push(hit);
      }
    }
    for (const caption of Array.from(doc.querySelectorAll('figcaption'))) {
      const hit = hitOf('figcaption', caption.textContent, locale);
      if (hit) hits.push(hit);
    }
    for (const img of Array.from(doc.querySelectorAll('img'))) {
      const hit = hitOf('alt', img.getAttribute('alt'), locale);
      if (hit) hits.push(hit);
    }
  } catch {
    return [];
  }
  return hits;
}

/**
 * Parses `html` (with the injected `parse`, else the global `DOMParser`) and returns its deixis hits. Malformed
 * HTML, a non-string input or no available parser gives `[]`; it never throws.
 */
export function collectFigureDeixis(html: string, locale: string, parse?: DeixisParse): FigureDeixisHit[] {
  if (typeof html !== 'string' || html.trim() === '') return [];
  try {
    let doc: Document;
    if (parse) {
      doc = parse(html);
    } else {
      const Parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
      if (typeof Parser !== 'function') return [];
      doc = new Parser().parseFromString(html, 'text/html');
    }
    return collectFigureDeixisFromDocument(doc, locale);
  } catch {
    return [];
  }
}

/**
 * FR-18: one `warning` (`rule: 'image-deixis'`) per figure whose paragraph above has a hit. The figcaption and
 * alt carriers produce no issue here (FR-18 carrier table); warnings never enter the repair loop.
 */
export function imageDeixisIssues(doc: Document, locale: string, context: string): ValidationIssue[] {
  return collectFigureDeixisFromDocument(doc, locale)
    .filter(hit => hit.carrier === 'paragraph')
    .map(hit => ({
      severity: 'warning' as const,
      rule: 'image-deixis',
      detail: `The paragraph directly above a figure points at the picture ("${hit.match}"). `
        + 'State a product fact there instead, written as if the picture did not exist.',
      context,
    }));
}
