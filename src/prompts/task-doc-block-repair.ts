import { PromptPayload } from '../prompt-core/payload';
import type { DocPatchRequest } from '../utils/doc-block-repair';

/**
 * Block-scoped repair for the Doc pipeline — rewrite ONE prose field, not the whole document.
 *
 * Doc-shaped sibling of task-block-repair.ts. The alternative this replaces is a full regeneration
 * of the Doc because a sentence ran two words over a ceiling — an instrument with no preservation
 * property, free to fix the field it was asked about and break a neighbour. A field rewrite cannot:
 * every response is checked deterministically by rejectDocPatch() before a byte moves.
 *
 * The instructions handed over are validator `detail` strings VERBATIM — already written as
 * commands to a model, so there is no second wording of the same rule to drift out of sync with the
 * validator that enforces it.
 */

/**
 * Cached prefix. Carries no per-call text: the contract is identical for every field, artifact,
 * store and language, so the cached prefix stays byte-stable across an entire run.
 */
const DOC_BLOCK_REPAIR_SYSTEM_BLOCK = `You repair individual prose fields of an already-generated
product description document (JSON). You are given one or more fields, each with the specific
problems found in it.

[OUTPUT CONTRACT]
For each field you fix, emit exactly one element:

<patch path="P">…the corrected text…</patch>

- P is the field path given in the request, copied EXACTLY.
- The content of <patch> is plain text. It may contain <b> and <strong> — nothing else. No <p>, no
  wrapping element of any kind; this is a bare string value, not an HTML fragment.
- Emit nothing else. No preamble, no explanation, no Markdown fence. A field you cannot improve gets
  no <patch> at all; that is a valid answer.

[WHAT MUST NOT CHANGE]
- Every number and unit, exactly as written. Never introduce a figure the field did not state, and
  never drop one. If a fix seems to require changing a number, do not fix it.
- Any <b> or <strong> already present must stay balanced and present in the rewrite.
- The factual claims. You are rewriting how it reads, not what it says.

[HOW TO WRITE]
- Fix every listed problem for a field in a single rewrite of that field.

[SENTENCE LENGTH — THIS ONE IS ALWAYS FIXABLE]
A word-count limit can always be satisfied by splitting, because splitting adds no facts and
removes none. Skipping such a field is NOT one of the valid answers above; that escape is for a
fix that would require changing a number or a claim.

The target is arithmetic, not stylistic: EVERY sentence you leave behind must be under the limit
the problem states. Cutting a long sentence into one long and one short one fails.

Cut in this order:
1. If the sentence contains a semicolon, replace it with a full stop. That is the split.
2. If the length comes from a list of three or more items, put the run-up in its own sentence and
   start the list in the next one ("The machine runs three programs. These are X, Y and Z.").
3. Otherwise cut at the comma nearest the middle of the sentence and repair both halves into
   complete sentences.
Detaching a short closing clause is the common mistake: it reads like a fix and leaves the count
almost unchanged.`;

function renderRequest(request: DocPatchRequest): string {
  return [
    `[FIELD path="${request.path}"]\n${request.text}`,
    `[PROBLEMS IN path="${request.path}"]\n${request.instructions.map(i => `- ${i}`).join('\n')}`,
  ].join('\n');
}

/**
 * @param requests  one entry per field, already carrying every problem found in it
 * @param languageLabel  the field's language, e.g. "Ukrainian (uk-UA)" — named so a rewrite of
 *   Ukrainian prose does not drift into English, which is the model's default gravity
 */
export function buildDocBlockRepairPrompt(
  requests: DocPatchRequest[],
  languageLabel: string,
): PromptPayload {
  const userContent = [
    `Repair the fields below. Write in ${languageLabel}, matching the existing style and register.`,
    '',
    requests.map(renderRequest).join('\n\n'),
  ].join('\n');

  return {
    systemBlocks: [{ text: DOC_BLOCK_REPAIR_SYSTEM_BLOCK, cache: true }],
    userContent,
  };
}
