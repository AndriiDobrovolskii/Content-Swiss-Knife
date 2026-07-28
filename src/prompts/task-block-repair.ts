import { PromptPayload } from '../prompt-core/payload';
import type { BlockPatchRequest } from '../utils/block-repair';

/**
 * Block-scoped repair — rewrite ONE prose block, not the artifact.
 *
 * The alternative this replaces is a full regeneration of Task A/B/C because a sentence ran two
 * words over a ceiling. That instrument has no preservation property: it is free to fix the
 * paragraph it was asked about and break the one next to it. A block rewrite cannot, and every
 * response is checked deterministically by rejectPatch() before a byte moves.
 *
 * The instructions handed over are validator `detail` strings VERBATIM. They were already written
 * as commands to a model — "Split it into two shorter sentences: …", "Possible Russicism/calque
 * "X" — use "Y"" — so there is no second wording of the same rule to drift out of sync with the
 * validator that enforces it.
 */

/**
 * Cached prefix. Carries no per-call text: the contract is identical for every block, artifact,
 * store and language, so the cached prefix stays byte-stable across an entire run.
 */
const BLOCK_REPAIR_SYSTEM_BLOCK = `You repair individual blocks of an already-published product
description. You are given one or more HTML blocks, each with the specific problems found in it.

[OUTPUT CONTRACT]
For each block you fix, emit exactly one element:

<patch block="N">…the corrected block…</patch>

- N is the block number given in the request, copied exactly.
- The content of <patch> is exactly one element, and it is the SAME element as the input block:
  same tag, same attributes, same order. To split a long sentence, write two sentences inside that
  one element — never two elements.
- Emit nothing else. No preamble, no explanation, no Markdown fence. A block you cannot improve
  gets no <patch> at all; that is a valid answer.

[WHAT MUST NOT CHANGE]
- Every number and unit, exactly as written. Never introduce a figure the block did not state, and
  never drop one. If a fix seems to require changing a number, do not fix it.
- Every tag, attribute, class, inline style, href and src, byte-identical.
- The factual claims. You are rewriting how it reads, not what it says.

[HOW TO WRITE]
- Keep the surrounding prose readable: the block sits between other paragraphs you are shown but
  must not touch. Pronouns and references that resolve against those neighbours must keep working.
- Fix every listed problem for a block in a single rewrite of that block.`;

function renderRequest(request: BlockPatchRequest): string {
  const lines: string[] = [];
  // Neighbours are omitted rather than emitted empty — a labelled empty section reads to a model
  // as "the neighbour is blank", which is a different and wrong claim.
  if (request.before) lines.push(`[CONTEXT BEFORE — do not edit, do not return]\n${request.before}`);
  lines.push(`[BLOCK block="${request.index}"]\n${request.outerHTML}`);
  if (request.after) lines.push(`[CONTEXT AFTER — do not edit, do not return]\n${request.after}`);
  lines.push(`[PROBLEMS IN block="${request.index}"]\n${request.instructions.map(i => `- ${i}`).join('\n')}`);
  return lines.join('\n');
}

/**
 * @param requests  one entry per block, already carrying every problem found in that block
 * @param languageLabel  the block's language, e.g. "Ukrainian (uk-UA)" — named so a rewrite of
 *   Ukrainian prose does not drift into English, which is the model's default gravity
 */
export function buildBlockRepairPrompt(
  requests: BlockPatchRequest[],
  languageLabel: string,
): PromptPayload {
  const userContent = [
    `Repair the blocks below. Write in ${languageLabel}, matching the existing style and register.`,
    '',
    requests.map(renderRequest).join('\n\n'),
  ].join('\n');

  return {
    systemBlocks: [{ text: BLOCK_REPAIR_SYSTEM_BLOCK, cache: true }],
    userContent,
  };
}
