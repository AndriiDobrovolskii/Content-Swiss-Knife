/**
 * doc-pipeline-flag.spec.ts
 *
 * The rollout switch for the Doc pipeline. Two rules carry real weight:
 *
 *   1. CONSUMABLES ARE NEVER ELIGIBLE. §C artifacts cannot be expressed as a ProductDescriptionDoc
 *      at all — both mandatory fields have no source in them (no <thead> killer-specs table, no
 *      <section class="specs">; §C4 is a bare div.table-responsive inside an <h2> group). This is
 *      not a precaution, it is a proven impossibility — see the §C tests in
 *      test/tools/scaffold-doc.spec.ts. Routing one through the Doc path fails every time.
 *
 *   2. OPT-IN BY STORE, not opt-out. A store absent from the list keeps the HTML path, so adding a
 *      store to STORE_REGISTRY can never silently enrol it in an unproven pipeline.
 */
import { describe, it, expect } from 'vitest';

import { DOC_PIPELINE_STORES, usesDocPipeline } from './doc-pipeline-flag';
import { STORE_REGISTRY } from './constants';

describe('usesDocPipeline', () => {
  it('enables the store the live probe actually exercised', () => {
    expect(usesDocPipeline('EXPERT3D')).toBe(true);
  });

  it('leaves every other store on the HTML path', () => {
    const enabled = Object.keys(STORE_REGISTRY).filter(s => usesDocPipeline(s));
    expect(enabled).toEqual([
      '3DDevice', '3DPrinter', '3DScanner', 'Center 3D Print', 'Drukarka 3D', 'EXPERT3D',
    ]);
  });

  /**
   * Center 3D Print and Drukarka 3D both followed EXPERT3D onto the Doc pipeline once their
   * readiness was verified — see doc-pipeline-flag.ts's own rollout notes.
   */
  it('covers every live store, leaving only the one that cannot render', () => {
    const off = Object.keys(STORE_REGISTRY).filter(s => !usesDocPipeline(s));
    // Expert-3DPrinter is a placeholder, not yet trading: imageBaseUrl is '', so
    // renderContextFor() refuses it by design. It must NOT borrow another store's domain.
    expect(off).toEqual(['Expert-3DPrinter']);
    expect(STORE_REGISTRY['Expert-3DPrinter'].imageBaseUrl).toBe('');
  });

  /**
   * The impossibility, not a precaution. A §C artifact has no §2a and no §7, which the schema
   * requires — so this must hold for an enabled store too.
   */
  it('never enables consumables, even for an enabled store', () => {
    expect(usesDocPipeline('EXPERT3D', 'consumables-resin')).toBe(false);
  });

  it('still enables an enabled store for a non-consumables template', () => {
    expect(usesDocPipeline('EXPERT3D', 'fdm-printer')).toBe(true);
    expect(usesDocPipeline('EXPERT3D', undefined)).toBe(true);
  });

  it('is opt-in — an unknown store is not enrolled', () => {
    expect(usesDocPipeline('Some New Store')).toBe(false);
  });

  /** Every listed store must be real, or the flag silently does nothing for a typo. */
  it('lists only stores that exist in the registry', () => {
    const unknown = DOC_PIPELINE_STORES.filter(s => !(s in STORE_REGISTRY));
    expect(unknown).toEqual([]);
  });

  /**
   * A store with no image base cannot render at all — renderContextFor() refuses it. Enrolling one
   * would swap a working HTML path for a guaranteed throw.
   */
  it('lists only stores that can actually render', () => {
    const unrenderable = DOC_PIPELINE_STORES.filter(s => !STORE_REGISTRY[s]?.imageBaseUrl);
    expect(unrenderable).toEqual([]);
  });
});
