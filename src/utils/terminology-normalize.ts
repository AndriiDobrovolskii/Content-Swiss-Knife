/**
 * Deterministic post-processing normalization for known term/trademark variants.
 * Same shape as number-format-fixer.ts: pure string transform, safe to apply to any
 * generated HTML, idempotent. Unlike the calque checks in output-validator.ts (advisory,
 * LLM-repair-driven — several of those patterns are context-dependent), the entries here are
 * narrow, unambiguous phrases where blind replacement carries no real risk.
 */

/**
 * Any case/hyphen/™-position variant of xTool's "Pin-point Positioning" feature name.
 * The optional ™ is grouped with its own preceding whitespace as a single atomic optional
 * unit — `(?:\s*™)?` — so when no ™ is present, no whitespace is consumed either. A bare
 * `\s*™?` (whitespace and ™ as separate optionals) would greedily eat the space before
 * whatever follows "Positioning" even when there's no ™ there to justify it.
 */
const TRADEMARK_VARIANTS = /\bpin[\s-]?point(?:\s*™)?\s+positioning(?:\s*™)?/gi;

/**
 * The spec-table value "xTool Studio" is simply wrong — the real xTool application is
 * "xTool Creative Space" (xTool Studio doesn't exist), and the body text of this pipeline's
 * own output already names it correctly. Blind, universal, unconditional of locale — same
 * shape/risk profile as the trademark-variant fix above. (2026-07-16 EXPERT3D audit, S1.)
 */
const XTOOL_SOFTWARE_NAME = /\bxTool\s+Studio\b/gi;

function preserveInitialCase(original: string, replacement: string): string {
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// Cyrillic letter ranges used for declension-suffix capture and word-boundary lookarounds —
// mirrors CYR_BOUNDARY in number-format-fixer.ts. JS \b/\w do not recognize Cyrillic letters,
// so both boundary checks and "capture the rest of this word" groups must use this explicit
// character class instead.
const UK_LETTERS = 'а-яіїєґА-ЯІЇЄҐ';

/**
 * Root-swap pairs where the old and new root are the same part of speech and share the same
 * declension paradigm (both regular masculine nouns, or both regular adjectives), so capturing
 * whatever Cyrillic letters follow the root and re-attaching them to the new root preserves
 * case/number correctly for every occurrence, not just the nominative form seen in one product.
 * (2026-07-16 EXPERT3D uk-UA find/replace audit — rules 4, 19, 22, 23-26, 27.)
 */
const UK_ROOT_SWAPS: Array<{ root: string; newRoot: string }> = [
  { root: 'розхідн', newRoot: 'витратн' }, // Russism (расходные) -> витратні.
  { root: 'тамблер', newRoot: 'термостакан' }, // anglicism.
  { root: 'постер', newRoot: 'плакат' }, // anglicism.
  { root: 'гальванізован', newRoot: 'оцинкован' }, // preferred UA term for galvanised.
  { root: 'плоттер', newRoot: 'плотер' }, // spelling: плотер has one т.
];

/**
 * Narrow literal-phrase fixes: either the two terms don't share a declension class (blind
 * suffix-substitution would produce wrong grammar on other case forms) or the fix is a specific
 * grammar-agreement/collocation correction that only makes sense in this exact phrase.
 * (2026-07-16 EXPERT3D uk-UA find/replace audit — rules 1-3, 5-18, 20-21.)
 */
const UK_PHRASE_FIXES: Array<[RegExp, string]> = [
  [/тонкий фанер обробляється/g, 'тонка фанера обробляється'], // gender: фанера is feminine.
  [/однофункціональною лазерною техніку/g, 'однофункціональною лазерною технікою'], // instrumental case.
  [/без ручного розмітки/g, 'без ручної розмітки'], // gender: розмітка is feminine.
  [/змазка,/g, 'мастило,'], // Russism (смазка) -> мастило.
  [/друкуюча голівка/g, 'друкувальна голівка'], // active-participle calque -уюча -> -увальна.
  [/Партійне опрацювання/g, 'Пакетна обробка'], // batch processing; "партійне" is ambiguous.
  [/деревʼяного підстаканника/g, "дерев'яної підставки під чашку"], // wrong term + gender.
  [/деревʼяному підстаканнику/g, "дерев'яній підставці під чашку"], // wrong term, locative.
  [/додає повітряочищувач AP2/g, 'додає очищувач повітря AP2'], // unify with SEO wording.
  [/цю схему повітряочищувачем AP2/g, 'цю схему очищувачем повітря AP2'], // same, instrumental.
  [/Повітряочищувач SafetyPro™ AP2/g, 'Очищувач повітря SafetyPro™ AP2'], // same unification.
  [/акрилі й канвасі/g, 'акрилі й полотні'], // anglicism 'канвас' -> полотно.
  [/дерево, канвас, акрил/g, 'дерево, полотно, акрил'], // anglicism 'канвас' -> полотно.
  [/мат FabricGrip/g, 'килимок FabricGrip'], // anglicism 'мат' -> килимок.
  [/Мати для різання:/g, 'Килимки для різання:'], // anglicism + ambiguity (мати).
  [/Мати для різання LightGrip/g, 'Килимки для різання LightGrip'], // anglicism + ambiguity.
  [/для крафтового виробництва/g, 'для художньо-ремісничого виробництва'], // anglicism 'крафт'.
  [/крафтових проєктів/g, 'художньо-ремісничих проєктів'], // anglicism 'крафт'.
  [/інструментів для крафту/g, 'інструментів для ручного виробництва'], // anglicism 'крафт'.
  [/без обмеження по висоті/g, 'без обмеження за висотою'], // 'по+dative' calque.
];

/**
 * @param html    generated HTML body
 * @param locale  BCP47 locale of this artifact (e.g. "es-ES", "pt-PT", "uk-UA"); the
 *                trademark/software-name fixes apply regardless of locale, everything else is
 *                locale-gated.
 */
export function normalizeTerminology(html: string, locale?: string): string {
  let result = html.replace(TRADEMARK_VARIANTS, 'Pin-point Positioning™');
  result = result.replace(XTOOL_SOFTWARE_NAME, 'xTool Creative Space');

  if (locale === 'es-ES') {
    // Hot foil stamping, not lamination — see ES_FORBIDDEN_CALQUES in output-validator.ts.
    result = result.replace(
      /\blaminad[oa] en caliente\b/gi,
      m => preserveInitialCase(m, 'estampación en caliente'),
    );
    // Pure numeric ranges use an en-dash in Spanish typography ("3-4" -> "3–4"). Scoped to
    // digit-hyphen-digit so it can never touch a compound token like "4-in-1".
    result = result.replace(/\b(\d+)-(\d+)\b/g, '$1–$2');
  }

  if (locale === 'pt-PT') {
    // "foilagem" is a fabricated anglicism — see PT_FORBIDDEN_CALQUES in output-validator.ts.
    result = result.replace(
      /\bfoilagem\b/gi,
      m => preserveInitialCase(m, 'estampagem a quente'),
    );
    // Voltage-spec line: English "AC" left untranslated -> Portuguese "CA".
    result = result.replace(/(\d+(?:[–-]\d+)?\s*V\s*~\s*)AC\b/gi, '$1CA');
    result = result.replace(/\bbaseball\b/gi, m => preserveInitialCase(m, 'basebol'));
    result = result.replace(/\bposter\b/gi, m => preserveInitialCase(m, 'póster'));
  }

  if (locale === 'uk-UA') {
    for (const [find, replace] of UK_PHRASE_FIXES) {
      result = result.replace(find, replace);
    }
    for (const { root, newRoot } of UK_ROOT_SWAPS) {
      const re = new RegExp(`${root}[${UK_LETTERS}]*`, 'gi');
      result = result.replace(re, m => preserveInitialCase(m, `${newRoot}${m.slice(root.length)}`));
    }
    // Standalone "софт" (slang, breaks B2B register) -> "програма". Word-boundary lookaround
    // uses the explicit Cyrillic class since JS \b does not recognize Cyrillic letters, so this
    // only matches the bare word (not "софту"/"софтом", which carry a case ending).
    result = result.replace(
      new RegExp(`(?<![${UK_LETTERS}])софт(?![${UK_LETTERS}])`, 'gi'),
      m => preserveInitialCase(m, 'програма'),
    );
    // Voltage-spec line: English "AC" left untranslated -> Ukrainian, spelled out.
    result = result.replace(/(\d+(?:[–-]\d+)?\s*В)\s*~\s*AC\b/gi, '$1 (змінний струм)');
    // Apostrophe normalization — run LAST (after all phrase rules above), per the source
    // find/replace spec. Unifies U+02BC (ʼ) to U+0027 (') for DB/search robustness.
    result = result.replace(/ʼ/g, "'");
  }

  return result;
}

/**
 * Canonicalizes "N-in-N" / "N in N" (English) and "N-в-N" / "N в N" (Ukrainian) hyphenation to
 * one fixed form per locale, so the body HTML and the SEO metadata / slug / H1 never drift from
 * each other. (2026-07-16 EXPERT3D audit, S4 — the xTool M1 Ultra body used "4-in-1" while the
 * SEO metadata used "4 in 1", and the uk-UA body used "4-в-1" while its metadata used "4 в 1".)
 * English convention: hyphenated ("4-in-1"). Ukrainian convention: spaced, no hyphen ("4 в 1").
 * Plain-text safe — the pattern only matches digit-word-digit sequences, never HTML tag syntax,
 * so it can be applied to HTML bodies and to plain SEO/slug strings alike.
 */
export function canonicalizeMultiInOne(text: string, locale?: string): string {
  if (locale?.startsWith('en-')) {
    return text.replace(/\b(\d+)[\s-]in[\s-](\d+)\b/g, '$1-in-$2');
  }
  if (locale === 'uk-UA') {
    return text.replace(/(\d+)[\s-]в[\s-](\d+)/gi, '$1 в $2');
  }
  return text;
}
