import type { ResolvedKillerSpec } from './killer-spec-resolver';

/**
 * Reverse of render-description.ts's renderKillerSpecs() markers, for the ONE path that never has
 * a ProductDescriptionDoc: the standalone Slug-generator UI mode (generateSlugs() in
 * content-orchestrator.service.ts only ever receives a raw HTML/description string). The main
 * pipeline (generate()/generateUaContent()) uses resolveKillerSpecFromDoc() instead, reading the
 * Doc directly — this regex-based reader exists only because that Doc genuinely does not exist
 * here, not because it is preferred over reading the Doc.
 *
 * Reads the FIRST `data-spec-key`/`data-spec-value` pair inside `data-section="killer-specs"`,
 * matching resolveKillerSpecFromDoc's killerSpecs[0] pick. Legacy HTML pasted from a page rendered
 * before this feature existed has neither attribute — returns `null`, which is the accepted,
 * intentional outcome (no suffix), not a bug to route around with fuzzy text-parsing of the visible
 * "label: value" cell.
 */
export function extractKillerSpecFromHtml(html: string): ResolvedKillerSpec | null {
  const sectionMatch = /<[^>]*data-section="killer-specs"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!sectionMatch) return null;

  const rowMatch = /<tr[^>]*\bdata-spec-key="([^"]*)"[^>]*\bdata-spec-value="([^"]*)"/i.exec(sectionMatch[1]);
  if (!rowMatch) return null;

  const key = decodeHtmlEntities(rowMatch[1]).trim();
  const value = decodeHtmlEntities(rowMatch[2]).trim();
  if (!key || !value) return null;
  return { key, value };
}

/** The renderer's esc() only ever produces these four entities in an attribute value. */
function decodeHtmlEntities(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
