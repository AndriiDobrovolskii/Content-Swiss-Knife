/**
 * removed-tokens.ts — names that US-2.2 deletes from the repository (AC-13, FR-20).
 *
 * The literals are assembled at runtime on purpose. AC-13 says "no source or spec references them",
 * and test/removal.spec.ts enforces that with a repository-wide text search; a spec that spelled a
 * removed name out in full would itself fail that search. Specs that need the stale template id
 * (to prove it now behaves as Full description) import it from here.
 */
const j = (...p: string[]) => p.join('');

/** The removed dropdown template id. A stale value must degrade to Full description (plan D14). */
export const STALE_TEMPLATE_ID = ['consumables', 'resin'].join('-');

/** Text tokens that must not appear anywhere under src/, test/ or server/ once US-2.2 is done. */
export const REMOVED_TEXT_TOKENS: readonly string[] = [
  STALE_TEMPLATE_ID,
  j('CONSUMABLES', '_'),
  ['consumables', 'doc'].join('-'),
  j('Consumables', 'Doc'),
  ['render', 'consumables'].join('-'),
  j('usesConsumables', 'DocPipeline'),
];

/** Exported names that must be gone from their modules. */
export const REMOVED_EXPORTS = {
  docPipelineFlag: [j('CONSUMABLES', '_DOC_PIPELINE_ENABLED'), j('usesConsumables', 'DocPipeline')],
  outputValidator: [j('CONSUMABLES', '_CHAR_LIMIT')],
} as const;

/** Files and directories that must no longer exist (FR-20 / plan D10). */
export const REMOVED_PATHS: readonly string[] = [
  `src/domain/${j('consumables', '-doc.schema.ts')}`,
  `src/domain/${j('consumables', '-doc.schema.spec.ts')}`,
  `src/domain/${j('consumables', '-doc.ts')}`,
  `src/prompts/${j('task-a-', 'consumables', '-doc.ts')}`,
  `src/prompts/${j('task-a-', 'consumables', '-doc.spec.ts')}`,
  `src/render/${j('render-', 'consumables', '.ts')}`,
  `src/render/${j('consumables', '-prose-transforms.ts')}`,
  `src/render/${j('consumables', '-prose-transforms.spec.ts')}`,
  `src/utils/${j('consumables', '-trim.ts')}`,
  `src/utils/${j('consumables', '-bullet-lead-punctuation.ts')}`,
  `src/utils/${j('consumables', '-bullet-lead-punctuation.spec.ts')}`,
  `src/services/${j('content-orchestrator.', 'consumables', '-doc-gate.spec.ts')}`,
  `test/${j('render-reconciliation-', 'consumables', '.spec.ts')}`,
  `test/fixtures/${j('consumables')}`,
  `test/fixtures/${j('consumables', '-corpus')}`,
];
