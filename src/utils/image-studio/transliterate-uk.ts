/**
 * Ukrainian to Latin transliteration for the "Download all" archive name (US-10.5 FR-12 (iii), plan DD-8).
 *
 * The national scheme (Cabinet of Ministers resolution No. 55 of 2010), written as its own table. It is deliberately NOT
 * `src/prompt-core/slug-utils.ts`, which is a different (BGN-style) table used for product slugs.
 *
 * - `є ї й ю я` depend on position: at the start of a word they read `ye yi y yu ya`, elsewhere `ie i i iu ia`.
 * - `зг` reads `zgh` (so it is not mistaken for `zh`).
 * - The soft sign and every apostrophe are dropped (they also do not end a word: `Кам'янець` -> `kamianets`).
 * - Any other character (Latin, digits, spaces, punctuation, CJK) is returned unchanged; the kebab step of the
 *   archive name turns whatever is not `a-z0-9` into hyphens.
 *
 * Pure: no clock, no randomness, no ambient state (architecture scan g).
 */
const LETTERS: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'y', і: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
};

/** Letters whose spelling depends on position: [at the start of a word, elsewhere]. */
const POSITIONAL: Readonly<Record<string, readonly [string, string]>> = {
  є: ['ye', 'ie'], ї: ['yi', 'i'], й: ['y', 'i'], ю: ['yu', 'iu'], я: ['ya', 'ia'],
};

const SOFT_SIGN = 'ь';
const APOSTROPHES = new Set(["'", '’', 'ʼ', '`']);

const LETTER = /\p{L}/u;

function withCase(source: string, latin: string): string {
  const isUpper = source !== source.toLowerCase();
  return isUpper ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin;
}

export function transliterateUk(text: string): string {
  const chars = Array.from(text);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lower = ch.toLowerCase();
    const prev = i > 0 ? chars[i - 1] : undefined;
    const atWordStart = prev === undefined || !(LETTER.test(prev) || APOSTROPHES.has(prev));

    if (APOSTROPHES.has(ch) || lower === SOFT_SIGN) continue;

    if (lower === 'з' && chars[i + 1]?.toLowerCase() === 'г') {
      out += withCase(ch, 'zgh');
      i++;
      continue;
    }
    const positional = POSITIONAL[lower];
    if (positional) {
      out += withCase(ch, atWordStart ? positional[0] : positional[1]);
      continue;
    }
    const plain = Object.prototype.hasOwnProperty.call(LETTERS, lower) ? LETTERS[lower] : undefined;
    out += plain === undefined ? ch : withCase(ch, plain);
  }
  return out;
}
