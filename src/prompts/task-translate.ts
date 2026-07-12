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
const TRANSLATOR_SYSTEM_BLOCK = `You are a professional translator. Translate the human-readable text
of the input into the requested target language, faithfully and idiomatically, using that
language's correct spelling and orthography.

[OUTPUT CONTRACT]
Emit exactly one artifact: the translated text/HTML. The first character of your output is the
first character of the translation itself (for HTML input — the same opening tag the input starts
with); the last character mirrors the input's final character. Where an introduction, explanation,
commentary, or Markdown fence (\`\`\`html, \`\`\`xml) would appear, write the translation itself.

[TRANSLATE ONLY — PRESERVE ALL CODE/MARKUP]
- For input containing HTML/markup or any code: translate exactly three kinds of strings — visible
  text nodes, the values of alt="" and title="", and <figcaption> content. Carry everything else
  over byte-identical: every tag, attribute, class, id, URL/href, inline style, and code
  construct, in the input's element order and count (elements in = elements out — each element
  keeps its position, wrapper, and boundaries).
- For plain-text input with no markup: output plain translated text with the same paragraph
  structure — a phrase that reads like a button or link label stays plain text.

[FIDELITY — TRANSLATE 1:1]
- Carry every fact over exactly: brand names, model names, addresses, emails, phone numbers,
  prices, and country/city references. Translate a country name as a word ("Spain" → "España" /
  "Espanha") — the referent country stays the same one.
- Keep every digit sequence byte-identical; adapt ONLY unit abbreviations and the
  decimal/thousands separator per the [UNIT LOCALIZATION] rules ("2.5 mm" → "2,5 мм" — the same
  digits 2 and 5 in the same order, localized notation).

[SEPARATOR / UNIT SCOPE — CRITICAL]
Apply decimal-comma and unit localization to exactly three value classes: physical measurements,
quantities, and currency (e.g. "2.5 mm" → "2,5 мм"). Keep the source dot in software/firmware
versions (v1.1, macOS 10.15), technical standards (802.11), IP addresses, model numbers, and
file names.`;

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
    notes: '- British/European English spelling throughout: "colour", "customise", "optimise", "fibre", "centre" (replaces American "color", "customize", "optimize", "fiber", "center").\n- Metric units (mm, °C, kg). Decimal dot.',
  },
  'american english (en-us)': {
    name: 'American English (en-US)',
    notes: '- American English spelling throughout: "color", "customize", "optimize", "fiber", "center" (replaces British "colour", "customise", "optimise", "fibre", "centre").\n- Decimal dot.',
  },
  'american spanish (es-us)': {
    name: 'US / Latin American Spanish (es-US)',
    notes: '- Latin American Spanish spelling and vocabulary throughout: "computadora", "video", "archivo" (replaces Castilian "ordenador", "vídeo", "fichero").\n- Decimal dot is common in US Spanish; keep the source separator unless it is a measurement — then follow [UNIT LOCALIZATION].',
  },
  'european english (en-es)': {
    name: 'European English (en-ES)',
    notes: '- British/European English spelling throughout: "colour", "optimise", "fibre" (replaces American "color", "optimize", "fiber").\n- Metric units (mm, °C, kg). Decimal dot.',
  },
  'spanish (es-es)': {
    name: 'Castilian Spanish (es-ES)',
    notes: '- Castilian Spanish spelling and vocabulary throughout: "ordenador" (replaces "computadora"), "vídeo" (accented), "fichero"/"archivo", "móvil".\n- Decimal comma (see [UNIT LOCALIZATION]).',
  },
  'portuguese (pt-pt)': {
    name: 'European Portuguese (pt-PT)',
    notes: '- European Portuguese throughout: "ficheiro" (replaces Brazilian "arquivo"), "ecrã" (replaces "tela"), "utilizador" (replaces "usuário"), "rato" (replaces "mouse").\n- Decimal comma (see [UNIT LOCALIZATION]).',
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
    notes: '- Standard normative Ukrainian spelling.\n- Native technical vocabulary: "друк" (replaces "прінт"), "ПЗ" (replaces "софт"). Established tech terms may stay; material trade names (e.g. "PA12", "Nylon 12") stay verbatim in Latin.\n- Cyrillize units and use decimal comma (see [UNIT LOCALIZATION]).',
  },
  'russian': {
    name: 'russian (російська, ru)',
    notes: '- Standard normative russian spelling.\n- Native terms over transliterated English wherever a normative term exists (the native term replaces the anglicism).\n- Cyrillize units and use decimal comma (see [UNIT LOCALIZATION]).',
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
