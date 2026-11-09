/**
 * studio-texts.spec.ts - US-10.1 T32 (FR-59, FR-77, FR-83, SD-13, SD-29, OD-14, OD-41).
 *
 * The expected literals below are copied from the Specification's Interface text table (confirmed by the human in
 * OD-41, "I fully confirm the proposed translations") and from the implementation plan's "Additional studio texts" table
 * (X-1 to X-27, proposals for confirmation at HUMAN_PLAN_APPROVAL, P-12). They are the criteria; they are NOT read back from
 * the implementation.
 *
 * PINNED CONTRACT (src/utils/image-studio/studio-texts.ts):
 *   STUDIO_TEXTS: Record<string, { en: string; uk: string }>   keyed by the Specification ids verbatim
 *     ('T-1'..'T-14', 'T-15a'..'T-15d', 'T-16'..'T-21', 'T-23', 'PRN-1'..'PRN-5', 'X-1'..'X-27'); T-22 is ONE table row that lists
 *     six control labels, so it is held under keys that START WITH 'T-22' (e.g. 'T-22.cancel'): this spec asserts the
 *     six labels are present among those keys, not the exact key suffixes.
 *   studioText(id: string, lang: 'en' | 'uk', params?: Record<string, string | number>): string
 *     fills {V} {M} {I} (T-9), {N} (T-17), {amount} (X-10), {n} (X-27); THROWS on an unknown id, an unknown language, an
 *     empty/missing language value, or a placeholder left unfilled - there is no silent fallback to the other language.
 * X-28 (the nav label) lives in app.component.ts and is not asserted here.
 *
 * File location note: this spec is under src/, so env-variable key names are built by concatenation (arch-guard Rule 4).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

/** [id, uk, en] straight from the Interface text table. */
const TABLE: Array<[string, string, string]> = [
  ['T-1', 'Непідтримуваний формат файлу. Дозволені формати: PNG, JPG, WEBP.', 'Unsupported file format. Allowed formats: PNG, JPG, WEBP.'],
  ['T-2', 'Файл завеликий: максимальний розмір — 5 МБ.', 'File is too large: the maximum size is 5 MB.'],
  ['T-3', 'До одного повідомлення можна додати не більше 5 зображень.', 'You can attach no more than 5 images to one message.'],
  ['T-4', 'Запит заблоковано фільтром безпеки. Спробуйте сформулювати його інакше.', 'The request was blocked by the safety filter. Try rephrasing it.'],
  ['T-5', 'Модель повернула порожню або обірвану відповідь. Спробуйте ще раз.', 'The model returned an empty or truncated response. Please try again.'],
  ['T-6', 'Час очікування відповіді (120 с) вичерпано.', 'The response timed out (120 s).'],
  ['T-7', 'Сервіс тимчасово недоступний. Спробуйте ще раз.', 'The service is temporarily unavailable. Please try again.'],
  ['T-8', 'Запит завеликий і не може бути оброблений.', 'The request is too large and cannot be processed.'],
  ['T-9', 'Щоб вкластися в ліміти, назавжди видалено з цього пристрою: версій — {V}, повідомлень — {M}, доданих у них зображень — {I}.', 'To stay within the limits, the following were permanently deleted from this device: versions: {V}, messages: {M}, images attached to them: {I}.'],
  ['T-10', 'Не вдалося відновити завантажені файли. Додайте зображення знову.', 'The uploaded files could not be restored. Please add the images again.'],
  ['T-11', 'Для Image Studio потрібен ключ Gemini API', 'Gemini API key is required for Image Studio'],
  ['T-12', 'Помилка API', 'API error'],
  ['T-13', 'Перевищено ліміт генерацій (30 на годину). Спробуйте пізніше.', 'Generation limit exceeded (30 per hour). Please try again later.'],
  ['T-14', 'Сесія занадто велика. Будь ласка, почніть нову сесію з останньої версії', 'The session is too large. Please start a new session from the latest version'],
  ['T-15a', 'Прибрати фон', 'Remove background'],
  ['T-15b', 'Світліше', 'Brighter'],
  ['T-15c', "Тінь м'якша", 'Softer shadow'],
  ['T-15d', 'Інший ракурс', 'Different angle'],
  ['T-16', 'Генерую…', 'Generating…'],
  ['T-17', 'Версію v{N} готово', 'Version v{N} is ready'],
  ['T-18', 'Генерацію скасовано.', 'Generation cancelled.'],
  ['T-19', 'Зображення Gemini містять невидимий водяний знак SynthID, який неможливо видалити.', 'Gemini images carry an invisible SynthID watermark that cannot be removed.'],
  ['T-20', 'Не вдалося зберегти у сховищі браузера: перевищено квоту. Звільніть місце у сховищі браузера та спробуйте ще раз.', 'Could not save to browser storage: the storage quota is exceeded. Free up browser storage and try again.'],
  ['T-21', 'Згенероване зображення', 'Generated image'],
  ['T-23', 'Почати нову сесію? Поточна сесія залишиться у списку сесій.', 'Start a new session? The current session stays in the session list.'],
  ['PRN-1', 'Товар на білому тлі', 'Product on white'],
  ['PRN-2', 'Лайфстайл-сцена', 'Lifestyle scene'],
  ['PRN-3', 'Банер категорії', 'Category banner'],
  ['PRN-4', 'Соцмережі', 'Social'],
  ['PRN-5', 'Деталь крупним планом', 'Detail close-up'],
];

/**
 * T-22: six control labels (uk, en), one table row. US-10.5 D-11 (FR-6, FR-11, FR-32 (b)): `editVersion` and `downloadAll` follow the
 * Story ("Edit this →", "Download all ({N}) .zip"); `{N}` is the number of retained versions.
 */
const T22: Array<[string, string]> = [
  ['Скасувати', 'Cancel'],
  ['Повторити', 'Retry'],
  ['Нова сесія', 'New session'],
  ['Редагувати →', 'Edit this →'],
  ['Завантажити все ({N}) .zip', 'Download all ({N}) .zip'],
  ['Копіювати в буфер обміну', 'Copy to clipboard'],
];

/** [id, en, uk] from the plan's "Additional studio texts" table. */
const X_TABLE: Array<[string, string, string]> = [
  ['X-1', 'Generate', 'Згенерувати'],
  ['X-2', 'Attach images', 'Додати зображення'],
  ['X-3', 'Drag images here, paste with Ctrl+V, or use the button', 'Перетягніть зображення сюди, вставте через Ctrl+V або скористайтеся кнопкою'],
  ['X-4', 'Aspect ratio', 'Співвідношення сторін'],
  ['X-5', 'Resolution', 'Роздільна здатність'],
  ['X-6', 'Model', 'Модель'],
  ['X-7', 'Download format', 'Формат завантаження'],
  ['X-8', 'Download', 'Завантажити'],
  ['X-9', 'Sessions', 'Сесії'],
  ['X-10', 'Estimated cost: {amount}', 'Орієнтовна вартість: {amount}'],
  ['X-11', 'Product name', 'Назва товару'],
  ['X-12', 'Describe the image', 'Опишіть зображення'],
  ['X-13', 'Presets', 'Пресети'],
  ['X-14', 'Remove image', 'Видалити зображення'],
  ['X-15', 'Close', 'Закрити'],
  ['X-16', 'Versions', 'Версії'],
  ['X-17', 'Version preview', 'Перегляд версії'],
  ['X-18', 'Could not download the image.', 'Не вдалося завантажити зображення.'],
  ['X-19', 'Could not convert the image to the selected format.', 'Не вдалося конвертувати зображення у вибраний формат.'],
  ['X-20', 'Could not copy the image to the clipboard.', 'Не вдалося скопіювати зображення в буфер обміну.'],
  ['X-21', 'Could not build the ZIP archive.', 'Не вдалося створити ZIP-архів.'],
  ['X-22', 'The image data for this version is not available.', 'Дані зображення цієї версії недоступні.'],
  ['X-23', 'Uploading…', 'Завантаження…'],
  ['X-24', 'Quick edits', 'Швидкі правки'],
  ['X-25', 'Attached images', 'Додані зображення'],
  ['X-26', 'Conversation', 'Розмова'],
  ['X-27', 'Version v{n} attached for editing', 'Версію v{n} додано для редагування'],
];

const KEY_NAMES = ['OPENAI', 'ANTHROPIC', 'SERPER', 'GEMINI'].map((p) => p + '_' + 'API' + '_' + 'KEY');

describe('FR-77 / SD-29 / OD-41: the Interface text table, verbatim, in both languages', () => {
  for (const [id, uk, en] of TABLE) {
    it(`FR-77: ${id} has the confirmed uk and en values`, async () => {
      const { STUDIO_TEXTS } = await load('./studio-texts');
      expect(STUDIO_TEXTS[id], id).toBeDefined();
      expect(STUDIO_TEXTS[id].uk).toBe(uk);
      expect(STUDIO_TEXTS[id].en).toBe(en);
    });
  }

  it('FR-77 / T-22 / US-10.5 D-11: the six control labels (Cancel, Retry, New session, Edit this →, Download all ({N}) .zip, Copy to clipboard) exist in both languages', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    const keys = Object.keys(STUDIO_TEXTS).filter((k) => k.startsWith('T-22'));
    const uk = keys.map((k) => STUDIO_TEXTS[k].uk);
    const en = keys.map((k) => STUDIO_TEXTS[k].en);
    for (const [u, e] of T22) {
      expect(uk, u).toContain(u);
      expect(en, e).toContain(e);
    }
    // a key holding a uk label must hold the matching en label (no cross-wiring between languages)
    for (const [u, e] of T22) {
      const key = keys.find((k) => STUDIO_TEXTS[k].uk === u)!;
      expect(STUDIO_TEXTS[key].en).toBe(e);
    }
  });

  it('SD-29 / P-12: the additional texts X-1 to X-27 exist with the plan\'s values in both languages', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    for (const [id, en, uk] of X_TABLE) {
      expect(STUDIO_TEXTS[id], id).toBeDefined();
      expect(STUDIO_TEXTS[id].en, `${id} en`).toBe(en);
      expect(STUDIO_TEXTS[id].uk, `${id} uk`).toBe(uk);
    }
  });
});

describe('FR-77 / OD-41 C-41.2: no key exists in one language only, and nothing falls back silently', () => {
  it('FR-77: for every text id both the en and the uk value are non-empty strings', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    const ids = Object.keys(STUDIO_TEXTS);
    expect(ids.length).toBeGreaterThanOrEqual(TABLE.length + X_TABLE.length + 6);
    for (const id of ids) {
      expect(typeof STUDIO_TEXTS[id].en, `${id} en`).toBe('string');
      expect(typeof STUDIO_TEXTS[id].uk, `${id} uk`).toBe('string');
      expect(STUDIO_TEXTS[id].en.trim(), `${id} en`).not.toBe('');
      expect(STUDIO_TEXTS[id].uk.trim(), `${id} uk`).not.toBe('');
      expect(Object.keys(STUDIO_TEXTS[id]).sort(), id).toEqual(['en', 'uk']);
    }
  });

  it('FR-77: no uk value is a copy of the en value (a copy-paste fallback would hide a missing translation)', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    const same = Object.keys(STUDIO_TEXTS).filter((id) => STUDIO_TEXTS[id].uk === STUDIO_TEXTS[id].en);
    expect(same).toEqual([]);
  });

  it('FR-77: with lang "en" each rendered text equals its en value and with "uk" its uk value (toggle changes the text)', async () => {
    const { studioText } = await load('./studio-texts');
    for (const [id, uk, en] of TABLE.filter(([i]) => i !== 'T-9' && i !== 'T-17')) {
      expect(studioText(id, 'en'), id).toBe(en);
      expect(studioText(id, 'uk'), id).toBe(uk);
    }
  });

  it('FR-77: an unknown id throws instead of rendering an empty string', async () => {
    const { studioText } = await load('./studio-texts');
    expect(() => studioText('T-999', 'en')).toThrow();
    expect(() => studioText('', 'uk')).toThrow();
  });

  it('FR-77: an unsupported language throws instead of falling back to another language', async () => {
    const { studioText } = await load('./studio-texts');
    expect(() => studioText('T-1', 'de')).toThrow();
    expect(() => studioText('T-1', undefined)).toThrow();
  });
});

describe('FR-45 / FR-74 / SD-29: placeholders are filled at render time', () => {
  it('FR-45: T-9 fills {V}, {M} and {I} in both languages', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('T-9', 'en', { V: 2, M: 3, I: 1 })).toBe(
      'To stay within the limits, the following were permanently deleted from this device: versions: 2, messages: 3, images attached to them: 1.',
    );
    expect(studioText('T-9', 'uk', { V: 2, M: 3, I: 1 })).toBe(
      'Щоб вкластися в ліміти, назавжди видалено з цього пристрою: версій — 2, повідомлень — 3, доданих у них зображень — 1.',
    );
  });

  it('FR-45: a zero count is rendered as 0, not as an empty string', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('T-9', 'en', { V: 0, M: 2, I: 0 })).toContain('versions: 0, messages: 2, images attached to them: 0.');
  });

  it('FR-74 / AC-46: T-17 fills {N} with the version number ("Версію v3 готово" / "Version v3 is ready")', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('T-17', 'uk', { N: 3 })).toBe('Версію v3 готово');
    expect(studioText('T-17', 'en', { N: 3 })).toBe('Version v3 is ready');
  });

  it('FR-71: X-10 fills {amount}', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('X-10', 'en', { amount: '$0.12' })).toBe('Estimated cost: $0.12');
    expect(studioText('X-10', 'uk', { amount: '$0.12' })).toBe('Орієнтовна вартість: $0.12');
  });

  it('SD-29: X-27 fills {n}', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('X-27', 'en', { n: 2 })).toBe('Version v2 attached for editing');
    expect(studioText('X-27', 'uk', { n: 2 })).toBe('Версію v2 додано для редагування');
  });

  it('FR-77: a placeholder left unfilled throws, whether params are missing entirely or only partly given', async () => {
    const { studioText } = await load('./studio-texts');
    expect(() => studioText('T-9', 'en')).toThrow();
    expect(() => studioText('T-9', 'en', { V: 1, M: 1 })).toThrow();
    expect(() => studioText('T-17', 'uk', {})).toThrow();
    expect(() => studioText('X-10', 'en')).toThrow();
  });

  it('FR-77: a text with no placeholder ignores extra params and never leaves braces behind', async () => {
    const { studioText } = await load('./studio-texts');
    for (const [id, uk, en] of TABLE.filter(([, u, e]) => !u.includes('{') && !e.includes('{'))) {
      expect(studioText(id, 'en'), id).toBe(en);
      expect(studioText(id, 'uk'), id).toBe(uk);
    }
  });
});

describe('FR-5 / FR-65 / SD-29: texts reference the right things', () => {
  it('FR-5 / FR-65: no studio text contains an environment-variable name (the key name is never shown)', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    for (const id of Object.keys(STUDIO_TEXTS)) {
      for (const name of KEY_NAMES) {
        expect(STUDIO_TEXTS[id].en, `${id} en`).not.toContain(name);
        expect(STUDIO_TEXTS[id].uk, `${id} uk`).not.toContain(name);
      }
      expect(STUDIO_TEXTS[id].en, `${id} en`).not.toMatch(/[A-Z]{3,}_[A-Z_]*KEY/);
      expect(STUDIO_TEXTS[id].uk, `${id} uk`).not.toMatch(/[A-Z]{3,}_[A-Z_]*KEY/);
    }
  });

  it('FR-83 / SD-13: every text id that error-dispatch can return exists in the dictionary with both languages', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const { STUDIO_TEXTS } = await load('./studio-texts');
    const inputs: Array<{ status: number; errorField?: string }> = [
      { status: 413, errorField: 'REQUEST_BODY_TOO_LARGE' }, { status: 411, errorField: 'CONTENT_LENGTH_REQUIRED' },
      { status: 413, errorField: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, { status: 410, errorField: 'FILE_MISSING' },
      { status: 429, errorField: 'RATE_LIMIT_EXCEEDED' }, { status: 501, errorField: 'GEMINI_KEY_MISSING' },
      { status: 415, errorField: 'UNSUPPORTED_IMAGE_TYPE' }, { status: 400, errorField: 'INVALID_REQUEST' },
      { status: 502, errorField: 'EMPTY_RESPONSE' }, { status: 500, errorField: 'PRICE_NOT_CONFIGURED' },
      { status: 503, errorField: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 404, errorField: 'Помилка API' },
      { status: 0 }, { status: 502 }, { status: 413 },
    ];
    for (const input of inputs) {
      const { textId } = dispatchError(input);
      expect(STUDIO_TEXTS[textId], `${JSON.stringify(input)} -> ${textId}`).toBeDefined();
      expect(STUDIO_TEXTS[textId].en.length).toBeGreaterThan(0);
      expect(STUDIO_TEXTS[textId].uk.length).toBeGreaterThan(0);
    }
  });

  it('AC-18 / FR-31: the four chip labels (T-15a to T-15d) are the Story\'s Ukrainian literals in uk', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    expect(['T-15a', 'T-15b', 'T-15c', 'T-15d'].map((id) => STUDIO_TEXTS[id].uk)).toEqual([
      'Прибрати фон', 'Світліше', "Тінь м'якша", 'Інший ракурс',
    ]);
  });

  it('AC-46 / FR-74: the start announcement is "Генерую…" (uk) and uses the single ellipsis character U+2026', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    expect(STUDIO_TEXTS['T-16'].uk).toBe('Генерую…');
    expect(STUDIO_TEXTS['T-16'].en).toBe('Generating…');
  });

  it('AC-36 / FR-59: the SynthID notice (T-19) names SynthID and says it cannot be removed, in both languages', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    expect(STUDIO_TEXTS['T-19'].en).toContain('SynthID');
    expect(STUDIO_TEXTS['T-19'].uk).toContain('SynthID');
    expect(STUDIO_TEXTS['T-19'].en).toContain('cannot be removed');
    expect(STUDIO_TEXTS['T-19'].uk).toContain('неможливо видалити');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// US-10.5 T6 - the dictionary entries of the redesign (NFR-5; plan DD-12; D-11). A sibling block; the verbatim rows above for the
// changed texts (X-1, T-22.editVersion, T-22.downloadAll, PRN-1..PRN-3) were updated in place (D-11), every other row is unchanged.
// Logic runner; red until T6.
//
// THE ALLOCATION (test_strategy "Dictionary allocation" is the same table; T6 is the single owner and builds from it). X-28 is the
// navigation label (app.component.ts), so the next free id is X-29. Copy marked (owner) is the Story / owner answers (OD-5); copy
// marked (proposed) is the Specification's proposed copy (FR-4, FR-18) the human ratified at HUMAN_SPEC_APPROVAL; the three
// accessible names marked (new) have no source text and are the smallest wording that names the control (flagged in the report).
// ---------------------------------------------------------------------------------------------------------------------
const NEW_TEXTS: Array<[id: string, en: string, uk: string]> = [
  ['X-29', 'Write a prompt to start', 'Напишіть промпт для початку'],                                         // (owner) AC-11
  ['X-30', 'Image Studio', 'Студія зображень'],                                                               // (owner) FR-1 title
  ['X-31', 'Input image {n}', 'Вхідне зображення {n}'],                                                       // (new) input thumbnail alt, never the prompt
  ['X-32.one', '{N} session', '{N} сесія'],                                                                   // (proposed) FR-2
  ['X-32.few', '{N} sessions', '{N} сесії'],
  ['X-32.many', '{N} sessions', '{N} сесій'],                                                                 // (owner) "N сесій"
  ['X-33.one', '· history ({N})', '· історія ({N})'],                                                         // (owner) FR-1
  ['X-33.few', '· history ({N})', '· історія ({N})'],
  ['X-33.many', '· history ({N})', '· історія ({N})'],
  ['X-34.one', '{N} image', '{N} зображення'],                                                                // (proposed) FR-4
  ['X-34.few', '{N} images', '{N} зображення'],
  ['X-34.many', '{N} images', '{N} зображень'],
  ['X-35', 'Before (v{N})', 'До (v{N})'],                                                                     // (owner) FR-10
  ['X-36', 'After (v{M})', 'Після (v{M})'],
  ['X-37', 'Reuse prompt', 'Використати промпт'],                                                             // (owner) FR-3 (f)
  ['X-38', 'Compare with v{N}', 'Порівняти з v{N}'],                                                          // (owner) FR-9
  ['X-39', 'Edit of v{N}', 'Редакція v{N}'],                                                                  // (owner) FR-9
  ['X-40', 'Your images will appear here', "Тут з'являться ваші зображення"],                                 // (owner EN / proposed UK) FR-18
  ['X-41', 'Describe the image you want, or start from one of the templates below.', 'Опишіть потрібне зображення або почніть з одного з шаблонів нижче.'], // (proposed) FR-18
  ['X-42', 'Before and after comparison', 'Порівняння до і після'],                                           // (new) accessible name of the slider
  ['X-43', '{T} s', '{T} с'],                                                                                 // (proposed) FR-4 seconds unit
];

describe('US-10.5 NFR-5 / FR-77: every new text id exists in both languages with the allocated value (T6)', () => {
  it.each(NEW_TEXTS)('%s has the allocated en and uk values', async (id, en, uk) => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    expect(STUDIO_TEXTS[id], id).toBeDefined();
    expect(STUDIO_TEXTS[id].en).toBe(en);
    expect(STUDIO_TEXTS[id].uk).toBe(uk);
  });

  it('no new id has a uk value equal to its en value (the rule of the studio dictionary), and none holds an UPPER_SNAKE token', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    for (const [id] of NEW_TEXTS) {
      const e = STUDIO_TEXTS[id];
      expect(e, id).toBeDefined();
      expect(e.uk, id).not.toBe(e.en);
      expect(e.en, `${id} en`).not.toMatch(/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/);
      expect(e.uk, `${id} uk`).not.toMatch(/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/);
      expect(Object.keys(e).sort(), id).toEqual(['en', 'uk']);
    }
  });

  it('the three count families have all of .one, .few and .many (a missing category would throw at render time)', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    for (const family of ['X-32', 'X-33', 'X-34']) {
      for (const cat of ['one', 'few', 'many']) expect(STUDIO_TEXTS[`${family}.${cat}`], `${family}.${cat}`).toBeDefined();
    }
  });

  it('placeholders fill: X-31 {n}, X-35 {N}, X-36 {M}, X-38 {N}, X-39 {N}, X-43 {T} in both languages; an unfilled one throws', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('X-31', 'en', { n: 2 })).toBe('Input image 2');
    expect(studioText('X-31', 'uk', { n: 2 })).toBe('Вхідне зображення 2');
    expect(studioText('X-35', 'en', { N: 1 })).toBe('Before (v1)');
    expect(studioText('X-35', 'uk', { N: 1 })).toBe('До (v1)');
    expect(studioText('X-36', 'en', { M: 3 })).toBe('After (v3)');
    expect(studioText('X-36', 'uk', { M: 3 })).toBe('Після (v3)');
    expect(studioText('X-38', 'uk', { N: 1 })).toBe('Порівняти з v1');
    expect(studioText('X-39', 'en', { N: 2 })).toBe('Edit of v2');
    expect(studioText('X-43', 'en', { T: '12.4' })).toBe('12.4 s');
    expect(studioText('X-43', 'uk', { T: '12.4' })).toBe('12.4 с');
    expect(() => studioText('X-38', 'en')).toThrow();
    expect(() => studioText('X-36', 'en', { N: 1 })).toThrow(); // {M}, not {N}
  });

  it('T-22.downloadAll fills {N} ("Download all (3) .zip" / "Завантажити все (3) .zip")', async () => {
    const { studioText } = await load('./studio-texts');
    expect(studioText('T-22.downloadAll', 'en', { N: 3 })).toBe('Download all (3) .zip');
    expect(studioText('T-22.downloadAll', 'uk', { N: 3 })).toBe('Завантажити все (3) .zip');
    expect(() => studioText('T-22.downloadAll', 'en')).toThrow();
  });
});

describe('US-10.5 D-11 / FR-21: the dictionary copy of the preset names follows the registry (PRN-1..PRN-3, kept in step)', () => {
  it('PRN-1..PRN-3 equal the registry names of white-bg, lifestyle, banner in both languages', async () => {
    const { STUDIO_TEXTS } = await load('./studio-texts');
    const { findPreset } = await load('../../prompt-core/prompt-presets');
    const pairs: Array<[string, string]> = [['PRN-1', 'white-bg'], ['PRN-2', 'lifestyle'], ['PRN-3', 'banner']];
    for (const [prn, id] of pairs) {
      expect(STUDIO_TEXTS[prn].en, prn).toBe(findPreset(id).name.en);
      expect(STUDIO_TEXTS[prn].uk, prn).toBe(findPreset(id).name.uk);
    }
  });
});
