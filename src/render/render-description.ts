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
import { forEachBlockInOrder } from '../domain/description-doc';
import type {
  Block,
  BulletItem,
  Figure,
  ProductDescriptionDoc,
  SpecCategory,
  Subsection,
  VideoEmbed,
} from '../domain/description-doc';
import { KILLER_SPECS_HEADERS, getKillerSpecsHeaders } from '../prompt-core/constants';
import { ensureRel0 } from '../utils/video-url';

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

/** [VERBATIM from video-figure.ts] — corroborated against a real artifact's <iframe> markup. */
const VIDEO_FIGURE_STYLE = 'width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;';
const IFRAME_STYLE = 'width: 100%; height: 100%; border: 0;';
const VIDEO_ALLOW_VALUE =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const VIDEO_REFERRERPOLICY_VALUE = 'strict-origin-when-cross-origin';
const VIDEO_FIGCAPTION_STYLE = 'text-align: center; font-size: 14px; color: #666; margin-top: 10px;';

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
 * Escape, then re-admit the two permitted inline tags. The schema already rejected anything else,
 * so this is defence in depth rather than the only line.
 *
 * `<strong>` is admitted alongside `<b>` because master-system-prompt.ts §[FORMAT] mandates both and
 * gives them different jobs. Widening the allow-list does NOT widen the security property: the
 * re-admit pattern still has no attribute slot, so `<b onclick="…">` and `<strong onclick="…">`
 * alike can never come back to life — only the exact literals `<b>`, `</b>`, `<strong>` and
 * `</strong>` do. `'` is deliberately left unescaped: every attribute this module emits is
 * double-quoted.
 *
 * ACCEPTED EDGE CASE: because the two literals are re-admitted independently, input like
 * `<b onclick="x">y</b>` yields an escaped opening tag next to a live orphan `</b>`. That is
 * harmless — an unmatched closing tag is inert in every browser, and no attribute survives — and
 * the input is already rejected upstream by PROSE_FORBIDDEN. Balancing the tags here would add
 * parsing logic to a module whose whole value is that it has none.
 */
function prose(s: string): string {
  return esc(s).replace(/&lt;(\/?)(b|strong)&gt;/g, '<$1$2>');
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
  // Shared traversal — see forEachBlockInOrder. Writing the section order out here a second time
  // is how §4 came to be missed, which put an applications figure in the LCP slot.
  forEachBlockInOrder(doc, b => {
    if (b.kind === 'figure') order.push(b.ref);
  });
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

/**
 * Video embed figure. Attribute order — src, style, title, loading, allow, referrerpolicy,
 * allowfullscreen — is taken verbatim from a real artifact, which in turn reflects the
 * setAttribute() order in wrapVideoFigures().
 *
 * Unlike images there is no first-eager rule: a video is never the LCP element, and every real
 * artifact carries loading="lazy" on it unconditionally.
 *
 * `allowfullscreen=""` is written as a fixed literal in the template. It must never be built from a
 * variable, or an undefined value degrades it to allowfullscreen="undefined".
 *
 * `src` is escaped AFTER ensureRel0(), which may append to a URL that already has a query string —
 * the resulting `&` has to serialize as `&amp;`. Production does the same thing via setAttribute +
 * innerHTML, so this matches rather than diverges.
 */
function renderVideo(v: VideoEmbed): string {
  return (
    `<figure style="${VIDEO_FIGURE_STYLE}">` +
    `<iframe src="${esc(ensureRel0(v.src))}" style="${IFRAME_STYLE}" title="${esc(v.title)}"` +
    ` loading="lazy" allow="${VIDEO_ALLOW_VALUE}"` +
    ` referrerpolicy="${VIDEO_REFERRERPOLICY_VALUE}" allowfullscreen=""></iframe>` +
    `<figcaption style="${VIDEO_FIGCAPTION_STYLE}">${prose(v.caption)}</figcaption>` +
    `</figure>`
  );
}

/**
 * `<li><b>{lead}</b>{text}</li>` — NO whitespace of the renderer's own between them.
 *
 * An earlier revision inserted a single space there. Two corpus artifacts show it cannot: Center
 * 3D Print writes `<b>Складається за лічені хвилини. </b>Тришарова…`, with the space INSIDE the
 * bold, while EXPERT3D writes `<b>Гравіювання деревини:</b> гравер…`, with it outside. One
 * injected space reproduces neither. Whitespace between the label and the sentence is authored
 * content — it belongs in `lead` or at the head of `text`, wherever the artifact puts it — and a
 * renderer that guesses is wrong for half its stores.
 */
function renderBullets(items: BulletItem[]): string {
  const lis = items.map(i => `<li><b>${esc(i.lead)}</b>${prose(i.text)}</li>`).join('\n');
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
    case 'video':
      return renderVideo(doc.videos[b.ref]);
  }
}

/**
 * A bare <h2> group: heading, then blocks, then any nested <h3> subsections. NO <section> wrapper —
 * see the section-model note on renderDescription(). Depth beyond 2 is unreachable, the schema has
 * no shape for it.
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
  return parts.join('\n');
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
      // A multi-valued parameter renders as a nested list inside the cell, exactly as EXPERT3D
      // ships it — no whitespace between the tags, since that is how the artifact reads and the
      // renderer has no reason to add any.
      const value = Array.isArray(r.value)
        ? `<ul>${r.value.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`
        : esc(r.value);
      rowsHtml.push(`<tr><td>${esc(r.label)}</td><td>${value}</td></tr>`);
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
 * SECTION MODEL — derived from real shipped artifacts, not from the prompt text.
 *
 * An earlier revision wrapped every <h2> group in its own <section> and put an <hr> between all of
 * them, following src/utils/__fixtures__/description_uk-UA.corrected.html. That fixture turned out
 * to encode a SUPERSEDED convention. Current production output (verified against the accepted
 * Center 3D Print / EXPERT3D Ortur H20 exports) contains:
 *
 *   - 9 <h2> but only ONE </section> — and that one is <section class="specs">;
 *   - exactly ONE <hr>, immediately after </section> of the specs block.
 *
 * So §3/§4/§5/§6/§9 are bare <h2> groups, and task-a.ts's "Add <hr> after each </section>" still
 * holds — there is simply one section to follow. Order is unchanged:
 * §1 → §2 → §3 → §4 → §5? → §6? → §7 → §9.
 */
export function renderDescription(doc: ProductDescriptionDoc, ctx: RenderContext): string {
  const positions = figurePositions(doc);
  const block = (b: Block) => renderBlock(b, doc, positions, ctx);

  const parts: string[] = [
    `<p>${prose(doc.hook)}</p>`,
    renderKillerSpecs(doc, ctx),
    ...doc.keyBenefits.map(block),
    ...doc.functionality.map(s => renderSubsection(s, doc, positions, ctx)),
  ];

  // §4 Applications — heading, then any lead-in blocks, then the item list. Real artifacts put a
  // paragraph and a figure between the <h2> and the <ul>; the list itself keeps the same
  // <li><b>lead</b> text</li> shape as key benefits, with the model supplying its own punctuation
  // after the scenario label.
  const applicationItems = doc.applications.items
    // Same rule as renderBullets: no injected whitespace — see its comment.
    .map(i => `<li><b>${esc(i.scenario)}</b>${prose(i.text)}</li>`)
    .join('\n');
  parts.push([
    `<h2>${esc(doc.applications.heading)}</h2>`,
    ...(doc.applications.blocks ?? []).map(block),
    `<ul>\n${applicationItems}\n</ul>`,
  ].join('\n'));

  if (doc.compatibility) {
    parts.push(renderSubsection(doc.compatibility, doc, positions, ctx));
  }

  if (doc.packageContents) {
    const items = doc.packageContents.items.map(i => `<li>${esc(i)}</li>`).join('\n');
    parts.push(`<h2>${esc(doc.packageContents.heading)}</h2>\n<ul>\n${items}\n</ul>`);
  }

  // §7 is the only <section>, and the only <hr> follows it.
  parts.push(`${renderSpecs(doc.specs.heading, doc.specs.categories)}\n<hr>`);

  parts.push(`<h2>${esc(doc.cta.heading)}</h2>\n<p class="cta">${prose(doc.cta.text)}</p>`);

  return parts.join('\n\n');
}
