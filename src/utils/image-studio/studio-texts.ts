/**
 * The Image Studio text dictionary (US-10.1 FR-77, SD-13, SD-29, DD-24).
 *
 * Every text is `{ en, uk }` keyed by its Specification id, and `studioText` resolves it for a language AT THE
 * MOMENT it is needed, so a language toggle re-renders everything and an announcement uses the value current when
 * it is made. There is no silent fallback: an unknown id, an unknown language, an empty value or a placeholder
 * left unfilled throws.
 */
export interface StudioText {
  en: string;
  uk: string;
}

/**
 * Every text of the Image Studio, keyed by the Specification id (US-10.1 FR-77, SD-13, SD-29, DD-24).
 *
 * T-n, T-15a..d, T-16..T-21, T-23 and PRN-n are the Interface text table (confirmed in OD-41); X-n are the
 * additional texts of the plan (SD-29). T-22 is one table row of six control labels, held under six keys that
 * start with "T-22". Placeholders: {V} {M} {I} (T-9), {N} (T-17), {amount} (X-10), {n} (X-27).
 *
 * Model-facing text is NOT in this file (it is English only, SD-21). The control label of the navigation entry
 * (X-28) lives in app.component.ts.
 */
export const STUDIO_TEXTS: Readonly<Record<string, StudioText>> = {
  "T-1": { en: "Unsupported file format. Allowed formats: PNG, JPG, WEBP.", uk: "Непідтримуваний формат файлу. Дозволені формати: PNG, JPG, WEBP." },
  "T-2": { en: "File is too large: the maximum size is 5 MB.", uk: "Файл завеликий: максимальний розмір — 5 МБ." },
  "T-3": { en: "You can attach no more than 5 images to one message.", uk: "До одного повідомлення можна додати не більше 5 зображень." },
  "T-4": { en: "The request was blocked by the safety filter. Try rephrasing it.", uk: "Запит заблоковано фільтром безпеки. Спробуйте сформулювати його інакше." },
  "T-5": { en: "The model returned an empty or truncated response. Please try again.", uk: "Модель повернула порожню або обірвану відповідь. Спробуйте ще раз." },
  "T-6": { en: "The response timed out (120 s).", uk: "Час очікування відповіді (120 с) вичерпано." },
  "T-7": { en: "The service is temporarily unavailable. Please try again.", uk: "Сервіс тимчасово недоступний. Спробуйте ще раз." },
  "T-8": { en: "The request is too large and cannot be processed.", uk: "Запит завеликий і не може бути оброблений." },
  "T-9": { en: "To stay within the limits, the following were permanently deleted from this device: versions: {V}, messages: {M}, images attached to them: {I}.", uk: "Щоб вкластися в ліміти, назавжди видалено з цього пристрою: версій — {V}, повідомлень — {M}, доданих у них зображень — {I}." },
  "T-10": { en: "The uploaded files could not be restored. Please add the images again.", uk: "Не вдалося відновити завантажені файли. Додайте зображення знову." },
  "T-11": { en: "Gemini API key is required for Image Studio", uk: "Для Image Studio потрібен ключ Gemini API" },
  "T-12": { en: "API error", uk: "Помилка API" },
  "T-13": { en: "Generation limit exceeded (30 per hour). Please try again later.", uk: "Перевищено ліміт генерацій (30 на годину). Спробуйте пізніше." },
  "T-14": { en: "The session is too large. Please start a new session from the latest version", uk: "Сесія занадто велика. Будь ласка, почніть нову сесію з останньої версії" },
  "T-15a": { en: "Remove background", uk: "Прибрати фон" },
  "T-15b": { en: "Brighter", uk: "Світліше" },
  "T-15c": { en: "Softer shadow", uk: "Тінь м'якша" },
  "T-15d": { en: "Different angle", uk: "Інший ракурс" },
  "T-16": { en: "Generating…", uk: "Генерую…" },
  "T-17": { en: "Version v{N} is ready", uk: "Версію v{N} готово" },
  "T-18": { en: "Generation cancelled.", uk: "Генерацію скасовано." },
  "T-19": { en: "Gemini images carry an invisible SynthID watermark that cannot be removed.", uk: "Зображення Gemini містять невидимий водяний знак SynthID, який неможливо видалити." },
  "T-20": { en: "Could not save to browser storage: the storage quota is exceeded. Free up browser storage and try again.", uk: "Не вдалося зберегти у сховищі браузера: перевищено квоту. Звільніть місце у сховищі браузера та спробуйте ще раз." },
  "T-21": { en: "Generated image", uk: "Згенероване зображення" },
  "T-23": { en: "Start a new session? The current session stays in the session list.", uk: "Почати нову сесію? Поточна сесія залишиться у списку сесій." },
  "PRN-1": { en: "White background", uk: "Білий фон" },
  "PRN-2": { en: "Lifestyle", uk: "Лайфстайл" },
  "PRN-3": { en: "Banner", uk: "Банер" },
  "PRN-4": { en: "Social", uk: "Соцмережі" },
  "PRN-5": { en: "Detail close-up", uk: "Деталь крупним планом" },
  "T-22.cancel": { en: "Cancel", uk: "Скасувати" },
  "T-22.retry": { en: "Retry", uk: "Повторити" },
  "T-22.newSession": { en: "New session", uk: "Нова сесія" },
  "T-22.editVersion": { en: "Edit this version", uk: "Редагувати цю версію" },
  "T-22.downloadAll": { en: "Download all versions", uk: "Завантажити всі версії" },
  "T-22.copy": { en: "Copy to clipboard", uk: "Копіювати в буфер обміну" },
  "X-1": { en: "Send", uk: "Надіслати" },
  "X-2": { en: "Attach images", uk: "Додати зображення" },
  "X-3": { en: "Drag images here, paste with Ctrl+V, or use the button", uk: "Перетягніть зображення сюди, вставте через Ctrl+V або скористайтеся кнопкою" },
  "X-4": { en: "Aspect ratio", uk: "Співвідношення сторін" },
  "X-5": { en: "Resolution", uk: "Роздільна здатність" },
  "X-6": { en: "Model", uk: "Модель" },
  "X-7": { en: "Download format", uk: "Формат завантаження" },
  "X-8": { en: "Download", uk: "Завантажити" },
  "X-9": { en: "Sessions", uk: "Сесії" },
  "X-10": { en: "Estimated cost: {amount}", uk: "Орієнтовна вартість: {amount}" },
  "X-11": { en: "Product name", uk: "Назва товару" },
  "X-12": { en: "Describe the image", uk: "Опишіть зображення" },
  "X-13": { en: "Presets", uk: "Пресети" },
  "X-14": { en: "Remove image", uk: "Видалити зображення" },
  "X-15": { en: "Close", uk: "Закрити" },
  "X-16": { en: "Versions", uk: "Версії" },
  "X-17": { en: "Version preview", uk: "Перегляд версії" },
  "X-18": { en: "Could not download the image.", uk: "Не вдалося завантажити зображення." },
  "X-19": { en: "Could not convert the image to the selected format.", uk: "Не вдалося конвертувати зображення у вибраний формат." },
  "X-20": { en: "Could not copy the image to the clipboard.", uk: "Не вдалося скопіювати зображення в буфер обміну." },
  "X-21": { en: "Could not build the ZIP archive.", uk: "Не вдалося створити ZIP-архів." },
  "X-22": { en: "The image data for this version is not available.", uk: "Дані зображення цієї версії недоступні." },
  "X-23": { en: "Uploading…", uk: "Завантаження…" },
  "X-24": { en: "Quick edits", uk: "Швидкі правки" },
  "X-25": { en: "Attached images", uk: "Додані зображення" },
  "X-26": { en: "Conversation", uk: "Розмова" },
  "X-27": { en: "Version v{n} attached for editing", uk: "Версію v{n} додано для редагування" },
};

export type StudioLanguage = 'en' | 'uk';

/** Values for the placeholders of a text: {V} {M} {I} (T-9), {N} (T-17), {amount} (X-10), {n} (X-27). */
export type StudioTextParams = Record<string, string | number>;

export function studioText(id: string, lang: StudioLanguage, params: StudioTextParams = {}): string {
  const entry = Object.prototype.hasOwnProperty.call(STUDIO_TEXTS, id) ? STUDIO_TEXTS[id] : undefined;
  if (!entry) throw new Error(`Unknown studio text id: ${String(id)}`);
  if (lang !== 'en' && lang !== 'uk') throw new Error(`Unsupported studio language: ${String(lang)}`);
  const template = entry[lang];
  if (typeof template !== 'string' || template.trim() === '') throw new Error(`Studio text ${id} has no ${lang} value`);

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = Object.prototype.hasOwnProperty.call(params, name) ? params[name] : undefined;
    if (value === undefined || value === null) throw new Error(`Studio text ${id}: placeholder {${name}} was not filled`);
    return String(value);
  });
}
