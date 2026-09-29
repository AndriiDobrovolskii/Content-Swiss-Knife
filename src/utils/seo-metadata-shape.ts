/**
 * seo-metadata-shape.ts
 *
 * US-3.1 T9 (FR-8, FR-9; plan D6). A sibling module to `output-validator.ts` — that file is FROZEN
 * and not authorized for this Story (OD-4's resolution), so the two new `meta_title`/`h1` checks
 * AC-4/AC-5 require live here instead, following the existing `heading-style.ts` /
 * `slug-validator.ts` / `product-name-consistency.ts` precedent of a sibling validation module.
 *
 * Two checks, per `seo_data[i]` entry:
 *   - `meta-title-h1-identical`   (error) — `h1` and `meta_title` must always differ (AC-5). A
 *     model literally echoing `h1` into `meta_title` is a distinct failure mode from the template
 *     violations below, and can arise even when the template shape otherwise looks fine (e.g. a
 *     title with no tail at all).
 *   - `meta-title-template-shape` (error) — `meta_title` must follow the single approved template,
 *     `{H1} - {Localized Category} {Spec}` (AC-4): no `| {site_name}` suffix anywhere, the `h1`
 *     value verbatim at the start (no mid-word truncation of the H1 core), and strictly longer than
 *     `h1` with a dash separator immediately following the `h1` prefix. Any one of these three
 *     conditions failing raises ONE issue for that entry — the conditions are alternative ways the
 *     same template requirement can break, not three independent rules.
 *
 *     US-3.1 T15 (FR-8(b), AC-4; plan D15). That dash-tailed shape is architecturally unreachable
 *     once `h1` itself is long enough that no dash-tailed shape can ever fit the FROZEN 55-code-point
 *     `meta_title` ceiling (`isH1Unreachable`, below). For that regime the check instead requires
 *     byte equality against `computeLongH1MetaTitle(h1)` — the same deterministic, word-boundary-safe
 *     `h1`-prefix-plus-"·" fallback `normalizeLongH1MetaTitle` (exported) applies at generation time,
 *     via `content-orchestrator.service.ts`'s `canonicalizeSeoData()`, before this validator ever
 *     runs. The normalizer and the validator call the identical pure function and compare by
 *     equality rather than each re-deriving "does this look right", so the two can never
 *     independently drift.
 *
 * Both are silent when `h1` is absent — the same convention `product-name-consistency.ts:124`
 * already uses: there is nothing to compare a `meta_title` against without a real `h1`.
 *
 * Neither check is registered in `REPAIR_STRATEGIES` (repair-strategy.ts) — Out of scope for this
 * Story (see Task Breakdown T9's own Notes) — both fall through to `resolveLadder`'s
 * `['full-regen']` default despite carrying a `path`. `meta-title-template-shape`'s h1Len >= 54
 * regime is instead closed by construction, at generation time, rather than by a post-hoc repair —
 * see `normalizeLongH1MetaTitle` below and Implementation Plan §2.5 for why this is not a reopening
 * of that decision.
 */
import type { ValidationIssue } from './output-validator';
import type { SeoResponse } from '../app/types';
import { truncateAtWordBoundary } from './repair-strategy';

/**
 * A dash-shaped separator (hyphen, en dash or em dash) followed by at least one more character —
 * an appended tail with no separator at all, or a `meta_title` no longer than its own `h1` prefix,
 * both fail to match this.
 */
const DASH_TAIL = /^\s*[-–—]\s*\S/;

/**
 * Mirrors `output-validator.ts`'s FROZEN, non-exported `MAX_META_TITLE` (55) — this file cannot
 * import it directly (that file is FROZEN, see this module's own doc comment). Pinned by a
 * characterization test (`seo-metadata-shape.long-h1.spec.ts`) that fails loudly if the two ever
 * drift apart, rather than silently diverging.
 */
const MIRRORED_MAX_META_TITLE = 55;

/**
 * `DASH_TAIL`'s own minimum possible match length: one dash-like character plus one non-whitespace
 * character, with both `\s*` spans empty — the reachable (pre-T15) check's real minimum addition to
 * `h1`. Deliberately NOT `computeLongH1MetaTitle`'s own "+1" (the appended "·" mark's length) —
 * those are two different quantities that happen to share a description ("the smallest addition to
 * h1"), and deriving `isH1Unreachable`'s threshold from this constant, not from the mark's own
 * length, is what keeps the reachable and unreachable regimes an exhaustive, non-overlapping
 * partition of every `h1Len` (Implementation Plan §2.4.1's closed-form proof).
 */
const MIN_DASH_TAIL = 2;

/**
 * `computeLongH1MetaTitle`'s own truncation ceiling: 49 code points of genuine `h1` prefix plus the
 * one-code-point "·" mark totals 50 — comfortably under every locale's `FR-13(c)` budget (<=54
 * general, <=51 de-DE) and the 55-code-point FROZEN ceiling, applied uniformly across the whole
 * `h1Len >= 54` regime (no special case at `h1Len = 54` itself — Implementation Plan §2.4.1).
 */
const SAFE_CORE_LENGTH = 49;

/**
 * US-3.1 T15 (FR-8(b), AC-4; plan D15). Single source of truth for which regime an `h1` length is
 * in — called identically by `normalizeLongH1MetaTitle` and by this module's own validator branch
 * so the two can never independently drift. `Unreachable(n)` is `n >= 54`, the logical NEGATION of
 * the pre-existing reachable check's own domain (`n <= 53`), not an independently-authored second
 * formula — see Implementation Plan §2.4.1 for why that construction is what makes the partition
 * exhaustive and non-overlapping for every `h1Len`.
 */
function isH1Unreachable(h1: string): boolean {
  return Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE;
}

/**
 * US-3.1 T15 (FR-8(b), AC-4; plan D15). The canonical fallback value once `h1` is unreachable — a
 * genuine, word-boundary-safe PREFIX of `h1` (never an interior edit or deletion, unlike the real
 * shipped defect this task closes), immediately followed by a single "·" mark. A pure function of
 * `h1` alone, called identically by the normalizer and the validator (equality, not re-derivation),
 * so the two can never disagree about what "correct" looks like, regardless of any internal
 * edge-case behaviour of `truncateAtWordBoundary`/`cutOnWordBoundary` (trailing-punctuation
 * stripping, or the no-word-boundary-found hard clip) — both sides observe whatever this function
 * actually returns, because they call this function.
 */
function computeLongH1MetaTitle(h1: string): string {
  const core = truncateAtWordBoundary(h1, SAFE_CORE_LENGTH)
    // Pathological no-word-boundary-or-all-punctuation-stripped fallback — unobserved in the real
    // corpus, named rather than fixed (Implementation Plan §2.6, Residual 1). Purely cosmetic under
    // this equality-based validator design: whatever this line returns, the validator accepts.
    ?? Array.from(h1).slice(0, SAFE_CORE_LENGTH).join('').trim();
  return `${core}·`;
}

/**
 * US-3.1 T15 (FR-8(b), AC-4; plan D15). When `h1` is long enough that no verbatim-`h1`-anchored,
 * dash-tailed `meta_title` shape can ever pass the FROZEN 55-code-point ceiling
 * (`isH1Unreachable(h1)`), this deterministically constructs the title from `h1` directly —
 * unconditionally overwriting whatever the model produced for that entry, regardless of
 * `currentMetaTitle`. A no-op (returns `currentMetaTitle` unchanged) otherwise.
 *
 * Called from `content-orchestrator.service.ts`'s `canonicalizeSeoData()` — the single choke point
 * already re-run at every SEO-producing code path (initial `produce()` and after any field-scoped
 * repair) — so the normalization applies BEFORE `validateSeoMetadataShape` ever sees the artifact.
 * `meta-title-template-shape` therefore does not actually fire for this regime in production once
 * this ships; the validator branch below exists as defense in depth (it still correctly rejects a
 * `meta_title` that reached this state by some other path).
 */
export function normalizeLongH1MetaTitle(h1: string, currentMetaTitle: string): string {
  return isH1Unreachable(h1) ? computeLongH1MetaTitle(h1) : currentMetaTitle;
}

export function validateSeoMetadataShape(seo: SeoResponse | null, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!seo || !Array.isArray(seo.seo_data)) return issues;

  for (const [i, entry] of seo.seo_data.entries()) {
    const h1 = entry.h1 ?? '';
    if (!h1.trim()) continue; // nothing to compare against — see this module's own doc comment

    const metaTitle = entry.meta_title ?? '';
    const path = `seo_data[${i}].meta_title`;

    if (metaTitle === h1) {
      issues.push({
        severity: 'error',
        rule: 'meta-title-h1-identical',
        detail: `meta_title is byte-identical to h1 ("${h1}") — they must always differ.`,
        context,
        path,
      });
    }

    // US-3.1 T15 (FR-8(b), AC-4; plan D15). Once h1 itself is too long for any dash-tailed shape to
    // ever fit the FROZEN ceiling, the reachable-case rule below is unsatisfiable by construction —
    // the check instead requires byte equality against the same deterministic fallback
    // normalizeLongH1MetaTitle applies at generation time, so the two can never independently drift.
    if (isH1Unreachable(h1)) {
      const expected = computeLongH1MetaTitle(h1);
      if (metaTitle !== expected) {
        issues.push({
          severity: 'error',
          rule: 'meta-title-template-shape',
          detail:
            `meta_title ("${metaTitle}") does not follow the long-h1 fallback shape: h1 is ` +
            `${Array.from(h1).length} code points and no dash-tailed shape can fit the ` +
            `${MIRRORED_MAX_META_TITLE}-character ceiling, so meta_title must be exactly the ` +
            `deterministic, word-boundary-safe prefix of h1 followed by "·" that this pipeline ` +
            `always computes and applies at generation time ("${expected}").`,
          context,
          path,
        });
      }
    } else {
      const hasSuffix = metaTitle.includes(' | ');
      const startsWithH1 = metaTitle.startsWith(h1);
      const hasDashTail = DASH_TAIL.test(metaTitle.slice(h1.length));
      if (hasSuffix || !startsWithH1 || !hasDashTail) {
        issues.push({
          severity: 'error',
          rule: 'meta-title-template-shape',
          detail:
            `meta_title ("${metaTitle}") does not follow the approved template ` +
            `"{H1} - {Localized Category} {Spec}" — it must start with the h1 value ("${h1}") ` +
            `verbatim (no mid-word truncation), continue with a dash separator, and carry no ` +
            `"| {site_name}" suffix.`,
          context,
          path,
        });
      }
    }
  }

  return issues;
}
