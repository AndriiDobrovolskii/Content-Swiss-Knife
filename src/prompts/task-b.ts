import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

export function resolveCurrencySymbol(storeName: string): string {
  return getStore(storeName).currencySymbol;
}

const TASK_B_SYSTEM = `You are an SEO specialist for 3D-technology e-commerce stores.
Output is always raw JSON only — no preamble, no Markdown fences, no explanations.`;

const TASK_B_INSTRUCTION = `TASK B — GENERATE SEO METADATA (RAW JSON ONLY, no Markdown, no fences).
H1: "[Product] [Model/Series]", strip fluff (Buy/Best Price/New).
meta_title: "[Product] - [Benefit] | [SiteSuffix]" (suffix mandatory). If [Product] > 50 chars drop
the benefit. MAX 55 chars. One allowed symbol max from ✨ ✅ ➔ ! + % | ; no flag/package emoji.
meta_description: Hook+Solution+Spec+CTA, starts with a verb, includes one hard spec AND the
[Currency Symbol] value (MANDATORY — shorten Hook or Spec first if over limit), ends with CTA + ➔.
MAX 155 chars. Count characters before returning; shorten if over.
Return one entry per requested language.
Output shape:
{"site_name":"…","seo_data":[{"language":"…","h1":"…","meta_title":"…","meta_description":"…"}]}`;

export function buildPromptB(
  storeName: string,
  productName: string,
  languages: string[],
  contextHtmlOrDescription?: string,
): PromptPayload {
  const store = getStore(storeName);
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — extract a USP/spec from here]:\n${contextHtmlOrDescription.substring(0, 1000)}` : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Product Name]: "${productName}"
[Currency Symbol]: ${store.currencySymbol}
[Target Languages]: ${languages.join(', ')}${context}`;
  return {
    systemBlocks: [
      { text: TASK_B_SYSTEM,        cache: true },
      { text: TASK_B_INSTRUCTION,   cache: true },
    ],
    userContent,
  };
}
