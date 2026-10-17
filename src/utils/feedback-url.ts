/**
 * Prefilled-link builder for the editors' improvement-request Google Form.
 *
 * Google Forms prefills a field by appending `entry.<id>=<value>` to the published
 * `/viewform` URL together with `usp=pp_url`. The entry IDs are printed by
 * `tools/feedback-form/create-form.gs` when the form is created; they live in
 * `src/environments/environment*.ts`, never in this file.
 */

export interface FeedbackFormConfig {
  /** Published `/viewform` URL. Empty until the form has been created. */
  baseUrl: string;
  /** `entry.<id>` of the "Хто подає запит?" question. */
  entryAuthor: string;
  /** `entry.<id>` of the "Де це трапилось?" question. */
  entryTool: string;
  /** `entry.<id>` of the "Сайт" question (auto-filled app-state snapshot). */
  entrySite: string;
  /** `entry.<id>` of the "Шаблон" question. */
  entryTemplate: string;
  /** `entry.<id>` of the "Назва продукту (снепшот)" question. */
  entryProductName: string;
  /** `entry.<id>` of the "Вхідний текст (снепшот)" question. */
  entryInputText: string;
  /** `entry.<id>` of the "Специфікації (снепшот)" question. */
  entrySpecs: string;
  /** `entry.<id>` of the "Додатковий контент (снепшот)" question. */
  entrySupplementalContent: string;
  /** `entry.<id>` of the "Кастомні інструкції (снепшот)" question. */
  entryCustomInstructions: string;
  /** `entry.<id>` of the "LLM Deep" question. */
  entryLlmDeep: string;
  /** `entry.<id>` of the "LLM Fast" question. */
  entryLlmFast: string;
  /** `entry.<id>` of the "Deep thinking увімкнено" question. */
  entryThinkingEnabled: string;
  /** `entry.<id>` of the "Сесія" question. */
  entrySessionId: string;
}

export interface FeedbackContext {
  author?: string;
  tool?: string;
  site?: string;
  template?: string;
  productName?: string;
  inputText?: string;
  specs?: string;
  supplementalContent?: string;
  customInstructions?: string;
  llmDeep?: string;
  llmFast?: string;
  thinkingEnabled?: string;
  sessionId?: string;
}

/**
 * How much of an encoded query-param value the URL prefill can safely carry. Cyrillic content —
 * the norm here — encodes to `%XX%XX` per character (6 encoded chars per 1 source char), so this
 * bounds the URL by post-encoding length rather than raw character count; a raw-character cap
 * would either mangle Latin text unnecessarily or still blow the URL budget on Cyrillic text.
 */
const MAX_ENCODED_FIELD_LEN = 1200;

/**
 * Truncates `value` so its `encodeURIComponent` form never exceeds `maxEncodedLen` bytes,
 * regardless of script. Binary search over the character offset, since encoded length isn't
 * linear in character count (an ASCII char costs 1-3 encoded chars, a Cyrillic char costs 6).
 * The full original is never lost — it lives on in the app itself, in HistoryService, and in
 * whatever ДО/ПІСЛЯ example the editor pastes by hand; this is "enough context to triage," not
 * an archival copy.
 */
export function truncateForUrl(value: string, maxEncodedLen = MAX_ENCODED_FIELD_LEN): string {
  if (encodeURIComponent(value).length <= maxEncodedLen) return value;

  let lo = 0, hi = value.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (encodeURIComponent(value.slice(0, mid)).length <= maxEncodedLen) lo = mid;
    else hi = mid - 1;
  }

  const cut = value.length - lo;
  return `${value.slice(0, lo).trim()}\n\n[✂ обрізано клієнтом: ${cut} символів не влізло в URL]`;
}

/**
 * Build the prefilled form URL, or `null` when the form is not configured yet —
 * the callers hide their buttons on `null` rather than ship a dead link.
 */
export function buildFeedbackUrl(cfg: FeedbackFormConfig, ctx: FeedbackContext): string | null {
  const base = cfg.baseUrl.trim();
  if (!base) return null;

  const params: string[] = [];
  const add = (entry: string, value: string | undefined) => {
    const trimmed = value?.trim();
    if (!entry || !trimmed) return;
    params.push(`${entry}=${encodeURIComponent(trimmed)}`);
  };
  const addLarge = (entry: string, value: string | undefined) => {
    const trimmed = value?.trim();
    if (!entry || !trimmed) return;
    add(entry, truncateForUrl(trimmed));
  };

  add(cfg.entryAuthor, ctx.author);
  add(cfg.entryTool, ctx.tool);
  add(cfg.entrySite, ctx.site);
  add(cfg.entryTemplate, ctx.template);
  add(cfg.entryProductName, ctx.productName);
  addLarge(cfg.entryInputText, ctx.inputText);
  addLarge(cfg.entrySpecs, ctx.specs);
  addLarge(cfg.entrySupplementalContent, ctx.supplementalContent);
  addLarge(cfg.entryCustomInstructions, ctx.customInstructions);
  add(cfg.entryLlmDeep, ctx.llmDeep);
  add(cfg.entryLlmFast, ctx.llmFast);
  add(cfg.entryThinkingEnabled, ctx.thinkingEnabled);
  add(cfg.entrySessionId, ctx.sessionId);

  if (!params.length) return base;

  // The published URL may already carry a query string (e.g. `?usp=sf_link`).
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}usp=pp_url&${params.join('&')}`;
}
