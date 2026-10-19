/**
 * task-a-user-content-inputs.ts - deterministic `buildPromptA` / `buildPromptADoc` inputs for the
 * US-9.1 FR-27 `userContent` oracle (`src/prompts/task-a.user-content.golden.spec.ts`).
 *
 * WHAT THIS IS. The input set of Specification FR-27 (confirmed by the owner, OD-18): one store from each
 * STORE_REGISTRY group (`3DDevice` UA, `Center 3D Print` EU, `EXPERT3D` ES, `Expert-3DPrinter` US), the Full
 * description template and one simplified template, with and without `customInstructions`, with and without
 * an image manifest, with and without `baseLanguageOverride`, plus the video, marker and video-plus-marker
 * inputs of Tier B. The existing whole-payload goldens carry no marker input at all, so `buildMarkerBlock` has
 * never been exercised by a byte golden; this set adds it.
 *
 * The expected bytes are in `test/fixtures/golden/task-a-user-content.json`, captured by TEST_WRITING from the
 * commit the Story branch was cut from, BEFORE any edit to `task-a.ts` (header `_meta`). Never regenerate that
 * JSON after implementation starts: that would make the oracle assert the implementation back to itself
 * (AGENTS.md section 7.7). This file may be extended only by adding a case and recapturing from BASE.
 *
 * No input here carries an operator-notes property or text (FR-27; the property is not part of `ProductInput` after the
 * withdrawal, FR-44). Pins that attach a stray property do so in the spec, through `unknown`.
 */
import type { ProductInput } from '../../src/app/types';
import type { HookPattern } from '../../src/prompt-core/hook-pattern';
import { buildPromptA } from '../../src/prompts/task-a';
import { buildPromptADoc } from '../../src/prompts/task-a-doc';
import type { PromptPayload } from '../../src/prompt-core/payload';
import { STORE_REGISTRY } from '../../src/prompt-core/constants';
import { LAMP, KETTLE, MARKER } from './image-placeholder/fixtures';

export const SPECS_MD =
  '| Параметр | Значення |\n|---|---|\n| Діаметр | 1,75 мм |\n| Вага котушки | 1 кг |\n| Температура друку | 200-230 °C |';

/** The four stores, one per registry group. Names are looked up in the registry, never typed as a list. */
const STORE_FOR_GROUP = { UA: '3DDevice', EU: 'Center 3D Print', ES: 'EXPERT3D', US: 'Expert-3DPrinter' } as const;

const website = (name: string) => ({ name, group: STORE_REGISTRY[name].group, url: `https://${name.replace(/\s+/g, '-').toLowerCase()}.example` });

const YOUTUBE = '<iframe src="https://www.youtube.com/embed/abc123XYZ" title="PLA+ overview"></iframe>';
const VIMEO = '<iframe src="https://player.vimeo.com/video/123456789" title="Hands-on"></iframe>';

const MANIFEST = [LAMP, KETTLE];

const base = (store: string, over: Partial<ProductInput> = {}): ProductInput => ({
  website: website(store),
  name: 'Creality Ender-3 V3 SE',
  description: 'Budget FDM printer with auto leveling and a direct-drive extruder.',
  specs: SPECS_MD,
  brandFolder: 'creality',
  modelFolder: 'ender-3-v3-se',
  ...over,
});

export type Tier = 'A' | 'B-video' | 'B-marker' | 'B-both';

export interface UserContentCase {
  tier: Tier;
  input: ProductInput;
  override?: string;
}

const hook: HookPattern = { id: 'oracle', instruction: 'Open with the buyer problem.' };
export const ORACLE_HOOK: HookPattern = hook;

/** Every case. Keys are stable ids; the golden is keyed by them. */
export const USER_CONTENT_CASES: Record<string, UserContentCase> = (() => {
  const out: Record<string, UserContentCase> = {};
  for (const [group, store] of Object.entries(STORE_FOR_GROUP)) {
    const g = group.toLowerCase();
    out[`${g}/full/plain`] = { tier: 'A', input: base(store) };
    out[`${g}/full/custom+manifest`] = {
      tier: 'A',
      input: base(store, { customInstructions: 'Keep the tone practical.\nMention the build volume.', imageManifest: MANIFEST }),
    };
    out[`${g}/full/supplemental-multiline+override`] = {
      tier: 'A',
      input: base(store, { supplementalContent: 'Q: does it need a heated bed?\nA: yes, 60 °C.\n\nQ: which nozzle? A: 0.4 mm.' }),
      override: 'American English (en-US)',
    };
    out[`${g}/simplified/spare-parts`] = { tier: 'A', input: base(store, { templateId: 'spare-parts' }) };
    out[`${g}/simplified/accessories+functionality+custom+manifest`] = {
      tier: 'A',
      input: base(store, {
        templateId: 'accessories', includeFunctionality: true, customInstructions: 'Short and factual.', imageManifest: MANIFEST,
      }),
    };
    out[`${g}/simplified/filaments+override`] = {
      tier: 'A', input: base(store, { templateId: 'filaments-resins-powders', specs: '' }), override: 'Ukrainian',
    };
  }
  // Tier B: the three inputs whose userContent changes by the two FR-11 spans.
  out['es/video/one-embed'] = { tier: 'B-video', input: base('EXPERT3D', { description: `PLA+ filament. ${YOUTUBE}` }) };
  out['es/video/two-embeds+manifest'] = {
    tier: 'B-video',
    input: base('EXPERT3D', { description: `PLA+ filament. ${YOUTUBE} More text. ${VIMEO}`, imageManifest: MANIFEST }),
  };
  out['eu/video/custom'] = {
    tier: 'B-video', input: base('Center 3D Print', { description: `Laser engraver. ${YOUTUBE}`, customInstructions: 'Practical tone.' }),
  };
  out['us/video/legacy'] = { tier: 'B-video', input: base('Expert-3DPrinter', { description: `Printer. ${YOUTUBE}` }) };
  out['es/marker/one'] = {
    tier: 'B-marker', input: base('EXPERT3D', { description: `Intro paragraph ${MARKER} closing text.`, imageManifest: MANIFEST }),
  };
  out['us/marker/legacy'] = {
    tier: 'B-marker', input: base('Expert-3DPrinter', { description: `Intro paragraph ${MARKER} closing text.`, imageManifest: MANIFEST }),
  };
  out['es/both/video+marker'] = {
    tier: 'B-both',
    input: base('EXPERT3D', { description: `Intro ${MARKER} text. ${YOUTUBE}`, imageManifest: MANIFEST, customInstructions: 'Practical tone.' }),
  };
  return out;
})();

export const caseNames = (): string[] => Object.keys(USER_CONTENT_CASES);

/** `buildPromptA` for a case: the object whose `userContent` the oracle pins. */
export const buildCase = (name: string): PromptPayload => {
  const c = USER_CONTENT_CASES[name];
  return buildPromptA(c.input, c.override);
};

/** The input `buildPromptADoc` hands to `buildPromptA` (it strips a simplified `templateId`). */
export const docBaseInput = (c: UserContentCase): ProductInput =>
  (c.input.templateId && ['filaments-resins-powders', 'accessories', 'spare-parts'].includes(c.input.templateId))
    ? { ...c.input, templateId: undefined } : c.input;

/** `buildPromptADoc` for a case, without and with a hook pattern. */
export const buildDocCase = (name: string, withHook: boolean): PromptPayload => {
  const c = USER_CONTENT_CASES[name];
  return buildPromptADoc(c.input, c.override, withHook ? hook : undefined);
};
