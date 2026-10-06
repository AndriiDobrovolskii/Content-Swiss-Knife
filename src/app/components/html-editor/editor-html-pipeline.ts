/**
 * editor-html-pipeline.ts  (US-6.1)
 *
 * Editor-local HTML pipeline: the iframe allow-list filter, the composed sanitizer used at
 * both component gates (load and Copy HTML / Source mode), and the Copy HTML fix-up chain.
 * All functions are pure and deterministic. `html-cleaner.ts` is intentionally not modified.
 */

import { stripTiptapArtifacts, sanitizeUntrustedHtml } from '../../../utils/html-cleaner';
import { wrapImageFigures } from '../../../utils/image-figure';
import { reconstructTableThead } from './extensions/table-thead';

// Security allow-list of embed hosts (not a locale or currency list, so STORE_REGISTRY does not apply).
const ALLOWED_EMBED_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'];

function isAllowedEmbedSrc(src: string | null): boolean {
  if (!src) return false;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname;
  return ALLOWED_EMBED_HOSTS.some(h => host === h || host.endsWith('.' + h));
}

/**
 * Removes every iframe that is not a direct child of a <figure> and whose src is not an
 * allowed http(s) YouTube/Vimeo URL. Only deletes; never rewrites a kept src.
 */
export function filterEmbedIframes(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('iframe').forEach(frame => {
    if (frame.parentElement?.tagName === 'FIGURE') return;
    if (!isAllowedEmbedSrc(frame.getAttribute('src'))) frame.remove();
  });
  return doc.body.innerHTML;
}

export function sanitizeEditorHtml(html: string): string {
  return filterEmbedIframes(sanitizeUntrustedHtml(html));
}

export function finalizeCopyHtml(rawHtml: string): string {
  const stripped = stripTiptapArtifacts(rawHtml);
  const tableFixed = reconstructTableThead(stripped);
  const figuresFixed = wrapImageFigures(tableFixed);
  return sanitizeEditorHtml(figuresFixed);
}
