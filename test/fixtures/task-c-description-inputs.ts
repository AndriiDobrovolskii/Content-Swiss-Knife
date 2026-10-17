/**
 * task-c-description-inputs.ts — deterministic `buildPromptC` inputs for the US-8.1 FR-13 / AC-18
 * byte-identity guard (`src/prompts/task-c.description-bytes.spec.ts`).
 *
 * WHAT THIS IS. The one CHARACTERIZATION fixture of US-8.1. The golden
 * `test/fixtures/golden/task-c-description-prompts.json` was captured by TEST_WRITING from the
 * UNMODIFIED `src/prompts/task-c.ts` (git diff empty, `bash arch-guard.sh` exit 0, HEAD recorded in the
 * test generation report) by a one-off capture that has since been deleted. Do NOT regenerate it after
 * T1 starts: that would make the guard assert the implementation back to itself.
 *
 * COVERAGE. Every STORE_REGISTRY store x every non-master language of that store (derived with
 * `getLangsForStore`, never typed out), each with and without `opts`, over two description inputs:
 * the hand-verified corpus master (figures, a specs section, a closing CTA - the branches of `pack()`
 * that matter) and a short snippet (the standalone-snippet branch).
 *
 * NONE of these calls passes `contentKind`, not even `'description'` (task breakdown, constraints on
 * TEST_WRITING, item 2): the spec must type-check and stay green against the unmodified file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORE_REGISTRY, getLangsForStore } from '../../src/prompt-core/constants';
import { buildPromptC } from '../../src/prompts/task-c';
import type { PromptPayload } from '../../src/prompt-core/payload';
import type { WebsiteGroup } from '../../src/app/types';

// Line endings are normalised: the checkout may be CRLF (Windows autocrlf) or LF (CI), and the golden's
// digests must not depend on which.
export const CORPUS_MASTER_HTML = readFileSync(
  join(process.cwd(), 'test', 'fixtures', 'corpus', 'expert3d-ortur-h20-20w.uk-UA.html'), 'utf8',
).split('\r\n').join('\n');
export const SNIPPET_HTML = '<p><b>Тест</b> — короткий опис, 1,75 мм.</p>';

export interface PairCase { store: string; group: WebsiteGroup; lang: string }

/** Every (store, non-master language) pair, derived from the registry. */
export const registryPairs = (): PairCase[] =>
  Object.keys(STORE_REGISTRY).flatMap(store =>
    getLangsForStore(store).transLangs.map(lang => ({ store, group: STORE_REGISTRY[store].group, lang })));

type Opts = { localizedName?: string; sourceLocale?: string };
const VARIANTS: Array<{ name: string; html: 'corpus' | 'snippet'; templateId?: string; opts?: Opts }> = [
  { name: 'corpus/no-opts', html: 'corpus' },
  { name: 'corpus/source-locale', html: 'corpus', opts: { sourceLocale: 'uk-UA' } },
  { name: 'corpus/source-locale+localized-name', html: 'corpus', opts: { sourceLocale: 'uk-UA', localizedName: 'Ortur H20 20 W' } },
  { name: 'corpus/simplified-template+source-locale', html: 'corpus', templateId: 'spare-parts', opts: { sourceLocale: 'uk-UA' } },
  { name: 'snippet/no-opts', html: 'snippet' },
  { name: 'snippet/source-locale', html: 'snippet', opts: { sourceLocale: 'uk-UA' } },
];

export const caseKey = (p: PairCase, variant: string) => `${p.store} | ${p.lang} | ${variant}`;

export function descriptionCases(): Record<string, () => PromptPayload> {
  const out: Record<string, () => PromptPayload> = {};
  for (const p of registryPairs()) {
    for (const v of VARIANTS) {
      const html = v.html === 'corpus' ? CORPUS_MASTER_HTML : SNIPPET_HTML;
      out[caseKey(p, v.name)] = () => buildPromptC(html, p.lang, p.store, p.group, v.templateId, v.opts);
    }
  }
  return out;
}
