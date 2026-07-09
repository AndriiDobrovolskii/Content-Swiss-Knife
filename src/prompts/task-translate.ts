import { PromptPayload } from '../prompt-core/payload';
import { UNIT_LOCALIZATION_RULES, TRANSLATOR_LANGUAGES } from '../prompt-core/constants';

/**
 * Standalone Translator tool — a PURE, store-agnostic translation prompt builder.
 *
 * Unlike the generation pipeline's Task C (`prompts/task-c.ts`, FROZEN), this builder carries NO
 * store/market coupling: no tone-of-voice overlays, no "why-buy" H2 rewriting, no showroom
 * exclusion, no geographic/entity localization. It translates the human-readable text into the
 * chosen target language with that language's correct spelling/orthography, and — when the text is
 * embedded in markup/code — translates ONLY the text, leaving every tag, attribute, URL and code
 * construct byte-identical.
 */

/** Shared role/format contract for every target language. Sits in system block [0] (cached). */
const TRANSLATOR_SYSTEM_BLOCK = `You are a professional translator. Your ONLY job is to translate the
human-readable text of the input into the requested target language, faithfully and idiomatically,
using that language's correct spelling and orthography.

[TRANSLATE ONLY — PRESERVE ALL CODE/MARKUP]
- If the input contains HTML/markup or any code, translate ONLY the human-readable text: visible text
  nodes, and the values of alt="", title="", and <figcaption>. Preserve EVERYTHING else byte-identical
  — every tag, attribute, class, id, URL/href, inline style, and code construct. Do not wrap, reorder,
  add, remove, merge, or split any element.
- If the input is plain text with no markup, output plain translated text with NO added markup — even
  if a phrase reads like a button or link label, never wrap it in a tag.

[FIDELITY — TRANSLATE, DO NOT LOCALIZE OR REWRITE]
- Do NOT invent, substitute, or remove any fact. Brand names, model names, addresses, emails, phone
  numbers, prices, and country/city references all carry over exactly. A country name is TRANSLATED as
  a word (e.g. "Spain" → "España" / "Espanha") but is NEVER changed to a different country.
- Do NOT alter any numbers, facts, or data values, EXCEPT for adapting unit abbreviations and the
  decimal/thousands separator per the [UNIT LOCALIZATION] rules. The digit sequence itself never
  changes (e.g. "2.5 mm" → "2,5 мм", never "2,6 мм").

[SEPARATOR / UNIT SCOPE — CRITICAL]
Apply decimal-comma and unit localization ONLY to physical measurements, quantities, and currency
(e.g. "2.5 mm" → "2,5 мм"). Leave dots UNTOUCHED in software/firmware versions (v1.1, macOS 10.15),
technical standards (802.11), IP addresses, model numbers, and file names.

[OUTPUT FORMAT]
Output ONLY the translated text/HTML. Do NOT wrap the response in markdown code fences (\`\`\`html,
\`\`\`xml, \`\`\`). Do NOT add any introductory text, explanation, or commentary.`;

/** Per-language orthography/spelling guidance ONLY — no tone-of-voice, no market localization. */
interface LangConfig {
  /** Human-readable language name used in the instruction heading. */
  name: string;
  /** Language-specific spelling/orthography notes. */
  notes: string;
}

/**
 * Keyed by the lowercased Translator label. Every entry in TRANSLATOR_LANGUAGES has a config;
 * lookup is case-insensitive so a stray "Russian"/"RUSSIAN" from cache/UI still resolves.
 */
const LANG_CONFIG: Record<string, LangConfig> = {
  'english (en-gb)': {
    name: 'English (British / European, en-GB)',
    notes: '- STRICTLY British/European English spelling: "colour", "customise", "optimise", "fibre", "centre". Never American spelling.\n- Metric units (mm, °C, kg). Decimal dot.',
  },
  'american english (en-us)': {
    name: 'American English (en-US)',
    notes: '- STRICTLY American English spelling: "color", "customize", "optimize", "fiber", "center". Never British spelling.\n- Decimal dot.',
  },
  'american spanish (es-us)': {
    name: 'US / Latin American Spanish (es-US)',
    notes: '- Latin American Spanish spelling and vocabulary ("computadora", "video", "archivo"). Not Castilian.\n- Decimal dot is common in US Spanish; keep the source separator unless it is a measurement — then follow [UNIT LOCALIZATION].',
  },
  'european english (en-es)': {
    name: 'European English (en-ES)',
    notes: '- British/European English spelling: "colour", "optimise", "fibre". Never American spelling.\n- Metric units (mm, °C, kg). Decimal dot.',
  },
  'spanish (es-es)': {
    name: 'Castilian Spanish (es-ES)',
    notes: '- Castilian Spanish spelling and vocabulary: "ordenador" (not "computadora"), "vídeo" (accented), "fichero"/"archivo", "móvil".\n- Decimal comma (see [UNIT LOCALIZATION]).',
  },
  'portuguese (pt-pt)': {
    name: 'European Portuguese (pt-PT)',
    notes: '- European Portuguese ONLY, never Brazilian: "ficheiro" (not "arquivo"), "ecrã" (not "tela"), "utilizador" (not "usuário"), "rato" (not "mouse").\n- Decimal comma (see [UNIT LOCALIZATION]).',
  },
  'polish': {
    name: 'Polish (pl-PL)',
    notes: '- Standard normative Polish spelling and diacritics.\n- Decimal comma (see [UNIT LOCALIZATION]). Lowercase "l" for litre ("litr").',
  },
  'german': {
    name: 'German (de-DE)',
    notes: '- Standard normative German spelling; nouns capitalized; correct umlauts and ß.\n- Decimal comma (see [UNIT LOCALIZATION]).',
  },
  'ukrainian': {
    name: 'Ukrainian (uk-UA)',
    notes: '- Standard normative Ukrainian spelling.\n- Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт". Established tech terms may stay; material trade names (e.g. "PA12", "Nylon 12") stay verbatim in Latin.\n- Cyrillize units and use decimal comma (see [UNIT LOCALIZATION]).',
  },
  'russian': {
    name: 'russian (російська, ru)',
    notes: '- Standard normative russian spelling.\n- Anti-anglicism: prefer native terms over transliterated English where a normative term exists.\n- Cyrillize units and use decimal comma (see [UNIT LOCALIZATION]).',
  },
};

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function buildInstruction(targetLangLabel: string): string {
  const config = LANG_CONFIG[normalizeLabel(targetLangLabel)];
  const heading = config
    ? `TRANSLATE THE INPUT INTO ${config.name.toUpperCase()}.`
    : `TRANSLATE THE INPUT INTO ${targetLangLabel}, using that language's standard normative orthography and a neutral, professional tone; preserve all markup and code exactly.`;
  const notes = config
    ? `\n\n[TARGET-LANGUAGE ORTHOGRAPHY]\n${config.notes}`
    : '';
  return `${heading}${notes}\n\n${UNIT_LOCALIZATION_RULES}`;
}

/**
 * Build a store-agnostic pure-translation prompt.
 * @param text  the text/HTML fragment to translate (becomes userContent — never cached).
 * @param targetLangLabel  one of TRANSLATOR_LANGUAGES (case-insensitive); an unknown label falls
 *   back to a safe generic instruction instead of throwing.
 */
export function buildTranslatePrompt(text: string, targetLangLabel: string): PromptPayload {
  return {
    systemBlocks: [
      { text: TRANSLATOR_SYSTEM_BLOCK, cache: true },
      { text: buildInstruction(targetLangLabel), cache: true },
    ],
    userContent: text,
  };
}

// Re-export so callers/tests have one import site for the list + builder.
export { TRANSLATOR_LANGUAGES };
