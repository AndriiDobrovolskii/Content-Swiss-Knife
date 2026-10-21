/**
 * video-title.ts
 *
 * The per-language video strings — the fallback `<iframe title>` and the `<figcaption>` template.
 * Pure — no DOM, no dependencies.
 *
 * WHY IT LIVES HERE AND NOT IN video-figure.ts, where it started. render-description.ts needs it,
 * and that module's whole portability claim is "zero runtime dependencies, zero DOM APIs — runs
 * identically in the browser and under plain Node, which is what will let the BFF share it".
 * video-figure.ts calls `new DOMParser()`, so importing it from the renderer would quietly break
 * that guarantee for a six-line lookup table. Splitting the pure part out keeps both honest.
 *
 * video-figure.ts re-exports `videoFallbackTitle` so its existing callers and tests are unaffected.
 * That re-export becomes the only reason it imports this once wrapVideoFigures is deleted.
 */

/**
 * Used ONLY when no model-authored title exists — on the normal path the title is prose the model
 * was instructed to write in the body language, and it arrives via `VideoEmbed.title`.
 *
 * Deliberately shorter than, and textually distinct from, FIGCAPTION_TEMPLATES below:
 * the title is the frame's accessible name and the figcaption is visible text beside it, so
 * assistive tech reads both. Identical strings make it announce the same sentence twice.
 *
 * Third parallel locale map for video — see also LEAD_IN_TEMPLATES in video-manifest.ts and
 * FIGCAPTION_TEMPLATES below. Adding a language means adding it in all three. Same
 * primary-subtag keying and same English fallback as those two.
 */
const VIDEO_TITLE_FALLBACKS: Readonly<Record<string, (product: string) => string>> = {
  en: p => `Video: ${p}`,
  uk: p => `Відео: ${p}`,
  ru: p => `Видео: ${p}`,
  pl: p => `Wideo: ${p}`,
  de: p => `Video: ${p}`,
  es: p => `Vídeo: ${p}`,
  pt: p => `Vídeo: ${p}`,
};

/** The fallback iframe title for one product in one locale. */
export function videoFallbackTitle(productName: string, locale?: string): string {
  const lang = (locale ?? '').toLowerCase().split('-')[0];
  return (VIDEO_TITLE_FALLBACKS[lang] ?? VIDEO_TITLE_FALLBACKS['en'])(productName);
}

/**
 * Figcaption template per language, keyed by the BCP47 PRIMARY SUBTAG.
 *
 * This caption used to be hardcoded English and was emitted into the uk-UA master, which two
 * places in the repo already recorded as a defect: description-doc.ts notes that real artifacts
 * carry the target-language form ("Відеоогляд …"), and test/render-reconciliation.report.md logs
 * the same divergence between the renderer and this file.
 *
 * Keyed on the primary subtag, not the full locale, so en-GB/en-US/en-ES and es-ES/es-MX each
 * resolve without enumerating every region. An unmapped language falls back to English — the
 * previous behaviour exactly, so no locale can regress into a missing caption.
 *
 * Every form places the product name last and uninflected: product names are Latin brand strings
 * that stay nominative, which keeps the templates grammatical without case handling.
 */
const FIGCAPTION_TEMPLATES: Readonly<Record<string, (product: string) => string>> = {
  en: p => `Video review of ${p}`,
  uk: p => `Відеоогляд ${p}`,
  ru: p => `Видеообзор ${p}`,
  pl: p => `Recenzja wideo ${p}`,
  de: p => `Video-Review zu ${p}`,
  es: p => `Vídeo-reseña de ${p}`,
  pt: p => `Análise em vídeo de ${p}`,
};

/** The figcaption text for one product in one locale. Exported for the spec and the renderer. */
export function videoFigcaption(productName: string, locale?: string): string {
  const lang = (locale ?? '').toLowerCase().split('-')[0];
  return (FIGCAPTION_TEMPLATES[lang] ?? FIGCAPTION_TEMPLATES['en'])(productName);
}
