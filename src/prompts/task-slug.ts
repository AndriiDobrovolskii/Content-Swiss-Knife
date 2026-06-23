import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

const TASK_SLUG_SYSTEM = `You are a technical SEO specialist and content manager for OpenCart 3.x stores selling
3D-printing, 3D-scanning, and laser-engraving equipment. Output is ALWAYS raw JSON only —
no preamble, no Markdown fences, no commentary.`;

const TASK_SLUG_INSTRUCTION = `TASK SLUG — GENERATE LOCALIZED PRODUCT NAMES + SEO URL SLUGS (RAW JSON ONLY).

For EACH requested BCP-47 language, produce a localized product "name" and a "slug".

LANGUAGE STANDARDS (no Americanisms unless the marker is American):
- en-GB / en-ES : British/European English (vapour, colour, optimise). en-ES = English aimed at the
  Spanish market, same British spelling, no Americanisms.
- en-US        : American English (vapor, color, optimize).
- es-ES        : Castilian Spanish of Spain. No Latin-American terms (ordenador, impresión 3D,
  alisado por vapor).
- es-MX         : Mexican/American Spanish (computadora, suavizado por vapor).
- pl-PL         : Polish. Keep brand + model in Latin.
- de-DE         : German. Keep brand + model in Latin.
- uk-UA         : Ukrainian, engineering register. Keep brand + model in Latin; translate the device
  description into Ukrainian.
- ru-UA         : Russian. Keep brand + model in Latin; translate the device description into Russian.

NAME rules: keep the brand and exact model designator verbatim; localize the descriptive part only.

SLUG rules (the deterministic layer will re-normalize, but propose clean slugs anyway):
- lowercase latin only; transliterate Cyrillic; strip diacritics (ñ→n, á→a, ą→a).
- spaces and punctuation → single hyphen "-"; no leading/trailing/double hyphens.
- Each slug MUST be unique across all languages in this response. Achieve uniqueness by appending a
  language-specific keyword descriptor in that language (e.g. ES "maquina-alisado-vapor",
  EN "vapour-smoothing-machine", UK transliterated descriptor).

Output shape EXACTLY:
{"site_name":"…","slugs":[{"language":"…","name":"…","slug":"…"}]}
Return one entry per requested language, in the order given.`;

export function buildPromptSlug(
  storeName: string,
  productName: string,
  languages: string[],
  contextHtmlOrDescription?: string,
): PromptPayload {
  const store = getStore(storeName);
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — ground the product name in this generated copy]:\n${contextHtmlOrDescription.substring(0, 1000)}`
    : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Region]: ${store.region}
[Product Name]: "${productName}"
[Target Languages]: ${languages.join(', ')}${context}`;
  return {
    systemBlocks: [
      { text: TASK_SLUG_SYSTEM,      cache: true },
      { text: TASK_SLUG_INSTRUCTION, cache: true },
    ],
    userContent,
  };
}
