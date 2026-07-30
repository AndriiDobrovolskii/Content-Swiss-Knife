/**
 * store-render-rules.ts
 *
 * One place that answers "what does rendering for store X mean".
 *
 * Before this module existed, that answer was assembled at each call site out of four scattered
 * pieces — `STORE_REGISTRY` for the image base and languages, `isCenter3dPrintStore` for the Style B
 * divergences, `getKillerSpecsHeaders` for the §2a header pair, and the renderer's own English
 * fallback. Nothing stated the whole rule set, so covering a new store meant rediscovering which
 * places had to be touched.
 *
 * A DERIVED VIEW, NEVER A COPY. Every field below delegates to the existing source of truth rather
 * than restating it. CLAUDE.md makes `STORE_REGISTRY` authoritative for group, currency, languages
 * and image base URL — a second copy here would rot silently and ship a broken `<img src>` before
 * anyone noticed. `store-render-rules.spec.ts` asserts the delegation for every registry entry, so
 * the two cannot drift.
 *
 * Scope is deliberately the RENDERER's rules. The prompt-side Tone of Voice overlays
 * (`C3D_TOV_BASE_OVERLAY`, `EXPERT3D_*`) stay in constants.ts: they are prompt text consumed by
 * frozen files, and relocating them would force a frozen-file edit for no gain.
 */
import { getStore, getKillerSpecsHeaders, isCenter3dPrintStore } from './constants';
// Type-only, so this does NOT create a runtime import cycle with render-description.ts (which
// imports this module for real). TypeScript erases the import entirely.
import type { RenderContext } from '../render/render-description';

export interface StoreRenderRules {
  /** The STORE_REGISTRY key, which is also what getKillerSpecsHeaders expects. */
  storeName: string;
  /** From STORE_REGISTRY. May be empty — see renderContextFor, which refuses that case. */
  imageBaseUrl: string;
  /** The locales this store publishes, straight from STORE_REGISTRY.languages. */
  locales: string[];
  /**
   * The §2a two-column header pair, honouring the Center 3D Print ToV override.
   *
   * Returns `undefined` for a locale no map covers, and that is load-bearing rather than an
   * oversight: table-finalize.ts depends on it to trigger the Optimizer fallback, which reuses the
   * header text the model already wrote for that document. Do not add a default here.
   */
  killerSpecsHeaders(locale: string): [param: string, benefit: string] | undefined;
  /**
   * Whether §5b operating tips can appear — Center 3D Print's Style B block.
   *
   * Name-based via isCenter3dPrintStore, not group-based: Drukarka 3D shares group 'EU' and keeps
   * the default voice, so a group check would leak Style B onto it.
   */
  admitsOperatingTips: boolean;
}

/** The rule set for one store. Unknown names fall back to getStore()'s default profile. */
export function getRenderRules(storeName: string): StoreRenderRules {
  const store = getStore(storeName);
  return {
    storeName,
    imageBaseUrl: store.imageBaseUrl,
    locales: store.languages,
    killerSpecsHeaders: locale => getKillerSpecsHeaders(locale, storeName),
    admitsOperatingTips: isCenter3dPrintStore(storeName),
  };
}

/**
 * Builds a RenderContext for a store, so callers never hand-assemble one from the registry.
 *
 * REFUSES AN EMPTY IMAGE BASE. `figureSrc()` concatenates
 * `${imageBaseUrl}${brand}/${model}/${file}`, so an empty base yields a RELATIVE `<img src>` that
 * breaks on any CMS page not served from the site root. `Expert-3DPrinter` ships
 * `imageBaseUrl: ''` today, which went unnoticed while only two stores were rendered. Throwing is
 * the honest behaviour until the real URL is known — images that 404 in production are far worse
 * than a failure here.
 */
export function renderContextFor(
  storeName: string,
  brandFolder?: string,
  modelFolder?: string,
): RenderContext {
  const rules = getRenderRules(storeName);
  if (!rules.imageBaseUrl) {
    throw new Error(
      `${storeName}: STORE_REGISTRY has an empty imageBaseUrl, so every <img src> would be a ` +
        `relative path. Fill in the store's image base URL before rendering for it.`,
    );
  }

  return {
    imageBaseUrl: rules.imageBaseUrl,
    ...(brandFolder ? { brandFolder } : {}),
    ...(modelFolder ? { modelFolder } : {}),
    storeName,
  };
}
