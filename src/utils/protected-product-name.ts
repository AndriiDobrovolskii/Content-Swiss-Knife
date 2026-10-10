/**
 * protected-product-name.ts
 *
 * FR-1 of US-7.1: decide, deterministically and without a model call, whether the operator's typed
 * Product Name is a PROTECTED name (branded or model-identified, kept verbatim) or a GENERIC one
 * (today's localisation behaviour applies).
 *
 * The whole OD-11 default lives in this file, so overturning it at the spec gate changes one module:
 *   (i)   a brand from the union of every store's `officialBrands` plus SPEC_LISTED_BRANDS, matched
 *         case-sensitively as a whole-token sequence;
 *   (ii)  a token mixing letters and digits (`L2`, `X1C`), except `3D`;
 *   (iii) a standalone integer or a suffix word (Pro, Plus, Max, Mini, Lite, Ultra) immediately
 *         after a capitalised name token.
 * Decimals and number+unit spans are removed from consideration before rule (iii), so `0.4 mm`,
 * `4 mm`, `1 kg` and `20W` never make a name protected. Empty input is generic.
 *
 * The brand set is derived from STORE_REGISTRY at CALL time (NFR-4), never copied.
 */
import { STORE_REGISTRY } from '../prompt-core/constants';
import { isNumberToken, isUnitToken, tokenize } from './product-name-tokens';

/** Brands the Specification names explicitly, for stores whose `officialBrands` is empty. */
export const SPEC_LISTED_BRANDS: string[] = ['Formlabs', 'Bambu Lab'];

export interface ProductNameClassification {
  protected: boolean;
  /** Tokens that triggered rule (ii) or (iii), in typed order. Empty for brand-only names. */
  designators: string[];
}

const SUFFIX_WORDS = new Set(['Pro', 'Plus', 'Max', 'Mini', 'Lite', 'Ultra']);
const LETTERS_AND_DIGITS = /^(?=.*\p{L})(?=.*\d)/u;
const INTEGER_RE = /^\d+$/;
const CAPITALISED_RE = /^\p{Lu}/u;

function brandSet(): string[] {
  const brands = new Set<string>(SPEC_LISTED_BRANDS);
  for (const profile of Object.values(STORE_REGISTRY)) {
    for (const b of profile.officialBrands) brands.add(b);
  }
  return [...brands];
}

function containsBrand(tokens: string[]): boolean {
  for (const brand of brandSet()) {
    const parts = tokenize(brand).map(t => t.text);
    if (parts.length === 0 || parts.length > tokens.length) continue;
    for (let i = 0; i + parts.length <= tokens.length; i++) {
      if (parts.every((p, j) => tokens[i + j] === p)) return true;
    }
  }
  return false;
}

export function classifyProductName(typed: string): ProductNameClassification {
  const tokens = tokenize(typed ?? '').map(t => t.text);
  if (tokens.length === 0) return { protected: false, designators: [] };

  // Remove decimals and number+unit spans (the number and its unit) from consideration.
  const excluded = new Set<number>();
  tokens.forEach((tok, i) => {
    if (!isNumberToken(tok)) return;
    if (!INTEGER_RE.test(tok)) excluded.add(i);
    else if (i + 1 < tokens.length && isUnitToken(tokens[i + 1])) {
      excluded.add(i);
      excluded.add(i + 1);
    }
  });

  const designators: string[] = [];
  tokens.forEach((tok, i) => {
    if (excluded.has(i)) return;
    if (tok !== '3D' && LETTERS_AND_DIGITS.test(tok)) {
      designators.push(tok);
      return;
    }
    const prev = i > 0 ? tokens[i - 1] : '';
    const afterCapitalised = prev !== '' && CAPITALISED_RE.test(prev);
    if (afterCapitalised && (INTEGER_RE.test(tok) || SUFFIX_WORDS.has(tok))) designators.push(tok);
  });

  return { protected: designators.length > 0 || containsBrand(tokens), designators };
}
