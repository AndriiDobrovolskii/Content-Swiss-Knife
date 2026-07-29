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
}

export interface FeedbackContext {
  author?: string;
  tool?: string;
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
  add(cfg.entryAuthor, ctx.author);
  add(cfg.entryTool, ctx.tool);

  if (!params.length) return base;

  // The published URL may already carry a query string (e.g. `?usp=sf_link`).
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}usp=pp_url&${params.join('&')}`;
}
