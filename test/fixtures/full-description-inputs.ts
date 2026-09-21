/**
 * full-description-inputs.ts — deterministic prompt-builder inputs for the FR-6 / NFR-6 golden
 * guard (US-2.2).
 *
 * The goldens in `test/fixtures/golden/full-description-prompts.json` were captured from the tree
 * BEFORE any US-2.2 edit (task breakdown, "Goldens" note). Every case here is a call with no
 * `templateId` — Full description — so the recorded bytes are what the pre-Story builders emit.
 * Do NOT regenerate the JSON after implementation starts: doing so would make the guard assert
 * the implementation back to itself.
 */
import type { ProductInput } from '../../src/app/types';
import type { HookPattern } from '../../src/prompt-core/hook-pattern';
import { buildPromptA } from '../../src/prompts/task-a';
import { buildPromptADoc } from '../../src/prompts/task-a-doc';
import { buildTranslatePrompt } from '../../src/prompts/task-translate';
import { buildPromptC } from '../../src/prompts/task-c';
import type { PromptPayload } from '../../src/prompt-core/payload';

export const SPECS_MD =
  '| Параметр | Значення |\n|---|---|\n| Діаметр | 1,75 мм |\n| Вага котушки | 1 кг |\n| Температура друку | 200-230 °C |';

export const EXPERT3D_INPUT: ProductInput = {
  website: { name: 'EXPERT3D', group: 'ES', url: 'expert3d.es' },
  name: 'eSUN PLA+ Filament 1.75 mm 1 kg',
  description:
    'PLA+ filament with improved toughness. <iframe src="https://www.youtube.com/embed/abc123" title="PLA+ overview"></iframe>',
  specs: SPECS_MD,
  supplementalContent: 'Popular questions: does it need a heated bed?',
  customInstructions: 'Keep the tone practical.',
  brandFolder: 'esun',
  modelFolder: 'pla-plus',
  imageManifest: [
    {
      id: 'img-1', originalFilename: 'spool.jpg', urlFilename: 'esun-pla-plus-spool.jpg',
      previewUrl: '', visionDescription: 'A spool of grey filament', altText: 'Grey PLA+ spool',
      order: 1, status: 'done',
    },
    {
      id: 'img-2', originalFilename: 'print.jpg', urlFilename: 'esun-pla-plus-print.jpg',
      previewUrl: '', visionDescription: '', altText: '', order: 2, status: 'error',
    },
  ],
};

export const LEGACY_INPUT: ProductInput = {
  website: { name: 'Expert-3DPrinter', group: 'US', url: 'expert-3dprinter.com' },
  name: 'Creality Ender-3 V3 SE',
  description: 'Budget FDM printer with auto leveling.',
  specs: SPECS_MD,
};

export const C3D_INPUT: ProductInput = {
  website: { name: 'Center 3D Print', group: 'EU', url: 'center3dprint.com' },
  name: 'Ortur Laser Master 3',
  description: 'Diode laser engraver.',
  specs: '',
  customTemplate: { bodyFocus: 'material properties' },
};

const HOOK: HookPattern = { instruction: 'Open with the buyer problem.' } as unknown as HookPattern;
const SAMPLE_HTML = '<p><b>Тест</b> — короткий опис.</p>\n<h2>Розділ</h2>\n<p>Текст 1,75 мм.</p>';

export const GOLDEN_CASES: Record<string, () => PromptPayload> = {
  'doc/expert3d': () => buildPromptADoc(EXPERT3D_INPUT),
  'doc/expert3d+hook': () => buildPromptADoc(EXPERT3D_INPUT, undefined, HOOK),
  'doc/c3d': () => buildPromptADoc(C3D_INPUT),
  'html/expert3d': () => buildPromptA(EXPERT3D_INPUT),
  'html/legacy': () => buildPromptA(LEGACY_INPUT),
  'html/legacy+lang': () => buildPromptA(LEGACY_INPUT, 'American English (en-US)'),
  'html/c3d+customTemplate': () => buildPromptA(C3D_INPUT),
  'translate/uk-user': () => buildTranslatePrompt(SAMPLE_HTML, 'Ukrainian', 'user-facing-content'),
  'translate/de-internal': () => buildTranslatePrompt(SAMPLE_HTML, 'German', 'internal-matching-only'),
  'c/expert3d-es': () => buildPromptC(SAMPLE_HTML, 'Spanish (EXPERT3D)', 'EXPERT3D', 'ES'),
  'c/eu-en': () => buildPromptC(SAMPLE_HTML, 'European English', 'Center 3D Print', 'EU', undefined,
    { localizedName: 'Ortur Laser Master 3', sourceLocale: 'uk-UA' }),
  'c/us-uk': () => buildPromptC(SAMPLE_HTML, 'Ukrainian', 'Expert-3DPrinter', 'US'),
};
