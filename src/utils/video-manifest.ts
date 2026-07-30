/**
 * video-manifest.ts
 *
 * Makes a source video embed impossible to lose.
 *
 * THE BUG THIS EXISTS FOR: a YouTube <iframe> in the input description survived generation when
 * no images were uploaded, and vanished when they were. Confirmed on EXPERT3D XGRIDS L2 Pro
 * (2026-07-29): 7 image figures shipped, 0 iframes, and the repair report recorded 0 regenerations
 * — the embed was never generated, not removed later.
 *
 * WHY IT HAPPENED: video was the only media type in the pipeline with no manifest, no count and
 * no validator. Images get a COUNT=N HARD RULE block that dominates the tail of the user turn and
 * whose placement rules claim §2–§5; the master prompt's [VIDEO] rule was five lines that pointed
 * at a section ("Deep Dive") which does not exist in Schema v3.0. Under the 28,000-char cap the
 * model is told to compress, and the one element with no slot, no count and no tier is what goes.
 *
 * THE TWO LAYERS:
 *   1. prompt   — buildVideoBlock in task-a.ts gives video the same COUNT=N treatment as images.
 *   2. this file — deterministic restoration, so the outcome does not depend on the model
 *      complying. Costs no extra LLM call and turns validateVideoCoverage into a net that should
 *      never fire rather than a regeneration trigger.
 *
 * Pure functions, no LLM.
 */

import { isVideoSrc } from './video-figure';
import { ValidationIssue } from './output-validator';

/** A video embed found in the SOURCE description — what the output is obliged to contain. */
export interface SourceVideoEmbed {
  /** The embed URL exactly as the source wrote it. Never normalized here: wrapVideoFigures owns
   *  rel=0 and the attribute set, and doing it in two places is how they drift. */
  src: string;
  /** The source iframe's title, when it had one. */
  title?: string;
  /** Identity for comparison — see videoKey. */
  key: string;
}

/** Deliberately NOT `VideoEmbed`: src/domain/description-doc.ts already exports that name for a
 *  different shape ({ src, title, caption }). Two same-named types in one codebase is a trap. */

const YOUTUBE_ID = /(?:\/embed\/|\/v\/|youtu\.be\/|[?&]v=)([\w-]{6,})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

/**
 * Stable identity for an embed: the video ID, not the URL.
 *
 * "…/embed/Bw2xL_gL7zc" and "…/embed/Bw2xL_gL7zc?rel=0" are the same video, and the second is
 * what the pipeline produces from the first (ensureRel0). Comparing URLs would make every
 * restored embed look missing on the next pass and splice a duplicate.
 *
 * Falls back to the origin+path of the URL, so an unrecognised host still compares sanely instead
 * of collapsing every such embed onto one key.
 */
export function videoKey(src: string): string {
  const youtube = YOUTUBE_ID.exec(src);
  if (youtube) return `youtube:${youtube[1]}`;
  const vimeo = VIMEO_ID.exec(src);
  if (vimeo) return `vimeo:${vimeo[1]}`;
  return `raw:${src.split('?')[0].replace(/\/+$/, '').toLowerCase()}`;
}

/** Every video embed key present in `html`. */
function keysIn(html: string): Set<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const keys = new Set<string>();
  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (isVideoSrc(src)) keys.add(videoKey(src));
  });
  return keys;
}

/**
 * Video embeds in the raw source description, in document order, deduplicated by video ID.
 *
 * Parsed as HTML even though the description is usually Markdown-ish prose: an <iframe> pasted
 * into that prose is still an element, and DOMParser finds it without disturbing the text.
 */
export function extractVideoEmbeds(description: string): SourceVideoEmbed[] {
  if (!description?.trim()) return [];
  const doc = new DOMParser().parseFromString(description, 'text/html');
  const seen = new Set<string>();
  const embeds: SourceVideoEmbed[] = [];
  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (!isVideoSrc(src)) return;
    const key = videoKey(src);
    if (seen.has(key)) return;
    seen.add(key);
    const title = iframe.getAttribute('title')?.trim();
    embeds.push({ src, title: title || undefined, key });
  });
  return embeds;
}

/**
 * Lead-in sentence placed above a restored embed, by BCP47 primary subtag.
 *
 * Every <figure> needs a narrative <p> above it (CLAUDE.md acceptance criteria), and it must not
 * restate the figcaption — so these describe watching the video, while the figcaption names it.
 */
const LEAD_IN_TEMPLATES: Readonly<Record<string, (product: string) => string>> = {
  en: p => `See ${p} in action in the video below.`,
  uk: p => `Як ${p} працює на практиці — дивіться у відео нижче.`,
  ru: p => `Как ${p} работает на практике — смотрите в видео ниже.`,
  pl: p => `Zobacz na filmie poniżej, jak ${p} działa w praktyce.`,
  de: p => `Wie ${p} in der Praxis arbeitet, zeigt das Video unten.`,
  es: p => `Vea cómo funciona ${p} en la práctica en el vídeo siguiente.`,
  pt: p => `Veja como ${p} funciona na prática no vídeo abaixo.`,
};

function leadInText(productName: string, locale?: string): string {
  const lang = (locale ?? '').toLowerCase().split('-')[0];
  return (LEAD_IN_TEMPLATES[lang] ?? LEAD_IN_TEMPLATES['en'])(productName);
}

/**
 * Where a restored embed goes.
 *
 * Verified against a real accepted artifact: <section> is used sparsely in generated HTML and
 * `section.specs` (§7 Technical Specifications) is typically the only one present. Inserting
 * before it puts the video at the end of the narrative body — after §3–§5, and ahead of §7, which
 * the master prompt requires to stay media-free.
 *
 * Falls back to the section wrapping the LAST table (§2's Killer Specs table is the first, so
 * "last" is required), then to the last table itself, and finally to appending at the end of the
 * body. Returns null for "append".
 */
function insertionAnchor(doc: Document): Element | null {
  const specs = doc.querySelector('section.specs');
  if (specs) return specs;

  const tables = doc.querySelectorAll('table');
  const lastTable = tables.length > 0 ? tables[tables.length - 1] : null;
  if (!lastTable) return null;
  return lastTable.closest('section') ?? lastTable;
}

/**
 * Splice back every embed in `embeds` whose video is absent from `html`.
 *
 * Inserts a bare <iframe> plus its lead-in <p>, NOT a finished <figure>: wrapVideoFigures runs
 * immediately after and owns the figure/figcaption/attribute contract, so a restored embed and a
 * model-emitted one go through exactly one code path. Duplicating that markup here is how the two
 * would eventually disagree.
 *
 * DOM-based throughout — string concatenation against model output is how a fixer produces
 * unbalanced tags.
 */
export function restoreMissingVideos(
  html: string,
  embeds: readonly SourceVideoEmbed[],
  productName: string,
  locale?: string,
): { html: string; restored: SourceVideoEmbed[] } {
  if (!embeds.length || !html) return { html, restored: [] };

  const present = keysIn(html);
  const missing = embeds.filter(e => !present.has(e.key));
  if (missing.length === 0) return { html, restored: [] };

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchor = insertionAnchor(doc);

  for (const embed of missing) {
    const lead = doc.createElement('p');
    lead.textContent = leadInText(productName, locale);

    const iframe = doc.createElement('iframe');
    iframe.setAttribute('src', embed.src);
    if (embed.title) iframe.setAttribute('title', embed.title);

    if (anchor?.parentNode) {
      anchor.parentNode.insertBefore(lead, anchor);
      anchor.parentNode.insertBefore(iframe, anchor);
    } else {
      doc.body.appendChild(lead);
      doc.body.appendChild(iframe);
    }
  }

  return { html: doc.body.innerHTML, restored: missing };
}

/**
 * Error-tier issue for every source embed still absent from the output.
 *
 * With restoreMissingVideos wired ahead of it this should never fire; that is the point. It is
 * the assertion that the deterministic layer did its job, not the mechanism that does it — so if
 * it ever does fire, restoration itself is broken and a regeneration is the right response.
 *
 * No `path`: the finding is about the document, not an addressable block, so it resolves to
 * ['full-regen'] per resolveLadder.
 */
export function validateVideoCoverage(
  html: string,
  embeds: readonly SourceVideoEmbed[],
  context: string,
): ValidationIssue[] {
  if (!embeds.length) return [];
  const present = keysIn(html);
  return embeds
    .filter(e => !present.has(e.key))
    .map(e => ({
      severity: 'error' as const,
      rule: 'video-embed-missing',
      detail:
        `The source description contains a video embed (${e.src}) that is missing from the output. `
        + 'Keep the iframe with its src copied VERBATIM, introduced by its own lead-in <p>, in '
        + '§3 FUNCTIONALITY — before §7 Technical Specifications.',
      context,
    }));
}
