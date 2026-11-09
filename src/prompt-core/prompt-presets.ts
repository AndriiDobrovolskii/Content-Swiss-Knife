import { ASPECT_RATIOS, RESOLUTIONS } from './image-studio-contract';
import { IMAGE_MODELS, type ImageModelSpec } from './model-catalog';

/**
 * Image Studio prompt presets, quick-edit chip instructions and the `{product}` substitution (US-10.1,
 * FR-28..FR-31, FR-78..FR-80).
 *
 * This is the one place studio prompt text lives (AGENTS.md section 3 Rule 3): no component or service
 * holds a template literal. Only the user prompt is ever built from it - no system instruction exists
 * here or is sent with a studio request (FR-80, NFR-8).
 *
 * The registry is data: a preset added to it is found by `findPreset` and named by `presetName` with no
 * component change. A malformed entry is caught by `validatePreset` in the registry test, never at runtime.
 */

/** UI languages a preset name is offered in. */
export type PresetLang = 'en' | 'uk';

/** What picking a preset fills into the composer (FR-30). */
export interface PresetDefaults {
  aspectRatio: string;
  resolution: string;
  /** Wire id of an image model in the catalogue. */
  model: string;
}

export interface PromptPreset {
  /** Lowercase, unique, free of "|" so it is safe inside a task label. */
  id: string;
  name: Record<PresetLang, string>;
  /** Optional one-line card text, bilingual like `name` (US-10.5 FR-22). A preset without one has no card text. */
  description?: Record<PresetLang, string>;
  /** User-prompt template; carries the `{product}` placeholder. */
  template: string;
  defaults: PresetDefaults;
}

/** The literal placeholder a template carries and `applyProduct` replaces. */
const PRODUCT_PLACEHOLDER = '{product}';

/** The words substituted when the product-name field is empty or whitespace only (D-15). */
const EMPTY_PRODUCT_TEXT = 'the product';

/** Exactly the five presets of OD-26, in the AC-17 order. */
export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'white-bg',
    name: { uk: 'Товар на білому тлі', en: 'Product on white' },
    description: { en: 'Perfect for e-commerce listings', uk: 'Ідеально для товарних карток' },
    template:
      'Product photo of {product} on a clean pure white (#FFFFFF) background, soft shadow below the product, product centred in the frame.',
    defaults: { aspectRatio: '1:1', resolution: '2K', model: 'gemini-3.1-flash-image' },
  },
  {
    id: 'lifestyle',
    name: { uk: 'Лайфстайл-сцена', en: 'Lifestyle scene' },
    description: { en: 'Product in a realistic setting', uk: 'Товар у реалістичному оточенні' },
    template:
      'Lifestyle photo of {product} placed in a real environment such as a workshop, an office or a classroom.',
    defaults: { aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' },
  },
  {
    id: 'banner',
    name: { uk: 'Банер категорії', en: 'Category banner' },
    description: { en: 'Wide format with space for text', uk: 'Широкий формат із місцем для тексту' },
    template:
      'Wide banner image featuring {product}, with a free area reserved for text. Do not draw any text.',
    defaults: { aspectRatio: '16:9', resolution: '2K', model: 'gemini-3-pro-image' },
  },
  {
    id: 'social',
    name: { uk: 'Соцмережі', en: 'Social' },
    template: 'Social media image of {product}.',
    defaults: { aspectRatio: '4:5', resolution: '1K', model: 'gemini-3.1-flash-image' },
  },
  {
    id: 'detail-closeup',
    name: { uk: 'Деталь крупним планом', en: 'Detail close-up' },
    template: 'Detail close-up of {product}.',
    defaults: { aspectRatio: '1:1', resolution: '2K', model: 'gemini-3-pro-image' },
  },
];

/**
 * The ids of the three starter cards of the empty state, in card order (US-10.5 FR-18, FR-22). An explicit list,
 * not "the presets that have a description", so giving another preset a description adds no card.
 */
export const STARTER_PRESET_IDS: readonly string[] = ['white-bg', 'lifestyle', 'banner'];

/** One quick-edit chip (FR-31). The instruction is model-facing and single-language English whatever the UI language. */
export interface ChipInstruction {
  id: 'remove-background' | 'brighter' | 'softer-shadow' | 'different-angle';
  /** Interface-text id of the chip label (T-15a..T-15d). */
  textId: 'T-15a' | 'T-15b' | 'T-15c' | 'T-15d';
  instruction: string;
}

/** The four chip instructions of SD-21, in chip order (AC-18). */
export const CHIP_INSTRUCTIONS: ChipInstruction[] = [
  { id: 'remove-background', textId: 'T-15a', instruction: 'Remove the background.' },
  { id: 'brighter', textId: 'T-15b', instruction: 'Make the image brighter.' },
  { id: 'softer-shadow', textId: 'T-15c', instruction: 'Make the shadow softer.' },
  { id: 'different-angle', textId: 'T-15d', instruction: 'Show the product from a different angle.' },
];

/**
 * Replaces every `{product}` in `template` with the typed product name (D-14, D-15). A blank name gives
 * "the product". Pure: the template is not mutated, and the name is inserted verbatim - it is never read
 * as a replacement pattern, so `$&` or `$1` in it stay literal.
 */
export function applyProduct(template: string, product: string): string {
  const name = typeof product === 'string' ? product.trim() : '';
  return template.split(PRODUCT_PLACEHOLDER).join(name === '' ? EMPTY_PRODUCT_TEXT : name);
}

/** The preset with `id`, or undefined. Takes the registry so a copy can be passed in (FR-29). */
export function findPreset(id: string, registry: readonly PromptPreset[] = PROMPT_PRESETS): PromptPreset | undefined {
  return registry.find((preset) => preset.id === id);
}

/** The preset's display name in `lang`. */
export function presetName(preset: PromptPreset, lang: PresetLang): string {
  return preset.name[lang];
}

/** The preset's card text in `lang`, or undefined when the preset has no description (US-10.5 FR-22). */
export function presetDescription(preset: PromptPreset, lang: PresetLang): string | undefined {
  return preset.description?.[lang];
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim() !== '';
}

/**
 * Checks one registry entry and returns one message per defect, or `[]` when it is valid (FR-29). The
 * registry test runs it over every shipped entry, so a malformed entry fails the build rather than the
 * runtime. `models` defaults to the catalogue's image models.
 */
export function validatePreset(entry: unknown, models: readonly ImageModelSpec[] = IMAGE_MODELS): string[] {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return ['preset must be an object'];
  }
  const preset = entry as Record<string, any>;
  const errors: string[] = [];

  if (!isNonEmptyString(preset['id'])) errors.push('id is missing');
  const name = preset['name'];
  if (typeof name !== 'object' || name === null) {
    errors.push('name is missing');
  } else {
    if (!isNonEmptyString(name['uk'])) errors.push('name.uk is missing');
    if (!isNonEmptyString(name['en'])) errors.push('name.en is missing');
  }
  if (preset['description'] !== undefined) {
    const description = preset['description'];
    if (typeof description !== 'object' || description === null || Array.isArray(description)) {
      errors.push('description must be an object with en and uk');
    } else {
      if (!isNonEmptyString(description['uk'])) errors.push('description.uk is missing');
      if (!isNonEmptyString(description['en'])) errors.push('description.en is missing');
    }
  }
  if (!isNonEmptyString(preset['template'])) {
    errors.push('template is missing');
  } else if (!preset['template'].includes(PRODUCT_PLACEHOLDER)) {
    errors.push(`template must contain ${PRODUCT_PLACEHOLDER}`);
  }

  const defaults = preset['defaults'];
  if (typeof defaults !== 'object' || defaults === null) {
    errors.push('defaults is missing');
    return errors;
  }
  if (!ASPECT_RATIOS.includes(defaults['aspectRatio'])) {
    errors.push(`defaults.aspectRatio is not a supported ratio: ${String(defaults['aspectRatio'])}`);
  }
  if (!RESOLUTIONS.includes(defaults['resolution'])) {
    errors.push(`defaults.resolution is not a supported resolution: ${String(defaults['resolution'])}`);
  }
  if (!isNonEmptyString(defaults['model'])) {
    errors.push('defaults.model is missing');
  } else {
    const model = models.find((m) => m.id === defaults['model']);
    if (!model) {
      errors.push(`defaults.model is not a catalogue image model: ${defaults['model']}`);
    } else if (!model.resolutions.includes(defaults['resolution'])) {
      errors.push(`defaults.resolution ${String(defaults['resolution'])} is not offered by ${model.id}`);
    }
  }
  return errors;
}
