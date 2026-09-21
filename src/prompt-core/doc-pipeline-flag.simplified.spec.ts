/**
 * US-2.2 T11 — FR-7 routing: a simplified template no longer forces the legacy path. The six
 * DOC_PIPELINE_STORES route through the Doc pipeline for every template; `Expert-3DPrinter` (empty
 * imageBaseUrl, not enrolled) stays on the legacy HTML path. The consumables flag machinery is gone
 * (FR-20, OD-14).
 */
import { describe, it, expect } from 'vitest';
import * as flag from './doc-pipeline-flag';
import { usesDocPipeline, DOC_PIPELINE_STORES } from './doc-pipeline-flag';
import { STORE_REGISTRY } from './constants';
import { SIMPLIFIED_TEMPLATE_IDS } from './simplified-templates';
import { STALE_TEMPLATE_ID, REMOVED_EXPORTS } from '../../test/fixtures/removed-tokens';

const TEMPLATES: Array<string | undefined> = [undefined, '', ...SIMPLIFIED_TEMPLATE_IDS];

describe('FR-7 — every simplified template routes to the Doc pipeline for the Doc stores', () => {
  it('there are six enrolled stores (guards the loop below against an empty list)', () => {
    expect(DOC_PIPELINE_STORES).toHaveLength(6);
  });
  for (const store of ['EXPERT3D', '3DDevice', '3DPrinter', '3DScanner', 'Center 3D Print', 'Drukarka 3D']) {
    it(`${store}: true for Full and for each simplified id`, () => {
      for (const t of TEMPLATES) expect(usesDocPipeline(store, t), `${store}/${t ?? 'undefined'}`).toBe(true);
    });
  }
});

describe('FR-7 — Expert-3DPrinter stays on the legacy HTML path whatever the template', () => {
  it('is not enrolled and has no image base', () => {
    expect(DOC_PIPELINE_STORES).not.toContain('Expert-3DPrinter');
    expect(STORE_REGISTRY['Expert-3DPrinter'].imageBaseUrl).toBe('');
  });
  it('false for Full and for each simplified id', () => {
    for (const t of TEMPLATES) expect(usesDocPipeline('Expert-3DPrinter', t), String(t)).toBe(false);
  });
});

describe('FR-20 — the consumables exclusion and flag are removed', () => {
  it('a stale template id no longer forces the legacy path for a Doc store', () => {
    expect(usesDocPipeline('EXPERT3D', STALE_TEMPLATE_ID)).toBe(true);
  });
  it('the consumables pipeline flag and its enablement constant are no longer exported', () => {
    for (const name of REMOVED_EXPORTS.docPipelineFlag) expect(name in flag, name).toBe(false);
  });
});
