/**
 * render-consumables.ts
 *
 * Pure, deterministic ConsumablesDescriptionDoc → HTML. Same contract as its sibling
 * render-description.ts: zero runtime dependencies, zero DOM APIs, cannot fail — every structural
 * invariant CONSUMABLES_SIMPLIFIED_SCHEMA (§C1–§C6) describes is guaranteed by construction here.
 *
 * Reuses esc()/prose()/renderFigure() from render-description.ts rather than re-deriving them: all
 * are pure functions with no dependencies of their own, and re-deriving the exact same
 * escape/re-admit-<b>/<strong> logic (or the figure src-building / lazy-loading rule) a second time
 * is how the schema's original allow-list bug happened once already (see description-doc.ts's
 * Prose doc comment).
 *
 * Output verified byte-for-byte against the one real accepted §C artifact in the repo —
 * test/fixtures/consumables/3ddevice-formlabs-fuse1-uptime-kit.uk-UA.html — via
 * test/render-reconciliation-consumables.spec.ts.
 */
import type { BulletItem, ConsumablesDescriptionDoc, ConsumablesFigure, SpecGroup } from '../domain/consumables-doc';
import { esc, prose, renderFigure } from './render-description';
import type { RenderContext } from './render-description';

export type { RenderContext };

/**
 * §C2/§C3/§C5 share one shape: `<h2>` heading, then `<ul>` of `<li><b>{lead}</b>{text}</li>`. NO
 * whitespace of this function's own between `<b>{lead}</b>` and `{text}` — same rule and same
 * corpus evidence as render-description.ts's renderBullets: whitespace there is authored content.
 */
function bulletGroup(heading: string, items: BulletItem[]): string {
  const lis = items.map(i => `<li><b>${esc(i.lead)}</b>${prose(i.text)}</li>`).join('\n');
  return `<h2>${esc(heading)}</h2>\n<ul>\n${lis}\n</ul>`;
}

/**
 * §C4 — `<h2>` heading, then a bare label→value table. NO `<thead>`, NO `<h3>` — both explicitly
 * FORBIDDEN by CONSUMABLES_SIMPLIFIED_SCHEMA, unlike §7's renderSpecs in render-description.ts.
 */
function specGroup(g: SpecGroup): string {
  const rows = g.rows.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('\n');
  return (
    `<h2>${esc(g.heading)}</h2>\n` +
    `<div class="table-responsive"><table><tbody>\n${rows}\n</tbody></table></div>`
  );
}

/**
 * §C-figures — a `<p>` lead-in + `<figure>` pair per manifest entry, in manifest order. Unlike
 * ProductDescriptionDoc, there is no document-order figure-ref walk here: §C figures always render
 * as one contiguous block (see renderConsumablesDoc), so array index IS document position, and the
 * first-eager/rest-lazy rule in the shared renderFigure() applies directly off it.
 */
function renderFigures(figures: ConsumablesFigure[], ctx: RenderContext): string {
  return figures
    .map((f, i) => `<p>${prose(f.leadIn)}</p>\n${renderFigure(f, i, ctx)}`)
    .join('\n\n');
}

/**
 * Renders the full consumables description body.
 *
 * SECTION MODEL, from the one real accepted §C artifact: §C1 hook (no heading) → figures (0+,
 * added 2026-08-25, absent from that one fixture) → §C2 features → §C3 applications → zero or more
 * §C4 spec groups, in document order → §C5 storage → §C6 closing `<hr>` + plain `<p>` (single `\n`,
 * not a blank line, between them — verified against the fixture). No `<section>` wrapper anywhere,
 * unlike render-description.ts's one `<section class="specs">` — §C forbids it outright.
 *
 * Figures render right after the hook, mirroring where ProductDescriptionDoc's first figure
 * typically lands (LCP-friendly) — see consumables-doc.ts's doc comment on `figures` for why.
 */
export function renderConsumablesDoc(doc: ConsumablesDescriptionDoc, ctx: RenderContext): string {
  const parts: string[] = [
    `<p>${prose(doc.hook)}</p>`,
    ...(doc.figures.length ? [renderFigures(doc.figures, ctx)] : []),
    bulletGroup(doc.features.heading, doc.features.items),
    bulletGroup(doc.applications.heading, doc.applications.items),
    ...doc.specGroups.map(specGroup),
    bulletGroup(doc.storage.heading, doc.storage.items),
    `<hr>\n<p>${prose(doc.cta)}</p>`,
  ];

  return parts.join('\n\n');
}
