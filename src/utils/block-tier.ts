/**
 * block-tier.ts
 *
 * The executor behind runRepairGate's `repairBlocks` rung: issues in, repaired HTML out.
 *
 * Sits between the gate (generic over T, knows nothing about HTML) and block-repair.ts (knows
 * nothing about issues or models). Everything HTML-shaped about a block repair lives here.
 *
 * The LLM arrives as an injected `generate` callback rather than a service, so the whole pipeline —
 * grouping, prompting, parsing, verifying, splicing — is testable without a provider.
 */

import { PromptPayload } from '../prompt-core/payload';
import type { ValidationIssue } from './output-validator';
import { buildBlockRepairPrompt } from '../prompts/task-block-repair';
import {
  applyBlockPatches, getBlock, parsePatchResponse, planBlockPatches, rejectPatch,
} from './block-repair';

const BLOCK_PATH_RE = /^block\[(\d+)\]$/;

export interface BlockRepairSummary {
  applied: number;
  rejected: number;
  /** Why each rejected patch was thrown away, for the repair report. */
  rejections: string[];
}

export interface BlockRepairExecutorOptions {
  generate: (payload: PromptPayload) => Promise<string>;
  /** e.g. "Ukrainian (uk-UA)" — named so a rewrite does not drift into English. */
  languageLabel: string;
  onResult?: (summary: BlockRepairSummary) => void;
}

/**
 * Builds the `repairBlocks` executor for one artifact's language.
 *
 * Best-effort by contract. Any failure — a provider error, an unparseable response, a patch that
 * fails verification — returns the input unchanged. A repair must never be able to destroy an
 * artifact that has already been generated and paid for, least of all over a warning.
 */
export function createBlockRepairExecutor(opts: BlockRepairExecutorOptions) {
  return async function repairBlocks(html: string, issues: ValidationIssue[]): Promise<string> {
    // Grouped BY BLOCK: several findings in one paragraph must become one rewrite of that
    // paragraph. Two patches for the same block would splice against offsets the first
    // invalidated. `detail` is passed through verbatim — it is already written as an instruction.
    const byIndex = new Map<number, string[]>();
    for (const issue of issues) {
      const match = issue.path ? BLOCK_PATH_RE.exec(issue.path) : null;
      if (!match) continue;
      const index = Number(match[1]);
      byIndex.set(index, [...(byIndex.get(index) ?? []), issue.detail]);
    }

    const requests = planBlockPatches(html, byIndex);
    if (requests.length === 0) return html;

    let response: string;
    try {
      response = await opts.generate(buildBlockRepairPrompt(requests, opts.languageLabel));
    } catch {
      opts.onResult?.({ applied: 0, rejected: 0, rejections: [] });
      return html;
    }

    const accepted = new Map<number, string>();
    const rejections: string[] = [];
    for (const [index, replacement] of parsePatchResponse(response)) {
      const original = getBlock(html, `block[${index}]`);
      if (original === undefined) {
        rejections.push(`block[${index}] addresses no block`);
        continue;
      }
      // Per block and independent: one bad patch in a response must not discard the good ones.
      const reason = rejectPatch(original, replacement);
      if (reason) rejections.push(`block[${index}]: ${reason}`);
      else accepted.set(index, replacement);
    }

    opts.onResult?.({ applied: accepted.size, rejected: rejections.length, rejections });
    return applyBlockPatches(html, accepted);
  };
}
