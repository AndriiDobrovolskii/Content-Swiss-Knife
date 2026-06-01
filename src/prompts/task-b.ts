import { SYSTEM_INSTRUCTION } from './system-instruction';

// Currency string per store, used for both prompt generation and output validation.
const CURRENCY_BY_STORE: Record<string, string> = {
  '3DDevice':           'UAH (₴)',
  '3DPrinter':          'UAH (₴)',
  '3DScanner':          'UAH (₴)',
  'Center 3D Print':    'PLN (zł) / EUR (€)',
  'EXPERT3D':           'EUR (€)',
  'Impresora-3D':       'EUR (€)',
  'Expert-3DPrinter':   'USD ($)',
};

/** Resolves the primary currency symbol (₴ / € / $ / zł) for a store. */
export function resolveCurrencySymbol(storeName: string): string {
  const currency = CURRENCY_BY_STORE[storeName] ?? 'EUR (€)';
  return currency.match(/[₴€$£]/)?.[0] ?? '€';
}

/**
 * Builds Task B prompt — generates SEO metadata JSON for all target languages.
 */
export function buildPromptB(
  storeName: string,
  productName: string,
  languages: string[],
  contextHtmlOrDescription?: string
): string {
  const systemInstruction = SYSTEM_INSTRUCTION.replace('{{STORE_NAME}}', storeName);

  const currencySymbol = resolveCurrencySymbol(storeName);

  const siteSuffix = ['EXPERT3D', 'Impresora-3D'].includes(storeName) ? '| EXPERT3D' : `| ${storeName}`;

  const contextBlock = contextHtmlOrDescription
    ? `\n[CONTEXT — extract USPs from here]:\n${contextHtmlOrDescription.substring(0, 1000)}`
    : '';

  const safeSymbols = '✨, ✅, ➔, !, +, %, |';

  return `${systemInstruction}

TASK B — GENERATE SEO METADATA (JSON ONLY)
OUTPUT: Raw JSON only. No HTML, no Markdown, no code fences.

[INPUT DATA]
[Product Name]: "${productName}"
[Store Name]: "${storeName}"
[Target Languages]: ${languages.join(', ')}
[Currency Symbol]: ${currencySymbol}
${contextBlock}

[H1 RULE]
- Syntax: "[Product Name] [Model/Series]".
- Strip marketing fluff ("Buy", "Best Price", "New"). Strictly technical.
- Example: "Creality K1 Max" (NOT "Buy Creality K1 Max Cheap").

[META TITLE RULE]
- Formula: "[Product] - [Benefit] ${siteSuffix}". The suffix is mandatory.
- If [Product Name] > 50 chars, drop the benefit: "[Product Name] ${siteSuffix}".
- MAX 55 characters total (strict).
- Allowed symbols, ONE max per title: ${safeSymbols}
- FORBIDDEN: flag emojis, package emoji, any emoji not listed above.

[META DESCRIPTION RULE]
- Pattern: Hook + Solution + Spec + CTA.
- Start with a verb or a problem statement.
- Include one hard spec (size, speed, material) from context.
- MUST include the currency symbol: ${currencySymbol}
- MUST end with a CTA and an arrow: "Buy now ➔" (or equivalent in the target language).
- MAX 155 characters.

⚠️ TECHNICAL CONSTRAINTS:
- Count characters for EVERY meta_title and meta_description before returning.
- If any exceeds its limit, shorten it. Then return.

[OUTPUT FORMAT — raw JSON]
{
  "site_name": "${storeName}",
  "seo_data": [
    {
      "language": "ISO code (e.g. en-ES, es-ES, uk-UA, en-US)",
      "h1": "Clean Product Name",
      "meta_title": "Max 55 chars",
      "meta_description": "Max 155 chars, ends with CTA ➔"
    }
  ]
}

Generate one entry for each of the following languages: ${languages.join(', ')}.
Return JSON only.`;
}
