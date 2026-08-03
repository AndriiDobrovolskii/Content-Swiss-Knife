/**
 * product-name-core.ts
 *
 * Two derived forms of a raw product name, both computed HERE rather than asked of the model.
 *
 *   invariantCore("XGRIDS L2 Pro 32/300 Standard Package")  →  "XGRIDS L2 Pro 32/300"
 *   productShort ("XGRIDS L2 Pro 32/300 Standard Package")  →  "XGRIDS L2 Pro"
 *
 * WHY TWO. They look like the same idea and are not, and conflating them re-creates the bug
 * that motivated this module:
 *
 *   - `invariantCore` is what must SURVIVE untouched. It is the span that stays byte-identical
 *     across every locale, so it is what the number normalizer masks and what the slug
 *     validator checks. It KEEPS the configuration code, because protecting `32/300` from
 *     being read as a thousands separator is the entire point.
 *   - `productShort` is what goes in a HEADING. It DROPS the configuration code, because
 *     «Як працює 3D-сканер XGRIDS L2 Pro 32/300 Standard Package» is the keyword stuffing this
 *     change exists to remove.
 *
 * HOW THEY FAIL. Both are token heuristics over free-form names, so they are wrong sometimes
 * by construction. They are deliberately biased toward OVER-capturing, because the two failure
 * directions are not symmetric: masking a few extra words only protects text that needed no
 * protection, and a heading gains a word — whereas under-capturing the core is exactly how
 * `32/300` became `32 300` and then `32300` in every locale of every artifact. When nothing
 * looks like a designator at all, both fall back to the full name, which is the behaviour
 * every caller had before this module existed.
 *
 * The corpus in product-name-core.spec.ts is what makes this safe. Extend it before touching
 * either heuristic.
 *
 * Pure functions, no DOM, no LLM.
 */

/**
 * Where the designator ends and the localizable description begins.
 *
 * These are CATEGORY and PACKAGING nouns — words that name what the product IS or how it is
 * boxed, both of which get translated per locale and so cannot be part of an invariant span.
 * Matched case-insensitively against whole tokens only, so "Ultra" in "F2 Ultra" is untouched
 * by "Uptime" and a brand that happens to contain a listed word keeps working.
 *
 * Non-English entries matter as much as the English ones: Task C output and the slug names are
 * localized, and this function runs against those too.
 */
const DESCRIPTOR_STOPWORDS = new Set(
  [
    // English — category. DELIBERATELY OMITTED: laser, module, machine, cutter, cleaner,
    // plate. Each of those appears INSIDE real model names ("Ortur Laser Master 3"), so
    // listing them would truncate the designator — the one failure direction that matters.
    'scanner', 'scanners', 'printer', 'printers', 'engraver', 'engravers',
    'filament', 'resin', 'powder', 'nozzle', 'nozzles', 'marker', 'markers',
    // English — packaging
    'standard', 'package', 'bundle', 'kit', 'set', 'combo', 'edition', 'version', 'pack',
    'deluxe', 'basic', 'starter', 'uptime',
    // Ukrainian / Russian
    'сканер', 'сканера', 'принтер', 'принтера', 'гравер', 'гравера', 'філамент', 'филамент',
    'смола', 'сопло', 'комплект', 'комплекта', 'комплекту', 'набір', 'набор', 'версія',
    'версии', 'версії', 'стандартний', 'стандартный', 'пристрій', 'устройство',
    // Polish
    'skaner', 'drukarka', 'grawer', 'zestaw', 'standardowy', 'wersja', 'filament',
    // German
    'drucker', 'gravierer', 'paket', 'satz', 'ausgabe', 'standardpaket',
    // Spanish / Portuguese
    'escáner', 'escaner', 'impresora', 'grabador', 'juego', 'paquete', 'kit', 'versión',
    'impressora', 'conjunto', 'pacote', 'versão',
  ].map(w => w.toLowerCase()),
);

/** A pure configuration/range code: "32/300", "3x4", "12-24". Never a whole product name. */
const CONFIG_TOKEN = /^\d+(?:[/x×-]\d+)+$/;

/**
 * A standalone "3D" token always modifies the category noun that follows it — "3D Scanner",
 * "3D Printer", «3D сканер» — and so marks the start of the localizable part. It contains a
 * digit, so without this it would sail past looksLikeDesignator and drag "3D" into the core.
 * Brands that embed it ("Shining3D", "Raise3D") are single tokens and are unaffected.
 */
const CATEGORY_MODIFIER = /^3[Dd]$|^3[Дд]$/;

/**
 * Tokens that read as part of a brand/model designator: anything containing a digit ("L2",
 * "X1", "32/300", "20W"), or a capitalized/mixed-case Latin word ("XGRIDS", "Pro", "Carbon",
 * "xTool"). A lowercase Latin word is prose and ends the span.
 */
function looksLikeDesignator(token: string): boolean {
  if (CATEGORY_MODIFIER.test(token)) return false;
  if (DESCRIPTOR_STOPWORDS.has(token.toLowerCase())) return false;
  if (/\d/.test(token)) return true;
  return /^[A-Za-zÀ-ÿ][\w'’-]*$/.test(token) && token !== token.toLowerCase();
}

/**
 * The span of the name that survives localization byte-for-byte — brand, model and any
 * configuration code, with the translatable category/packaging words removed.
 *
 * Consumed by the §7/prose number normalizer (as a mask) and by the slug fidelity check.
 */
export function invariantCore(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  const core: string[] = [];
  for (const token of tokens) {
    if (!looksLikeDesignator(token)) break;
    core.push(token);
  }

  // Nothing designator-shaped at the front (a fully lowercase or fully generic name): keep the
  // whole string. Over-capture beats returning '' and silently disabling every caller.
  return core.length > 0 ? core.join(' ') : name.trim();
}

/**
 * The heading form: `invariantCore` minus a trailing configuration code.
 *
 * Only a TRAILING config token is dropped, and never the last remaining token — a name that is
 * nothing but a code still has to render as something.
 */
export function productShort(name: string): string {
  const tokens = invariantCore(name).split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && CONFIG_TOKEN.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(' ');
}
