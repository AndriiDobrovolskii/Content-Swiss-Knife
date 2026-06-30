import { WebsiteOption } from '../app/types';
import { getStore, US_MEASUREMENT_RULES } from '../prompt-core/constants';

export function buildCopywriterPrompt(website: WebsiteOption, text: string): string {
  const siteName = website.name;
  const store = getStore(siteName);
  let localizationContext = '';

  if (store.group === 'UA') {
    localizationContext = `### Context for ${siteName} (UA Market)
- Language Priority: Ukrainian (uk-UA), Russian (ru-UA).
- Tone: Professional, clear, and trustworthy. Expert voice.`;
  } else if (store.group === 'EU') {
    localizationContext = `### Context for ${siteName} (EU Market)
- Language Priority: Polish (pl-PL), English (en-GB), German (de-DE).
- Tone: Professional, direct, and technically accurate.`;
  } else if (store.group === 'ES') {
    localizationContext = `### Context for ${siteName} (Spain Market)
- Language Priority: Spanish (es-ES).
- Tone: "Cercano y Profesional". Engaging and direct. Use "Tú".`;
  } else if (store.group === 'US') {
    localizationContext = `${US_MEASUREMENT_RULES}

### Context for ${siteName} (US Market)
- Language Priority: English (en-US), Spanish (es-MX).
- Tone: Confident, benefit-driven, and energetic. Use active voice.`;
  } else {
    localizationContext = `### Context for ${siteName} (${website.group})`;
  }

  return `[ROLE]
You are an expert copywriter and SEO specialist. Rewrite the given text to make it unique,
engaging, and stylistically appropriate for the specific target market defined below.

[TASK]
Rewrite the following [SOURCE TEXT] to be approximately 80% unique. The core meaning and
technical facts must be preserved, but the structure, vocabulary, and sentence construction
must be significantly different.

${localizationContext}

[STYLE & HUMANIZATION GUIDELINES]
1. No Fluff: start directly with value. Ban intro phrases like "In the modern world…".
2. Expert Perspective (The "Why"): explain WHY specs matter.
3. Rhythm & Burstiness: mix short punchy sentences with longer descriptive ones.
   Prohibited clichés: "ideal solution", "cutting-edge", "perfect choice".
4. Formatting: use <strong> for keywords and specs sparingly (max 2–3 per paragraph).

[FORMAT REQUIREMENTS]
1. HTML Structure: NO <h1>. Use <h2> for section titles, <h3> for sub-features.
   Wrap ALL paragraphs in <p> tags. Lists: <ul><li>…</li></ul>.
2. Formatting: use <strong> for bold. NO markdown (**text**).
3. NO markdown code blocks. Return RAW HTML string only.

[SOURCE TEXT]
${text}`;
}
