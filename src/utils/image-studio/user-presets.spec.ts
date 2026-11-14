/**
 * user-presets.spec.ts - US-10.6 T16 (FR-15 (a)-(d), FR-16, FR-17; AC-10, AC-10a, AC-11).
 *
 * `src/utils/image-studio/user-presets.ts`: the pure core of "+ Save current as preset". No `localStorage` here (scan g bans it under this directory;
 * the port is T18). PINNED CONTRACT (the plan names the three functions; their shapes are fixed here, following the registry preset shape):
 *   UserPreset = { id: string, name: string, prompt: string, aspectRatio: string, resolution: string, model: string }
 *   createUserPreset(input: { name, prompt, aspectRatio, resolution, model }, existing: readonly UserPreset[], nowMs: number)
 *       -> { ok: true, preset: UserPreset } | { ok: false, reason: string }
 *       - id: `user-<base36 of nowMs>` with a counter suffix on collision with an id in `existing`; matches ^[a-z0-9][a-z0-9-]{0,63}$, has no `|`,
 *         starts with `user-` (no registry id does). The typed name is DISPLAY text only and never becomes the id.
 *       - name is stored exactly as typed (not localized, not transliterated); the prompt is the literal composer text (never a `{product}` template).
 *       - an empty or whitespace-only name, or a name equal to an existing user preset name or to a registry preset name (uk or en), is refused with a reason.
 *   parseStoredPresets(value: unknown) -> { ok: true, presets: UserPreset[] } | { ok: false }
 *       - a value that is not an array of well-formed presets is { ok: false } as a whole: data that does not parse is ignored, NOT partly applied.
 *   deleteUserPreset(presets: readonly UserPreset[], id: string) -> UserPreset[]     a new array without that id; the input is not mutated.
 *
 * Deferred (SEAM SM-6 / SM-5, T17): the name-length cap, the preset-count cap and the stale model / resolution check - the owner has not supplied the values.
 */
import { describe, it, expect } from 'vitest';
import { PROMPT_PRESETS } from '../../prompt-core/prompt-presets';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const mod = () => load('./user-presets');

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const NOW = Date.UTC(2026, 10, 14, 12, 0, 0);
const input = (over: Record<string, unknown> = {}) => ({ name: 'My mug shot', prompt: 'A mug on a desk, soft light', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image', ...over });

async function create(over: Record<string, unknown> = {}, existing: unknown[] = [], now = NOW): Promise<any> {
  const { createUserPreset } = await mod();
  return createUserPreset(input(over), existing, now);
}

describe('createUserPreset: what is saved (T16, FR-15, AC-10)', () => {
  it('AC-10: saves the current prompt, aspect ratio, resolution and model under the typed name', async () => {
    const r = await create();
    expect(r.ok).toBe(true);
    expect(r.preset).toMatchObject({ name: 'My mug shot', prompt: 'A mug on a desk, soft light', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' });
  });

  it('AC-10: the name is stored exactly as typed - mixed case, inner spaces, Cyrillic and a pipe are kept; nothing is localized or transliterated', async () => {
    for (const name of ['Мій кухоль | вечір', 'ALL CAPS  and  spaces', 'ёжик №1', 'a|b']) {
      const r = await create({ name });
      expect(r.ok, name).toBe(true);
      expect(r.preset.name, name).toBe(name);
    }
  });

  it('FR-15 (b): the saved prompt is the literal composer text - a {product} placeholder typed by the user is NOT turned into a template or substituted', async () => {
    const r = await create({ prompt: 'Photo of {product} on white' });
    expect(r.preset.prompt).toBe('Photo of {product} on white');
  });
});

describe('createUserPreset: the id (T16, FR-15 (a), plan 7.5, guard S8)', () => {
  it('FR-15 (a): the id matches the registry id pattern, contains no pipe, and starts with user-', async () => {
    const r = await create();
    expect(r.preset.id).toMatch(ID_PATTERN);
    expect(r.preset.id.includes('|')).toBe(false);
    expect(r.preset.id.startsWith('user-')).toBe(true);
  });

  it('FR-15 (a): a name with a pipe or non-ASCII text yields a valid id that does not contain the name (it cannot corrupt the usage taskLabel)', async () => {
    for (const name of ['a|b|c', 'Мій кухоль', 'x'.repeat(200)]) {
      const r = await create({ name });
      expect(r.preset.id, name).toMatch(ID_PATTERN);
      expect(r.preset.id, name).not.toContain('|');
    }
  });

  it('AC-11 / guard S8: every generated id differs from every registry preset id (so a user id can never equal white-bg and trigger the white-background flow)', async () => {
    const registryIds = PROMPT_PRESETS.map((p) => p.id);
    expect(registryIds.length).toBeGreaterThan(0);
    const r = await create();
    expect(registryIds).not.toContain(r.preset.id);
    for (const id of registryIds) expect(id.startsWith('user-'), `registry id ${id}`).toBe(false);
  });

  it('FR-15 (a): two presets created at the SAME instant get different ids (a counter suffix on collision) and both still match the pattern', async () => {
    const first = await create({ name: 'one' });
    const second = await create({ name: 'two' }, [first.preset]);
    const third = await create({ name: 'three' }, [first.preset, second.preset]);
    expect(new Set([first.preset.id, second.preset.id, third.preset.id]).size).toBe(3);
    for (const r of [first, second, third]) expect(r.preset.id).toMatch(ID_PATTERN);
  });

  it('NFR-5: the id depends on the injected instant, not on the host clock - a different instant gives a different id', async () => {
    const early = await create({}, [], NOW);
    const late = await create({}, [], NOW + 86_400_000);
    expect(early.preset.id).not.toBe(late.preset.id);
    expect((await create({}, [], NOW)).preset.id).toBe(early.preset.id);
  });
});

describe('createUserPreset: refusals (T16, FR-15 (c))', () => {
  it('FR-15 (c): an empty or whitespace-only name is not saved and carries a reason', async () => {
    for (const name of ['', ' ', '   ', '\t', '\n  \t']) {
      const r = await create({ name });
      expect(r.ok, JSON.stringify(name)).toBe(false);
      expect(typeof r.reason).toBe('string');
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });

  it('FR-15 (c): a name equal to an existing user preset is not saved silently over it', async () => {
    const existing = (await create({ name: 'Studio light' })).preset;
    const r = await create({ name: 'Studio light' }, [existing]);
    expect(r.ok).toBe(false);
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it('FR-15 (c): a name equal to a registry preset name (in either language) is not saved', async () => {
    const registry = PROMPT_PRESETS[0];
    for (const name of [registry.name.en, registry.name.uk]) {
      const r = await create({ name });
      expect(r.ok, name).toBe(false);
    }
  });

  it('a refusal returns no preset and the existing list is untouched', async () => {
    const existing = [(await create({ name: 'keep me' })).preset];
    const before = structuredClone(existing);
    const r = await create({ name: '  ' }, existing);
    expect(r.ok).toBe(false);
    expect('preset' in r).toBe(false);
    expect(existing).toEqual(before);
  });
});

describe('parseStoredPresets: data that does not parse is ignored, not partly applied (T16, FR-15 (d))', () => {
  it('a well-formed list round-trips unchanged and in order', async () => {
    const { parseStoredPresets } = await mod();
    const a = (await create({ name: 'A' })).preset;
    const b = (await create({ name: 'B' }, [a])).preset;
    const parsed = parseStoredPresets(JSON.parse(JSON.stringify([a, b])));
    expect(parsed).toEqual({ ok: true, presets: [a, b] });
  });

  it('an empty list is valid (nothing saved yet)', async () => {
    const { parseStoredPresets } = await mod();
    expect(parseStoredPresets([])).toEqual({ ok: true, presets: [] });
  });

  it('anything that is not an array is { ok: false }', async () => {
    const { parseStoredPresets } = await mod();
    for (const bad of [null, undefined, 'presets', 7, true, {}, { presets: [] }]) {
      expect(parseStoredPresets(bad), JSON.stringify(bad)).toEqual({ ok: false });
    }
  });

  it('one malformed entry makes the WHOLE value unusable - the good entries are not partly applied', async () => {
    const { parseStoredPresets } = await mod();
    const good = (await create({ name: 'good' })).preset;
    for (const broken of [{ id: 'user-x' }, null, 'x', { ...good, id: 5 }, { ...good, name: undefined }, { ...good, prompt: 3 }, { ...good, model: null }]) {
      expect(parseStoredPresets([good, broken]), JSON.stringify(broken)).toEqual({ ok: false });
    }
  });

  it('an entry whose id would break the taskLabel (a pipe) or the id pattern is not accepted', async () => {
    const { parseStoredPresets } = await mod();
    const good = (await create({ name: 'good' })).preset;
    expect(parseStoredPresets([{ ...good, id: 'user-a|b' }])).toEqual({ ok: false });
    expect(parseStoredPresets([{ ...good, id: 'Not A Valid Id' }])).toEqual({ ok: false });
  });

  it('parsing does not mutate its input', async () => {
    const { parseStoredPresets } = await mod();
    const raw = [(await create({ name: 'good' })).preset];
    const before = structuredClone(raw);
    parseStoredPresets(raw);
    expect(raw).toEqual(before);
  });
});

describe('deleteUserPreset and the registry (T16, FR-16, FR-17, AC-10a, AC-11)', () => {
  it('AC-10a: deleting removes exactly that preset and keeps the others in order; an unknown id changes nothing', async () => {
    const { deleteUserPreset } = await mod();
    const a = (await create({ name: 'A' })).preset;
    const b = (await create({ name: 'B' }, [a])).preset;
    const c = (await create({ name: 'C' }, [a, b])).preset;
    expect(deleteUserPreset([a, b, c], b.id)).toEqual([a, c]);
    expect(deleteUserPreset([a, b, c], 'user-nothing')).toEqual([a, b, c]);
    expect(deleteUserPreset([], b.id)).toEqual([]);
  });

  it('deleting does not mutate the input list', async () => {
    const { deleteUserPreset } = await mod();
    const a = (await create({ name: 'A' })).preset;
    const list = [a];
    deleteUserPreset(list, a.id);
    expect(list).toEqual([a]);
  });

  it('AC-11 / FR-17: PROMPT_PRESETS is not mutated by creating, parsing or deleting user presets - same ids, order, names, texts and defaults', async () => {
    const { deleteUserPreset, parseStoredPresets } = await mod();
    const before = structuredClone(PROMPT_PRESETS);
    const a = (await create({ name: 'A' })).preset;
    parseStoredPresets([a]);
    deleteUserPreset([a], a.id);
    await create({ name: PROMPT_PRESETS[0].name.en });
    expect(PROMPT_PRESETS).toEqual(before);
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T17 - the preset caps and the stale-value check (FR-15 (c), (e); owner rulings SM-6: name max 60 characters, count max 30; SM-5 i: apply
// with the model's default resolution, falling back to the default model).
//
// PINNED CONTRACT (src/utils/image-studio/user-presets.ts, additions):
//   USER_PRESET_NAME_MAX = 60       USER_PRESET_MAX_COUNT = 30       exported constants
//   createUserPreset refuses a name longer than USER_PRESET_NAME_MAX characters and refuses to create when `existing` already holds
//     USER_PRESET_MAX_COUNT presets - each with { ok: false, reason } and nothing saved.
//   checkUserPresetForApply(preset, catalogue) -> { ok: true } | { fallback: { model, resolution } }       (the { refused } branch is not built, SM-5 i)
//     catalogue = the image models of model-catalog.json ({ id, resolutions }[]); a preset whose model is in the catalogue and whose resolution that model
//     offers is { ok: true }; a preset whose resolution the model does not offer falls back to the SAME model's default resolution (the first of its
//     resolutions); a preset whose model is gone falls back to the default model (gemini-3.1-flash-image) with its default resolution.
// ---------------------------------------------------------------------------------------------------------------------
describe('US-10.6 T17: the caps (SM-6) and the stale-value fallback (SM-5 i)', () => {
  const CATALOGUE = [
    { id: 'gemini-3.1-flash-image', resolutions: ['1K', '2K'] },
    { id: 'gemini-3-pro-image', resolutions: ['1K', '2K', '4K'] },
  ];
  const preset = (over: Record<string, unknown> = {}) => ({ id: 'user-abc', name: 'Mine', prompt: 'p', aspectRatio: '1:1', resolution: '2K', model: 'gemini-3-pro-image', ...over });

  it('SM-6: the cap constants are exported with the owner\'s values - name 60, count 30', async () => {
    const m = await mod();
    expect(m.USER_PRESET_NAME_MAX).toBe(60);
    expect(m.USER_PRESET_MAX_COUNT).toBe(30);
  });

  it('SM-6: a name of exactly 60 characters is saved (Latin and Cyrillic) and a name of 61 is refused with a reason', async () => {
    for (const ch of ['a', 'ж']) {
      const ok = await create({ name: ch.repeat(60) });
      expect(ok.ok, `60 x ${ch}`).toBe(true);
      expect(ok.preset.name).toBe(ch.repeat(60));
      const tooLong = await create({ name: ch.repeat(61) });
      expect(tooLong.ok, `61 x ${ch}`).toBe(false);
      expect(tooLong.reason.length).toBeGreaterThan(0);
    }
  });

  it('SM-6: with 29 presets one more is saved; with 30 the next is refused with a reason and the list is untouched', async () => {
    const existing: any[] = [];
    for (let i = 0; i < 29; i++) existing.push((await create({ name: `preset ${i}` }, existing, NOW + i)).preset);
    expect(existing).toHaveLength(29);
    const thirtieth = await create({ name: 'preset 29' }, existing, NOW + 29);
    expect(thirtieth.ok).toBe(true);
    const full = [...existing, thirtieth.preset];
    const before = structuredClone(full);
    const refused = await create({ name: 'one too many' }, full, NOW + 30);
    expect(refused.ok).toBe(false);
    expect(refused.reason.length).toBeGreaterThan(0);
    expect(full).toEqual(before);
  });

  it('SM-5 i: a preset whose model offers its resolution is applied as saved', async () => {
    const { checkUserPresetForApply } = await mod();
    expect(checkUserPresetForApply(preset(), CATALOGUE)).toEqual({ ok: true });
    expect(checkUserPresetForApply(preset({ model: 'gemini-3.1-flash-image', resolution: '1K' }), CATALOGUE)).toEqual({ ok: true });
  });

  it('SM-5 i: a preset whose resolution the model does not offer (4K with Flash) is applied with the SAME model\'s default resolution, not refused', async () => {
    const { checkUserPresetForApply } = await mod();
    const result = checkUserPresetForApply(preset({ model: 'gemini-3.1-flash-image', resolution: '4K' }), CATALOGUE);
    expect(result).toEqual({ fallback: { model: 'gemini-3.1-flash-image', resolution: '1K' } });
    expect('refused' in result).toBe(false);
  });

  it('SM-5 i: a preset whose model is no longer in the catalogue falls back to the default model with that model\'s default resolution', async () => {
    const { checkUserPresetForApply } = await mod();
    const result = checkUserPresetForApply(preset({ model: 'gemini-2-retired-image', resolution: '2K' }), CATALOGUE);
    expect(result).toEqual({ fallback: { model: 'gemini-3.1-flash-image', resolution: '1K' } });
  });

  it('the check does not mutate the preset or the catalogue', async () => {
    const { checkUserPresetForApply } = await mod();
    const p = preset({ model: 'gemini-3.1-flash-image', resolution: '4K' });
    const before = [structuredClone(p), structuredClone(CATALOGUE)];
    checkUserPresetForApply(p, CATALOGUE);
    expect([p, CATALOGUE]).toEqual(before);
  });
});
