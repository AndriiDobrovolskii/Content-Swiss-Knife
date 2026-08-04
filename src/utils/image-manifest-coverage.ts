/**
 * image-manifest-coverage.ts
 *
 * Doc-reading sibling of `checkImageManifestCoverage` (private, `src/utils/output-validator.ts:394-436`).
 *
 * WHY THIS IS ITS OWN FILE, NOT A METHOD ON output-validator.ts. That file is FROZEN (CLAUDE.md) —
 * production-calibrated prompt text and validation logic Claude Code must not edit without explicit
 * approval. `checkImageManifestCoverage` is also private (not exported), so there is nothing to
 * import and wrap. Same reasoning as `doc-schema-issues.ts` and `spec-category-shape.ts`: port the
 * logic into a new, non-frozen home rather than touch the frozen source. Same idiom `spec-count-parity.ts`
 * and the other Task 1 Doc-reading siblings already use.
 *
 * WHY THIS CHECK SURVIVES ON THE DOC PATH AT ALL. Most of what `validateGeneratedHtml` checks is
 * renderer-guaranteed once a Doc is known to satisfy `ProductDescriptionDocSchema` — `runDocGate`
 * correctly never calls it. This one is different: which images the model puts into `doc.figures[]`
 * is an LLM decision, not something `renderDescription()` guarantees. It exists because of a real
 * incident — the call site history of `checkImageManifestCoverage` references a "9/14-images
 * regression" (M1 Ultra SafetyPro, 2026-07-15) where uploaded images were silently dropped from the
 * generated output. Leaving it unchecked on the Doc path — which, as of `doc-pipeline-flag.ts`, is
 * every live store — would silently reopen exactly that regression class.
 *
 * Same three rules, same severities, same rule names as the HTML version — `image-manifest-missing`,
 * `image-manifest-duplicate`, `image-unknown-src` — so existing repair reports and telemetry that key
 * on rule name keep working unchanged. Only the traversal differs: `figures[].file` read directly
 * off the typed Doc instead of regex-matching `<img src>` out of rendered HTML.
 */

import type { ValidationIssue } from './output-validator';

/**
 * Validate that every uploaded (manifest) image appears in `figures[]` exactly once, and that no
 * `figures[].file` invents a filename absent from the manifest.
 *
 * `if (!manifest || manifest.length === 0) return [];` — same no-op guard as the HTML version:
 * Expert-3DPrinter and any other manifest-free run has nothing to check coverage against.
 *
 * @param figures  `doc.figures` — every figure the document actually carries (`file` is the
 *                 filename only, matching `Figure.file` in `description-doc.ts`)
 * @param manifest every uploaded image's manifest entry, or `undefined`/`[]` when this run has no
 *                 image manifest (the coverage check no-ops in that case)
 * @param context  reporting label, e.g. "Doc (base)"
 * @returns one issue per violation — `image-manifest-missing` / `image-manifest-duplicate` for a
 *          manifest entry, `image-unknown-src` for a figure whose filename is not on the manifest
 */
export function validateImageManifestCoverageDoc(
  figures: ReadonlyArray<{ file: string }>,
  manifest: ReadonlyArray<{ urlFilename: string }> | undefined,
  context: string,
): ValidationIssue[] {
  if (!manifest || manifest.length === 0) return [];

  const issues: ValidationIssue[] = [];
  const fileNames = figures.map(f => f.file);

  for (const { urlFilename } of manifest) {
    const count = fileNames.filter(f => f === urlFilename).length;
    if (count === 0) {
      issues.push({
        severity: 'error',
        rule: 'image-manifest-missing',
        detail: `Manifest image "${urlFilename}" is absent from figures[]. Add a Figure entry with ` +
          `file: "${urlFilename}" (filename verbatim from the manifest), referenced by exactly one ` +
          `{ kind: 'figure', ref: N } block.`,
        context,
      });
    } else if (count > 1) {
      issues.push({
        severity: 'error',
        rule: 'image-manifest-duplicate',
        detail: `Manifest image "${urlFilename}" appears ${count} times in figures[] — each manifest ` +
          `image must appear exactly once.`,
        context,
      });
    }
  }

  const known = new Set(manifest.map(m => m.urlFilename));
  figures.forEach((fig, i) => {
    if (!known.has(fig.file)) {
      issues.push({
        severity: 'error',
        rule: 'image-unknown-src',
        detail: `figures[${i}].file uses filename "${fig.file}" that is NOT in the image manifest — ` +
          `filenames must be copied verbatim from the manifest; replace it with the intended manifest ` +
          `filename (never invent or rename files).`,
        context,
        path: `figures[${i}].file`,
      });
    }
  });

  return issues;
}
