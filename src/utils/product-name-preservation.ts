/**
 * product-name-preservation.ts
 *
 * FR-5 of US-7.1: a deterministic check that a PROTECTED typed Product Name survives into the
 * generated surfaces. It sits beside the frozen output-validator.ts and reports `ValidationIssue`s;
 * it never mutates output and never calls a model (NFR-5).
 *
 *   Part 1 `product-name-token-missing`: the typed name's tokens must appear as one contiguous
 *     sequence (rule 3 equality) in a Slugs `name`, an SEO `h1` and an SEO `meta_title`; the typed
 *     name's slugified form must be contained in a Slugs `slug`.
 *   Part 2 `product-name-shortened-form`: a run of >= 3 consecutive tokens that is an in-order
 *     subsequence of the typed name, includes its last token, skips at least one typed token, and
 *     contains a designator token, outside any full occurrence, is an altered name.
 *
 * Closed surface list: part 1 = Slugs name/slug + SEO h1/meta_title; part 2 = SEO h1/meta_title/
 * meta_description, description HTML, Optimizer text. A generic or empty typed name is never checked.
 */
import type { SeoResponse, SlugResponse } from '../app/types';
import { normalizeSlug, stripSlugStopwords } from '../prompt-core/slug-utils';
import type { ValidationIssue } from './output-validator';
import { classifyProductName } from './protected-product-name';
import { tokenize, tokensEqual, type Token } from './product-name-tokens';

const PART1 = 'product-name-token-missing';
const PART2 = 'product-name-shortened-form';

interface Protected {
  typed: string;
  tokens: string[];
  designators: string[];
}

function protectedName(typedName: string): Protected | null {
  const typed = (typedName ?? '').trim();
  if (!typed) return null;
  const c = classifyProductName(typed);
  if (!c.protected) return null;
  const tokens = tokenize(typed).map(t => t.text);
  return tokens.length > 0 ? { typed, tokens, designators: c.designators } : null;
}

const issue = (rule: string, detail: string, context: string, path?: string): ValidationIssue =>
  ({ severity: 'error', rule, detail, context, ...(path ? { path } : {}) });

// ── Part 1 ──────────────────────────────────────────────────────────────────────────────────────

/** Start index of the typed token sequence inside `out` (hard breaks ignored), or -1. */
function findContiguous(out: Token[], typed: string[]): number {
  for (let i = 0; i + typed.length <= out.length; i++) {
    if (typed.every((t, j) => tokensEqual(t, out[i + j].text))) return i;
  }
  return -1;
}

function missingTokens(out: Token[], typed: string[]): string[] {
  const missing: string[] = [];
  for (const t of typed) {
    if (!out.some(o => tokensEqual(t, o.text)) && !missing.includes(t)) missing.push(t);
  }
  return missing;
}

function checkPart1Text(p: Protected, text: string, surface: string, context: string, path: string): ValidationIssue[] {
  const out = tokenize(text ?? '');
  if (findContiguous(out, p.tokens) >= 0) return [];
  const missing = missingTokens(out, p.tokens);
  const detail = missing.length > 0
    ? `${surface} is missing the product-name token(s) "${missing.join('", "')}"; the typed name "${p.typed}" must appear whole, untranslated and in order.`
    : `${surface} has the typed name's tokens out of order or interrupted; "${p.typed}" must appear whole, untranslated and in order.`;
  return [issue(PART1, detail, context, path)];
}

/** The slug transform applied identically to the typed name and to a slug (OD-3). */
function slugForm(input: string): string {
  return normalizeSlug(stripSlugStopwords(input.toLowerCase()));
}

function checkPart1Slug(p: Protected, slug: string, context: string, path: string): ValidationIssue[] {
  const typedSlug = slugForm(p.tokens.join(' '));
  if (!typedSlug) return [];
  const actual = slugForm(slug ?? '');
  if (`-${actual}-`.includes(`-${typedSlug}-`)) return [];
  const have = new Set(actual.split('-'));
  const missing = typedSlug.split('-').filter((t, i, all) => !have.has(t) && all.indexOf(t) === i);
  const detail = missing.length > 0
    ? `slug is missing the product-name slug token(s) "${missing.join('", "')}"; it must contain "${typedSlug}".`
    : `slug has the product-name slug tokens out of order or interrupted; it must contain "${typedSlug}".`;
  return [issue(PART1, detail, context, path)];
}

// ── Part 2 ──────────────────────────────────────────────────────────────────────────────────────

/** Ranges [start, end] of full occurrences of the whole typed name in `out`. */
function fullOccurrences(out: Token[], typed: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i + typed.length <= out.length; i++) {
    if (typed.every((t, j) => tokensEqual(t, out[i + j].text))) ranges.push([i, i + typed.length - 1]);
  }
  return ranges;
}

function checkPart2Tokens(p: Protected, out: Token[], context: string, path?: string): ValidationIssue[] {
  if (p.designators.length === 0) return [];
  const n = p.tokens.length;
  const designatorIdx = new Set<number>();
  p.tokens.forEach((t, i) => { if (p.designators.some(d => tokensEqual(d, t))) designatorIdx.add(i); });
  const full = fullOccurrences(out, p.tokens);
  const found: ValidationIssue[] = [];

  let i = 0;
  while (i < out.length) {
    // Greedy in-order match of a run of consecutive tokens (no hard break between them).
    const matched: number[] = [];
    let j = i;
    let prev = -1;
    while (j < out.length) {
      let m = -1;
      for (let k = prev + 1; k < n; k++) {
        if (tokensEqual(p.tokens[k], out[j].text)) { m = k; break; }
      }
      if (m < 0) break;
      matched.push(m);
      prev = m;
      j++;
      if (out[j - 1].hardBreakAfter) break;
      if (m === n - 1) break;
    }
    const last = i + matched.length - 1;
    const valid = matched.length >= 3
      && matched[matched.length - 1] === n - 1
      && matched[matched.length - 1] - matched[0] + 1 > matched.length
      && matched.some(k => designatorIdx.has(k))
      && !full.some(([a, b]) => i >= a && last <= b);
    if (valid) {
      const form = out.slice(i, last + 1).map(t => t.text).join(' ');
      found.push(issue(
        PART2,
        `Altered product name "${form}": the typed name is "${p.typed}" and every token must be kept, in order, untranslated.`,
        context,
        path,
      ));
      i = last + 1;
    } else {
      i++;
    }
  }
  return found;
}

function checkPart2Text(p: Protected, text: string, context: string, path?: string): ValidationIssue[] {
  return checkPart2Tokens(p, tokenize(text ?? ''), context, path);
}

// ── Public API ──────────────────────────────────────────────────────────────────────────────────

/** Slugs `name`/`slug` and SEO `h1`/`meta_title`/`meta_description` (the closed name-surface group). */
export function checkNameSurfaces(
  typedName: string,
  surfaces: { slugs?: SlugResponse | null; seo?: SeoResponse | null },
): ValidationIssue[] {
  const p = protectedName(typedName);
  if (!p) return [];
  const issues: ValidationIssue[] = [];

  for (const [i, item] of (surfaces.slugs?.slugs ?? []).entries()) {
    const ctx = `Slug (${item.language})`;
    issues.push(...checkPart1Text(p, item.name, 'name', ctx, `slugs[${i}].name`));
    issues.push(...checkPart1Slug(p, item.slug, ctx, `slugs[${i}].slug`));
  }

  for (const [i, entry] of (surfaces.seo?.seo_data ?? []).entries()) {
    const ctx = `SEO meta (${entry.language})`;
    const base = `seo_data[${i}]`;
    issues.push(...checkPart1Text(p, entry.h1, 'h1', ctx, `${base}.h1`));
    issues.push(...checkPart2Text(p, entry.h1, ctx, `${base}.h1`));
    issues.push(...checkPart1Text(p, entry.meta_title, 'meta_title', ctx, `${base}.meta_title`));
    issues.push(...checkPart2Text(p, entry.meta_title, ctx, `${base}.meta_title`));
    issues.push(...checkPart2Text(p, entry.meta_description, ctx, `${base}.meta_description`));
  }
  return issues;
}

/** Part 2 only, over generated description HTML (H1, headings, body, CTA, figcaption). */
export function checkDescriptionHtml(typedName: string, html: string, context: string): ValidationIssue[] {
  const p = protectedName(typedName);
  if (!p) return [];
  return checkPart2Tokens(p, tokenize(html ?? '', { html: true }), context);
}

/** Part 2 only, over Optimizer output; meaningful only when the optional [Product Name] is given. */
export function checkOptimizerText(typedName: string, html: string): ValidationIssue[] {
  const p = protectedName(typedName);
  if (!p) return [];
  return checkPart2Tokens(p, tokenize(html ?? '', { html: true }), 'Optimizer output');
}
