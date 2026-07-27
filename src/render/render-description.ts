/**
 * render-description.ts
 *
 * Pure, deterministic ProductDescriptionDoc → HTML. Zero runtime dependencies, zero DOM APIs —
 * runs identically in the browser and under plain Node, which is what will let the BFF share it.
 *
 * This function CANNOT fail: every structural invariant the old HTML validators checked
 * (heading hierarchy, figcaption presence, table shape, section order, <hr> placement) is
 * guaranteed by construction here. If a rule can be violated by this renderer, the renderer is wrong.
 *
 * Output target is the POST-finalizeTablesForDisplay shape — the §2 table is already collapsed to
 * two columns and §7 is already one flat colspan table. Every literal below (styles, attribute
 * order, wrapper strings) is copied from the code that produces that shape today: table-finalize.ts,
 * image-figure.ts, and real generator output in src/utils/__fixtures__/.
 */
import type {
  Block,
  BulletItem,
  Figure,
  ProductDescriptionDoc,
  SpecCategory,
  Subsection,
} from '../domain/description-doc';
import { KILLER_SPECS_HEADERS, getKillerSpecsHeaders } from '../prompt-core/constants';

export interface RenderContext {
  /** From STORE_REGISTRY.imageBaseUrl. */
  imageBaseUrl: string;
  brandFolder?: string;
  modelFolder?: string;
  /**
   * Selects the Center 3D Print killer-specs header override. Must be the STORE_REGISTRY key, the
   * same value table-finalize.ts receives from the orchestrator — see getKillerSpecsHeaders.
   */
  storeName?: string;
}

/** [VERBATIM from table-finalize.ts] */
const CATEGORY_HEADER_STYLE = 'text-align: center; padding: 10px; font-weight: bold;';

/** [VERBATIM from image-figure.ts] */
const FIGURE_STYLE = 'display: block; width: fit-content; max-width: 100%; margin: 4px auto;';
const IMG_STYLE = 'max-width: 100%; height: auto; display: block;';
const FIGCAPTION_STYLE = 'text-align: left;';

/**
 * Full escape — for attribute values and non-prose text.
 *
 * `&` MUST be replaced first: doing it later would re-escape the ampersands introduced by the
 * other replacements and corrupt them. This ordering is the security property that lets prose()
 * safely re-admit a tag afterwards.
 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Escape, then re-admit the single permitted inline tag. The schema already rejected anything else,
 * so this is defence in depth rather than the only line.
 *
 * The re-admit pattern has no attribute slot, so `<b onclick="…">` can never come back to life —
 * only the exact literals `<b>` and `</b>` do. `'` is deliberately left unescaped: every attribute
 * this module emits is double-quoted.
 *
 * ACCEPTED EDGE CASE: because the two literals are re-admitted independently, input like
 * `<b onclick="x">y</b>` yields an escaped opening tag next to a live orphan `</b>`. That is
 * harmless — an unmatched closing tag is inert in every browser, and no attribute survives — and
 * the input is already rejected upstream by PROSE_FORBIDDEN. Balancing the tags here would add
 * parsing logic to a module whose whole value is that it has none.
 */
function prose(s: string): string {
  return esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
}

/**
 * [VERBATIM rule from task-a.ts buildImageBlock] — "Build src as {base}{brandFolder}/{modelFolder}/{filename}".
 * The separators are conditional there (`brandFolder ? brandFolder + '/' : ''`), so an absent
 * folder contributes nothing at all rather than a bare slash.
 */
function figureSrc(f: Figure, ctx: RenderContext): string {
  const brand = ctx.brandFolder ? ctx.brandFolder + '/' : '';
  const model = ctx.modelFolder ? ctx.modelFolder + '/' : '';
  return `${ctx.imageBaseUrl}${brand}${model}${f.file}`;
}

/**
 * Maps every figure ref to its position in DOCUMENT order.
 *
 * This is not the same as the ref itself. The schema guarantees each figure is referenced exactly
 * once, but not that refs ascend — figures[0] need not be the first image on the page. The
 * first-eager/rest-lazy rule is about what the browser paints first, so it has to key off document
 * position. Computing the map once up front keeps renderDescription pure: no counter is threaded
 * through the recursive section walk.
 */
function figurePositions(doc: ProductDescriptionDoc): Map<number, number> {
  const order: number[] = [];
  const walkBlocks = (blocks: Block[]): void => {
    for (const b of blocks) if (b.kind === 'figure') order.push(b.ref);
  };
  const walkSubsection = (s: Subsection): void => {
    walkBlocks(s.blocks);
    s.subsections?.forEach(walkSubsection);
  };

  walkBlocks(doc.keyBenefits);
  doc.functionality.forEach(walkSubsection);
  if (doc.compatibility) walkSubsection(doc.compatibility);

  return new Map(order.map((ref, position) => [ref, position]));
}

/**
 * Attribute order is copied verbatim from real generator output: src, alt, [loading], decoding,
 * style. The first image in document order carries NO `loading` attribute at all (it is the LCP
 * image); every later one is lazy. See image-figure.ts and output-validator.ts's
 * `lcp-image-lazy` / `image-not-lazy` pair.
 */
function renderFigure(f: Figure, position: number, ctx: RenderContext): string {
  const lazy = position > 0 ? ' loading="lazy"' : '';
  return (
    `<figure style="${FIGURE_STYLE}">\n` +
    `<img src="${esc(figureSrc(f, ctx))}" alt="${esc(f.alt)}"${lazy} decoding="async" style="${IMG_STYLE}">\n` +
    `<figcaption style="${FIGCAPTION_STYLE}">${prose(f.caption)}</figcaption>\n` +
    `</figure>`
  );
}

/** `<li><b>{lead}</b> {text}</li>` — exactly one space, no punctuation added. */
function renderBullets(items: BulletItem[]): string {
  const lis = items.map(i => `<li><b>${esc(i.lead)}</b> ${prose(i.text)}</li>`).join('\n');
  return `<ul>\n${lis}\n</ul>`;
}

function renderBlock(b: Block, doc: ProductDescriptionDoc, positions: Map<number, number>, ctx: RenderContext): string {
  switch (b.kind) {
    case 'paragraph':
      return `<p>${prose(b.text)}</p>`;
    case 'bullets':
      return renderBullets(b.items);
    case 'figure':
      return renderFigure(doc.figures[b.ref], positions.get(b.ref) ?? 0, ctx);
  }
}

/**
 * One <section> per top-level Subsection, matching production: <h2> for the section itself, <h3>
 * for each nested subsection. Depth beyond 2 is unreachable — the schema has no shape for it.
 */
function renderSubsection(
  s: Subsection,
  doc: ProductDescriptionDoc,
  positions: Map<number, number>,
  ctx: RenderContext,
): string {
  const parts = [`<h2>${esc(s.heading)}</h2>`, ...s.blocks.map(b => renderBlock(b, doc, positions, ctx))];
  for (const sub of s.subsections ?? []) {
    // Blank line before each <h3> — mirrors the spacing in real generator output.
    parts.push('', `<h3>${esc(sub.heading)}</h3>`, ...sub.blocks.map(b => renderBlock(b, doc, positions, ctx)));
  }
  return `<section>\n${parts.join('\n')}\n</section>`;
}

/**
 * §2a — the 2-column collapsed form. [VERBATIM from table-finalize.ts]: the first cell is
 * `${label}: ${value}` and the header pair comes from getKillerSpecsHeaders, which layers the
 * Center 3D Print override on top of KILLER_SPECS_HEADERS.
 */
function renderKillerSpecs(doc: ProductDescriptionDoc, ctx: RenderContext): string {
  const [paramHeader, benefitHeader] =
    getKillerSpecsHeaders(doc.locale, ctx.storeName ?? '') ?? KILLER_SPECS_HEADERS['en-gb'];
  const rows = doc.killerSpecs
    .map(s => `<tr><td>${esc(s.label)}: ${esc(s.value)}</td><td>${prose(s.why)}</td></tr>`)
    .join('\n');
  return (
    `<div class="table-responsive"><table>\n` +
    `<thead><tr><th>${esc(paramHeader)}</th><th>${esc(benefitHeader)}</th></tr></thead>\n` +
    `<tbody>\n${rows}\n</tbody>\n` +
    `</table></div>`
  );
}

/**
 * §7 — the flattened colspan table. [VERBATIM shape from table-finalize.ts
 * flattenSpecCategoriesToColspanTable]: category <th colspan="2"> rows interleaved with plain data
 * rows, no <thead> anywhere — that function copies only `tbody tr`, so the per-category
 * Parameter/Value header rows do not survive into the displayed artifact.
 */
function renderSpecs(heading: string, categories: SpecCategory[]): string {
  const rowsHtml: string[] = [];
  for (const c of categories) {
    rowsHtml.push(`<tr><th colspan="2" style="${CATEGORY_HEADER_STYLE}">${esc(c.title)}</th></tr>`);
    for (const r of c.rows) {
      rowsHtml.push(`<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`);
    }
  }
  return (
    `<section class="specs">\n<h2>${esc(heading)}</h2>\n` +
    `<div class="table-responsive"><table>\n${rowsHtml.join('\n')}\n</table></div>\n` +
    `</section>`
  );
}

/**
 * Renders the full description body.
 *
 * Layout contract, all locked by tests:
 *   - §1 hook and §2 (table + key benefits) are BARE — no <section>, no <h2>. See task-a.ts's
 *     "CRITICAL: §2 … has NO H2 heading and NO <section> wrapper".
 *   - Everything from §3 on is one <section> per <h2>, in [OUTPUT CONTRACT] order:
 *     §3 → §4 → §5? → §6? → §7 → §9.
 *   - <hr> BETWEEN sections, never after the last one. Real output carries N-1 rules for
 *     N sections; §9 closes the document.
 */
export function renderDescription(doc: ProductDescriptionDoc, ctx: RenderContext): string {
  const positions = figurePositions(doc);
  const block = (b: Block) => renderBlock(b, doc, positions, ctx);

  const preamble = [
    `<p>${prose(doc.hook)}</p>`,
    renderKillerSpecs(doc, ctx),
    ...doc.keyBenefits.map(block),
  ].join('\n\n');

  const sections: string[] = doc.functionality.map(s => renderSubsection(s, doc, positions, ctx));

  // §4 Applications — same <li><b>lead</b> text</li> shape as key benefits; the model supplies its
  // own punctuation after the scenario label.
  const applicationItems = doc.applications.items
    .map(i => `<li><b>${esc(i.scenario)}</b> ${prose(i.text)}</li>`)
    .join('\n');
  sections.push(
    `<section>\n<h2>${esc(doc.applications.heading)}</h2>\n<ul>\n${applicationItems}\n</ul>\n</section>`,
  );

  if (doc.compatibility) {
    sections.push(renderSubsection(doc.compatibility, doc, positions, ctx));
  }

  if (doc.packageContents) {
    const items = doc.packageContents.items.map(i => `<li>${esc(i)}</li>`).join('\n');
    sections.push(
      `<section>\n<h2>${esc(doc.packageContents.heading)}</h2>\n<ul>\n${items}\n</ul>\n</section>`,
    );
  }

  sections.push(renderSpecs(doc.specs.heading, doc.specs.categories));

  sections.push(
    `<section>\n<h2>${esc(doc.cta.heading)}</h2>\n<p class="cta">${prose(doc.cta.text)}</p>\n</section>`,
  );

  return `${preamble}\n\n${sections.join('\n<hr>\n\n')}`;
}
