/**
 * seo-number-format.ts
 *
 * Applies the number/unit formatting the HTML pipeline already runs to the one SEO field where
 * it is safe: meta_description.
 *
 * WHY THIS EXISTS
 * fixNumberFormatting() is applied to every HTML artifact (content-orchestrator.service.ts) and
 * has never been applied to the SEO JSON, so meta_description shipped in whatever shape the model
 * wrote it. Real output (XGRIDS L2 Pro, 2026-07-28): en-ES/es-ES/pt-PT all wrote "3cm RMSE
 * accuracy, 1mm ... 0.5-120m range" while the uk-UA entry was correct — a direct violation of the
 * "space between number and unit" acceptance criterion that no validator rule covers and no
 * fixer corrected.
 *
 * WHY ONLY meta_description
 * - meta_title has a hard 55-char budget the model is prompted to target (see PR #53, which
 *   existed precisely because a prompt budget exceeded what the validator accepts). Inserting
 *   NBSP after generation would silently eat the headroom the model was told it had.
 * - h1 must match the localized product name verbatim; it feeds the slug and the store's H1.
 * Both are returned byte-identical. A test pins that, because the field selection — not the
 * formatting — is what can regress here.
 *
 * WHY IT IS A MODULE AND NOT A LINE IN canonicalizeSeoData
 * The behaviour worth testing is the field selection, and canonicalizeSeoData is private on the
 * orchestrator. Testing through the public generate() would mean mocking an LLM provider and
 * running a four-step pipeline; widening the method's visibility for a test is worse. A pure
 * function is where every other deterministic pass in this codebase lives (fixNumberFormatting,
 * cyrillizeUnits, normalizeTerminology) and it is directly testable.
 *
 * ORDERING CONTRACT — load-bearing
 * The caller MUST run this BEFORE validateSeoMetadata. The formatter inserts NBSP, i.e. it ADDS
 * characters; a 154-char description becomes 157 and must be caught by the 155-char rule rather
 * than shipped under a measurement taken before the change. canonicalizeSeoData satisfies this:
 * it runs inside the repair gate's `produce`, whose result is what `validate` receives.
 *
 * Deliberately does NOT truncate an over-budget description. The CTA "➔" is the last character,
 * so trimming to fit would destroy it and trade meta-description-length for
 * meta-description-cta. An over-budget description is left over-budget so the repair ladder can
 * see it. The durable fix is prompt-side headroom in task-b.ts (FROZEN — separate change).
 *
 * Pure. No LLM, no DOM.
 */
import { fixNumberFormatting } from './number-format-fixer';
import type { SeoResponse } from '../app/types';

/**
 * @param productName optional; its invariant core is protected from the numeric transforms.
 *                    Without it a designator like "32/300" that arrived as "32 300" is
 *                    collapsed to "32300" HERE and nowhere else — which is exactly why
 *                    meta_description showed "32300" while h1/meta_title kept "32 300".
 */
export function normalizeSeoNumbers(seo: SeoResponse, productName = ''): SeoResponse {
  return {
    ...seo,
    seo_data: (seo.seo_data ?? []).map(item => ({
      ...item,
      // fixNumberFormatting is tag-aware via mapHtmlText; on a string with no tags the whole
      // value is a single text segment, so it behaves as a plain-text formatter here. It neither
      // decodes nor escapes entities, which is why "➔" and comma-decimals ("0,5") survive.
      meta_description: item.meta_description ? fixNumberFormatting(item.meta_description, productName) : item.meta_description,
    })),
  };
}
