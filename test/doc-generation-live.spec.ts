/**
 * doc-generation-live.spec.ts
 *
 * THE ONE QUESTION THE OTHER GATES CANNOT ANSWER: can a model actually produce a valid
 * ProductDescriptionDoc?
 *
 * Reconciliation proves the renderer reproduces bytes production shipped. Conformance proves it
 * obeys the rules for all 8 stores. Both test the renderer with a HAND-AUTHORED Doc as input.
 * Nothing has ever asked a model for one. Until that is answered, switching production to
 * renderDescription() would put the first real test of it on every store simultaneously.
 *
 * SKIPPED BY DEFAULT — it costs tokens and needs the proxy up. Run it deliberately:
 *
 *   npm run dev                      # in another terminal: frontend + proxy on :3001
 *   LIVE_DOC_TEST=1 npx vitest run test/doc-generation-live.spec.ts
 *
 * It is written to be INFORMATIVE ON FAILURE rather than merely red: it prints every schema issue
 * with its path, so "the model cannot do this" and "the model nearly did it but missed one field"
 * are distinguishable. That distinction is the entire decision this test exists to inform.
 */
import { describe, it, expect } from 'vitest';

import { buildPromptADoc } from '../src/prompts/task-a-doc';
import { ProductDescriptionDocSchema } from '../src/domain/description-doc.schema';
import { renderDescription } from '../src/render/render-description';
import { normalizeDocProse } from '../src/render/doc-prose-transforms';
import { renderContextFor } from '../src/prompt-core/store-render-rules';
import { validateGeneratedHtml } from '../src/utils/output-validator';
import type { ProductInput } from '../src/app/types';
import type { ProductDescriptionDoc } from '../src/domain/description-doc';

const LIVE = !!process.env.LIVE_DOC_TEST;
const PROXY = process.env.PROXY_URL ?? 'http://localhost:3001';
const STORE = 'EXPERT3D';

/** A realistic input — the same product the corpus covers, so the output is comparable by eye. */
const INPUT = {
  name: 'Ortur H20 20 W',
  website: { name: STORE },
  description:
    '<p>Ortur H20 is an enclosed 20 W diode laser engraver and cutter. Working area 420 x 300 mm, ' +
    'max object height 98 mm, speed up to 20000 mm/min. Built-in camera, motorised lift platform, ' +
    'enclosure with fume extraction, Class 1 safety, Wi-Fi and USB, controlled from ORTUR app, ' +
    'LightBurn or LaserGRBL.</p>',
  specs:
    'Laser power: 20 W\nWorking area: 420 x 300 mm\nMax object height: 98 mm\n' +
    'Max speed: 20000 mm/min\nConnectivity: Wi-Fi, USB\nSoftware: ORTUR / LightBurn / LaserGRBL',
} as ProductInput;

async function generateDoc(): Promise<unknown> {
  const payload = buildPromptADoc(INPUT, 'Ukrainian (uk-UA)');
  const res = await fetch(`${PROXY}/api/llm/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemBlocks: payload.systemBlocks,
      userContent: payload.userContent,
      mode: 'json',
      taskLabel: 'Doc (live probe)',
      productName: INPUT.name,
      store: STORE,
      lang: 'uk-UA',
    }),
  });
  if (!res.ok) throw new Error(`proxy ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).result;
}

describe.skipIf(!LIVE)('live: can a model emit a valid ProductDescriptionDoc?', () => {
  // One generation, shared by every assertion below — this costs real tokens.
  let raw: unknown;

  it('reaches the proxy and returns JSON', async () => {
    raw = await generateDoc();
    expect(raw, 'proxy returned nothing').toBeTruthy();
    expect(typeof raw, `expected an object, got ${typeof raw}`).toBe('object');
  }, 180_000);

  it('validates against ProductDescriptionDocSchema', () => {
    const result = ProductDescriptionDocSchema.safeParse(raw);
    if (!result.success) {
      // The whole point: name every field the model got wrong, not just "invalid".
      console.error(
        '\n[live] schema issues:\n' +
          result.error.issues.map(i => `  ${i.path.join('.') || '(root)'} — ${i.message}`).join('\n') +
          '\n',
      );
    }
    expect(result.success).toBe(true);
  });

  it('renders, and the rendered HTML has zero validator errors', () => {
    // parse() for the validation, `raw` for the type — the same workaround
    // content-orchestrator.service.ts:306 uses, for the same reason: without strictNullChecks
    // zod's inferred type comes back all-optional and does not satisfy ProductDescriptionDoc.
    // See the TSCONFIG NOTE at the foot of src/domain/description-doc.schema.ts.
    ProductDescriptionDocSchema.parse(raw);
    const doc = raw as ProductDescriptionDoc;
    const html = renderDescription(normalizeDocProse(doc, doc.locale), renderContextFor(STORE, 'Ortur', 'H20'));
    const errors = validateGeneratedHtml(html, 'live doc probe', doc.localizedName, doc.locale, {
      imageManifest: doc.figures.map(f => ({ urlFilename: f.file })),
    }).filter(i => i.severity === 'error');

    if (errors.length) console.error('\n[live] validator errors:\n' + JSON.stringify(errors, null, 2) + '\n');
    expect(errors).toHaveLength(0);
  });
});

/**
 * Always runs. The live suite above is skipped by default, and a suite that is ALWAYS skipped
 * reports green while proving nothing — the same vacuous pass render-reconciliation.spec.ts guards
 * against with its pending ledger. This makes the skip visible instead of silent.
 */
describe('live doc probe — status', () => {
  it('reports whether the model-side of the pipeline has been exercised', () => {
    if (!LIVE) {
      console.warn(
        '\n[live] SKIPPED — the model half of the Doc pipeline is UNVERIFIED.\n' +
          '  Run: npm run dev, then LIVE_DOC_TEST=1 npx vitest run test/doc-generation-live.spec.ts\n' +
          '  Until this passes, switching production to renderDescription() rests on an untested assumption.\n',
      );
    }
    expect(typeof LIVE).toBe('boolean');
  });
});
