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
import {
  getStore,
  getKillerSpecsHeaders,
  isCenter3dPrintStore,
  resolveV4SectionHeadings,
} from './constants';
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
   * The §9 commercial-closing `<h2>` for a locale, with the product and the store substituted in.
   *
   * v4 fixes this heading in code (FR-11, D6) for the reason `DELIVERY_REGION_PHRASES` is already
   * code-resident: left to the model, a fixed commercial string comes back worded differently on
   * every run. The renderer assembles §9's heading from this rather than from `doc.cta.heading`,
   * which is discarded on the `'4.0'` path.
   *
   * Store-specific Tone of Voice overrides are honoured HERE rather than at the renderer's call
   * site — that is what this module is for.
   */
  ctaHeading(locale: string, productShortName: string): string;
}

/**
 * Center 3D Print's uk-UA ToV REPLACES the master CTA template with the soft «варто» form, quoted
 * verbatim in `C3D_UK_LOCALE_TOV` (`constants.ts:1596-1598`):
 *
 *   «Чому варто купити [Product-short] у Center 3D Print?»
 *
 * Its only divergence from the table's uk-UA template is the preposition before the store name —
 * «у» rather than «в», Ukrainian euphony before the consonant cluster that "Center" opens with.
 *
 * Written as a TRANSFORMATION OF the table entry rather than as a second copy of the sentence, so
 * that a future rewording of the template carries here automatically instead of leaving this store
 * silently pinned to the old wording. That is this module's standing rule (see the header): a
 * derived view, never a copy.
 */
function applyStoreToneOverride(template: string, storeName: string, locale: string): string {
  if (isCenter3dPrintStore(storeName) && locale.toLowerCase() === 'uk-ua') {
    return template.replace(' в [Store]', ' у [Store]');
  }
  return template;
}

/** The rule set for one store. Unknown names fall back to getStore()'s default profile. */
export function getRenderRules(storeName: string): StoreRenderRules {
  const store = getStore(storeName);
  return {
    storeName,
    imageBaseUrl: store.imageBaseUrl,
    locales: store.languages,
    killerSpecsHeaders: locale => getKillerSpecsHeaders(locale, storeName),
    ctaHeading: (locale, productShortName) => {
      const headings = resolveV4SectionHeadings(locale);
      if (!headings) {
        // THROWS RATHER THAN FALLING BACK, on the same reasoning as renderContextFor's empty-base
        // refusal below. Every locale any registry store publishes has a table entry by
        // construction, so reaching this means a store gained a language without a translation.
        // The alternatives are both worse in production: an empty string ships a bare <h2>, and a
        // silent English fallback ships the wrong language under a localized document.
        throw new Error(
          `${storeName}/${locale}: no V4_SECTION_HEADINGS entry, so §9's CTA heading cannot be ` +
            `assembled. Add the locale to V4_SECTION_HEADINGS_SOURCE in constants.ts.`,
        );
      }
      return applyStoreToneOverride(headings.ctaTemplate, storeName, locale)
        .replace('[Product-short]', productShortName)
        .replace('[Store]', storeName);
    },
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
