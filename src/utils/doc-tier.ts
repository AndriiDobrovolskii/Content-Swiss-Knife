/**
 * doc-tier.ts
 *
 * The executor behind runRepairGate's `repairBlocks` rung for the Doc pipeline: issues in, repaired
 * ProductDescriptionDoc out. Doc-shaped sibling of block-tier.ts.
 *
 * Sits between the gate (generic over T, knows nothing about the Doc shape) and doc-block-repair.ts
 * (knows nothing about issues or models). Everything Doc-shaped about a field repair lives here.
 *
 * The LLM arrives as an injected `generate` callback rather than a service, so the whole pipeline —
 * grouping, prompting, parsing, verifying, splicing — is testable without a provider.
 */

import { PromptPayload } from '../prompt-core/payload';
import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { buildDocBlockRepairPrompt } from '../prompts/task-doc-block-repair';
import {
  applyDocPatches, getDocBlock, parseDocPatchResponse, planDocBlockPatches, rejectDocPatch,
} from './doc-block-repair';

export interface DocBlockRepairSummary {
  applied: number;
  rejected: number;
  /** Why each rejected patch was thrown away, for the repair report. */
  rejections: string[];
}

export interface DocBlockRepairExecutorOptions {
  generate: (payload: PromptPayload) => Promise<string>;
  /** e.g. "Ukrainian (uk-UA)" — named so a rewrite does not drift into English. */
  languageLabel: string;
  onResult?: (summary: DocBlockRepairSummary) => void;
  /**
   * Max fields sent to the model in one call. A run with many distinct over-long sentences (a real
   * report showed 9) risks the model truncating its response or degrading quality on the later
   * items if they all go in one prompt — this bounds that, at the cost of one extra call per batch.
   * `systemBlocks` stays `cache: true` and byte-identical across batches, so splitting does not cost
   * the cache hit a single big call would get.
   */
  maxFieldsPerCall?: number;
}

const DEFAULT_MAX_FIELDS_PER_CALL = 5;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Builds the `repairBlocks` executor for one Doc's language.
 *
 * Best-effort by contract. Any failure — a provider error, an unparseable response, a patch that
 * fails verification — leaves the corresponding fields unchanged. A repair must never be able to
 * destroy an artifact that has already been generated and paid for, least of all over a warning.
 */
export function createDocBlockRepairExecutor(opts: DocBlockRepairExecutorOptions) {
  const batchSize = opts.maxFieldsPerCall ?? DEFAULT_MAX_FIELDS_PER_CALL;

  return async function repairDocBlocks(
    doc: ProductDescriptionDoc,
    issues: ValidationIssue[],
  ): Promise<ProductDescriptionDoc> {
    // Grouped BY PATH: several findings in one field must become one rewrite of that field. Two
    // patches for the same field would each work from a text the other has already invalidated.
    // `detail` is passed through verbatim — it is already written as an instruction.
    const byPath = new Map<string, string[]>();
    for (const issue of issues) {
      if (!issue.path) continue;
      byPath.set(issue.path, [...(byPath.get(issue.path) ?? []), issue.detail]);
    }

    const requests = planDocBlockPatches(doc, byPath);
    if (requests.length === 0) return doc;

    const accepted = new Map<string, string>();
    const rejections: string[] = [];

    for (const batch of chunk(requests, batchSize)) {
      let response: string;
      try {
        response = await opts.generate(buildDocBlockRepairPrompt(batch, opts.languageLabel));
      } catch {
        continue; // best-effort: a failed batch leaves its fields unchanged, not the whole run
      }

      for (const [path, replacement] of parseDocPatchResponse(response)) {
        const original = getDocBlock(doc, path);
        if (!original) {
          rejections.push(`"${path}" addresses no field`);
          continue;
        }
        // Per field and independent: one bad patch in a response must not discard the good ones.
        const reason = rejectDocPatch(original.text, replacement);
        if (reason) rejections.push(`"${path}": ${reason}`);
        else accepted.set(path, replacement);
      }
    }

    opts.onResult?.({ applied: accepted.size, rejected: rejections.length, rejections });
    return applyDocPatches(doc, accepted);
  };
}
