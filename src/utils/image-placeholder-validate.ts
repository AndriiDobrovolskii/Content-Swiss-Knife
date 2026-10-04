/**
 * image-placeholder-validate.ts
 *
 * US-5.1: the dropped-marker validator and the ladder-exhaustion finalisers, as a SIBLING of the
 * frozen output-validator.ts (plan D3, binding note 3): the legacy path adds this check to its
 * validate array, the Doc path to its own, and neither edits a frozen file.
 *
 * FR-17. The model sometimes loses a marker. The set of markers the user typed is pre-extracted from
 * the Original Description once per generation; the placeholder step reports which markers it saw in
 * the candidate. An expected marker the step never saw is the error `dropped-image-placeholder`. The
 * error carries no `path` and has no repair strategy, so the ladder resolves it to a full
 * regeneration, which is what can actually fix a lost marker.
 *
 * FR-18. When the ladder is exhausted the error would fail the generation. The finalisers instead move
 * each still-dropped image to the end of the document and replace the error with a warning of the same
 * rule carrying the human's Ukrainian text, so a usable description ships with the position flagged.
 */
import type { ImageManifestEntry } from '../app/types';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import type { ValidationIssue } from './output-validator';
import {
  PLACEHOLDER_RE, RULE_DROPPED, buildFigureParts, droppedMessage, exhaustedMessage, figureCaptionWarnings,
  matchManifest, type FigureBuildOptions, type FigureParts, type PlaceholderReport,
} from './image-placeholder';
import { appendFigureAtEndDoc } from './image-placeholder-doc';
import { appendFigureAtEndHtml, removeFiguresByFileHtml, type HtmlFolders } from './image-placeholder-html';

export { preExtractPlaceholders } from './image-placeholder';

/**
 * Issues for one candidate: an error per expected marker the step never saw, plus the step's
 * unmatched / not-placed warnings. `report === undefined` means the step did not run (the candidate
 * was schema-invalid and its own issues drive repair), so nothing is raised (N-4).
 */
export function validateDroppedPlaceholders(
  expected: Iterable<string>,
  report: PlaceholderReport | undefined,
  context: string,
): ValidationIssue[] {
  if (!report) return [];
  const issues: ValidationIssue[] = report.warnings.map(w => ({ ...w, context }));
  for (const file of expected) {
    if (report.seen.has(file)) continue;
    issues.push({ severity: 'error', rule: RULE_DROPPED, detail: droppedMessage(file), context });
  }
  return issues;
}

/** The marker file named in a dropped-placeholder error, or undefined for any other issue. */
function droppedFile(issue: ValidationIssue): string | undefined {
  if (issue.rule !== RULE_DROPPED || issue.severity !== 'error') return undefined;
  return new RegExp(PLACEHOLDER_RE.source).exec(issue.detail)?.[1];
}

/** Downgrades one dropped error to the FR-18 warning, keeping its rule and context. */
const exhausted = (issue: ValidationIssue, file: string): ValidationIssue => ({
  severity: 'warning',
  rule: RULE_DROPPED,
  detail: exhaustedMessage(`[${file}]`),
  context: issue.context,
});

/** Options of the finalisers: the builder option of the step, and the figures the step already placed. */
export interface FinaliseOptions extends FigureBuildOptions {
  /** `report.figures` of the step run that produced the candidate, so duplicate labels see earlier figures. */
  placed?: readonly FigureParts[];
}

/**
 * FR-21 warnings for the figures a finaliser appended. They are computed over the already-placed
 * figures followed by the appended ones; the placed figures' own warnings are already in the issue
 * list (they came from the step report), so only the tail is returned.
 */
function appendedCaptionWarnings(
  appended: FigureParts[],
  placed: readonly FigureParts[],
  context: string,
): ValidationIssue[] {
  if (appended.length === 0) return [];
  const before = figureCaptionWarnings(placed).length;
  return figureCaptionWarnings([...placed, ...appended]).slice(before).map(w => ({ ...w, context }));
}

/**
 * Post-gate finaliser, Doc path: every remaining dropped-marker error gets its image appended at the
 * end of the document (a model-placed figure for it is removed first, Q-B) and becomes a warning
 * (Q-C). Other issues pass through untouched, in order.
 */
export function finalizeDroppedPlaceholdersDoc(
  doc: ProductDescriptionDoc,
  issues: ValidationIssue[],
  manifest: ImageManifestEntry[] | undefined,
  opts: FinaliseOptions = {},
): { doc: ProductDescriptionDoc; issues: ValidationIssue[] } {
  let out = doc;
  const handled = new Set<string>();
  const appended: FigureParts[] = [];
  let context: string | undefined;
  const next = issues.map(issue => {
    const file = droppedFile(issue);
    if (file === undefined) return issue;
    context ??= issue.context;
    const entry = matchManifest(file, manifest);
    if (entry && !handled.has(file)) {
      const parts = buildFigureParts(entry, opts);
      out = appendFigureAtEndDoc(out, parts);
      appended.push(parts);
      handled.add(file);
    }
    return exhausted(issue, file);
  });
  return { doc: out, issues: [...next, ...appendedCaptionWarnings(appended, opts.placed ?? [], context ?? '')] };
}

/** Post-gate finaliser, legacy HTML path; see {@link finalizeDroppedPlaceholdersDoc}. */
export function finalizeDroppedPlaceholdersHtml(
  html: string,
  issues: ValidationIssue[],
  manifest: ImageManifestEntry[] | undefined,
  imageBase: string,
  folders: HtmlFolders,
  opts: FinaliseOptions = {},
): { html: string; issues: ValidationIssue[] } {
  let out = html;
  const handled = new Set<string>();
  const appended: FigureParts[] = [];
  let context: string | undefined;
  const next = issues.map(issue => {
    const file = droppedFile(issue);
    if (file === undefined) return issue;
    context ??= issue.context;
    const entry = matchManifest(file, manifest);
    if (entry && !handled.has(file)) {
      const parts = buildFigureParts(entry, opts);
      out = appendFigureAtEndHtml(removeFiguresByFileHtml(out, parts.file), parts, imageBase, folders);
      appended.push(parts);
      handled.add(file);
    }
    return exhausted(issue, file);
  });
  return { html: out, issues: [...next, ...appendedCaptionWarnings(appended, opts.placed ?? [], context ?? '')] };
}
