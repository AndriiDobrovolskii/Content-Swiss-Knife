/**
 * scaffold-doc.mjs
 *
 * Turns an accepted artifact into a DRAFT ProductDescriptionDoc for the reconciliation corpus.
 *
 *   node test/tools/scaffold-doc.mjs <artifact.html> [locale] > <slug>.doc.json
 *
 * WHAT THIS TOOL IS FOR, AND WHAT IT DELIBERATELY REFUSES TO DO
 *
 * The corpus has to reach six artifacts. Hand-typing six 200-line Docs is hours of transcription
 * with a high chance of a typo that reads as a renderer bug. This tool removes the transcription.
 *
 * It does NOT remove the authoring. A scaffolder that derived the WHOLE Doc from the HTML would
 * make the reconciliation suite pass vacuously — it would prove this file and render-description.ts
 * are mutual inverses, not that the renderer reproduces production. See the header of
 * render-reconciliation.spec.ts: a green suite that proves nothing is the exact failure that
 * harness is built to avoid.
 *
 * So the split is:
 *
 *   MECHANICAL, derived here    — §7 spec categories/rows, the figures[] and videos[] manifests,
 *                                 §2a killer specs, the §1 hook, and the block interleaving INSIDE
 *                                 one <h2> group. High volume, no judgment, no place for a defect
 *                                 to hide.
 *   JUDGMENT, left as TODO      — localizedName, and above all WHICH <h2> group is §4 applications,
 *                                 §5 compatibility, §6 package contents, §9 CTA. That assignment is
 *                                 where the §4.3 class of error lives: C3D's operating-tips block
 *                                 was mapped onto `compatibility` because the model had no slot for
 *                                 it. A tool that guessed would have made that call silently and
 *                                 permanently. Every <h2> group therefore lands in `functionality`,
 *                                 and a human moves the ones that belong elsewhere.
 *
 * REFUSAL IS THE FEATURE. Anything the Doc model cannot express exactly throws, naming the
 * construct. That is not defensiveness — it is the discovery the corpus exists to generate. Four
 * renderer/model corrections came out of the first two artifacts precisely because a human hit a
 * shape the model had no room for. This tool must hit those shapes just as loudly.
 *
 * The output does not validate against ProductDescriptionDocSchema until the TODOs are resolved.
 * That is intentional: an unfinished draft must fail, never reconcile by accident.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';

/** Sentinel for every field a human still has to decide. Chosen to fail the schema, not satisfy it. */
export const TODO = 'TODO';

/** Prose fields admit `<b>` and nothing else — see the Prose type in description-doc.ts. */
const PROSE_ALLOWED_TAGS = new Set(['B']);

/**
 * Parses an artifact fragment into a container element.
 *
 * NOT `parseHTML(html).document.body`: linkedom leaves `document.body` empty for a fragment — its
 * `querySelector` finds the nodes but `body.children` is 0, so the top-level walk in scaffoldDoc()
 * would silently see an empty document and emit an empty Doc. Parsing into an explicit <div> gives
 * both working selectors and a real child list.
 */
function bodyOf(html) {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

/**
 * innerHTML of a node that is supposed to hold Prose, rejecting anything richer than `<b>`.
 * `where` names the field so the error says which part of which artifact the model cannot hold.
 */
function prose(node, where) {
  for (const el of node.querySelectorAll('*')) {
    if (!PROSE_ALLOWED_TAGS.has(el.tagName)) {
      throw new Error(
        `${where}: contains <${el.tagName.toLowerCase()}>, but a Prose field admits only <b>. ` +
          `The Doc model cannot represent this artifact as written — this is a finding, not a formatting nit.`,
      );
    }
  }
  return node.innerHTML.trim();
}

/** §7 — the flattened colspan table. Inverse of renderSpecs() in render-description.ts. */
export function parseSpecs(html) {
  const section = bodyOf(html).querySelector('section.specs');
  if (!section) {
    throw new Error('no <section class="specs"> found — §7 is mandatory in every artifact.');
  }

  const h2 = section.querySelector('h2');
  if (!h2) throw new Error('<section class="specs"> has no <h2> heading.');

  const categories = [];
  for (const tr of section.querySelectorAll('tr')) {
    const th = tr.querySelector('th[colspan="2"]') ?? tr.querySelector('th');
    if (th) {
      categories.push({ title: th.textContent.trim(), rows: [] });
      continue;
    }

    const tds = tr.querySelectorAll('td');
    if (tds.length !== 2) {
      throw new Error(
        `spec row has ${tds.length} cell(s), expected 2: "${tr.textContent.trim().slice(0, 80)}"`,
      );
    }
    if (categories.length === 0) {
      throw new Error(
        `spec row "${tds[0].textContent.trim()}" appears before any category header row — ` +
          `SpecCategory has nowhere to put it.`,
      );
    }

    // A multi-valued parameter ships as a nested <ul> in the cell (EXPERT3D) or as one
    // slash-separated string (Center 3D Print). Both are real; flattening the list would impose
    // one store's convention on the other and break the round-trip three <li> later.
    const list = tds[1].querySelector('ul');
    const value = list
      ? [...list.querySelectorAll('li')].map(li => li.textContent.trim())
      : tds[1].textContent.trim();

    categories.at(-1).rows.push({ label: tds[0].textContent.trim(), value });
  }

  return { heading: h2.textContent.trim(), categories };
}

/** The figures[] manifest. Video figures belong to videos[] and are skipped here. */
export function parseFigures(html) {
  const figures = [];
  for (const fig of bodyOf(html).querySelectorAll('figure')) {
    const img = fig.querySelector('img');
    if (!img) continue; // a video <figure> — parseVideos handles it

    const cap = fig.querySelector('figcaption');
    if (!cap) {
      throw new Error(
        `figure for "${img.getAttribute('src')}" has no <figcaption>. Figure.caption is required ` +
          `and inventing one would put text in the corpus that production never shipped.`,
      );
    }

    figures.push({
      // The renderer rebuilds src from RenderContext + filename, so only the filename is modelled.
      file: (img.getAttribute('src') ?? '').split('/').pop(),
      alt: img.getAttribute('alt') ?? '',
      caption: prose(cap, `figcaption for "${img.getAttribute('src')}"`),
    });
  }
  return figures;
}

/** The videos[] manifest — a parallel manifest, deliberately not folded into figures[]. */
export function parseVideos(html) {
  const videos = [];
  for (const fig of bodyOf(html).querySelectorAll('figure')) {
    const iframe = fig.querySelector('iframe');
    if (!iframe) continue;

    const cap = fig.querySelector('figcaption');
    if (!cap) throw new Error(`video figure for "${iframe.getAttribute('src')}" has no <figcaption>.`);

    videos.push({
      src: iframe.getAttribute('src') ?? '',
      title: iframe.getAttribute('title') ?? '',
      caption: prose(cap, `video figcaption for "${iframe.getAttribute('src')}"`),
    });
  }
  return videos;
}

/**
 * §2a — inverse of renderKillerSpecs(). table-finalize.ts collapses the pair into one cell as
 * `${label}: ${value}`, so the killer-specs table is the one with a <thead>; §7's has none.
 */
export function parseKillerSpecs(html) {
  const body = bodyOf(html);
  const table = [...body.querySelectorAll('div.table-responsive table')].find(t => t.querySelector('thead'));
  if (!table) throw new Error('no §2a killer-specs table (a .table-responsive table with a <thead>) found.');

  const specs = [];
  for (const tr of table.querySelectorAll('tbody tr')) {
    const tds = tr.querySelectorAll('td');
    if (tds.length !== 2) {
      throw new Error(`killer-spec row has ${tds.length} cell(s), expected 2.`);
    }

    const collapsed = tds[0].textContent.trim();
    // FIRST separator, not last: the label is a short noun phrase and the value follows it, so a
    // value that itself contains a colon ("1920: 1080") must stay whole.
    const at = collapsed.indexOf(': ');
    if (at === -1) {
      throw new Error(
        `killer-spec cell "${collapsed}" has no ": " separator to split into label and value.`,
      );
    }

    specs.push({
      label: collapsed.slice(0, at).trim(),
      value: collapsed.slice(at + 2).trim(),
      why: prose(tds[1], `killer-spec "why" for "${collapsed}"`),
    });
  }
  return specs;
}

/** `<li><b>{lead}</b>{text}</li>` — the space between them is authored content, never injected. */
function parseBullets(ul) {
  return [...ul.querySelectorAll('li')].map(li => {
    const b = li.querySelector('b');
    if (!b) {
      throw new Error(
        `list item "${li.textContent.trim().slice(0, 60)}" has no <b> lead-in. BulletItem requires one.`,
      );
    }
    // Everything after </b> is the text; keeping it verbatim preserves whichever side of the bold
    // the store writes its whitespace on. See renderBullets() for why guessing is wrong.
    return { lead: b.innerHTML, text: li.innerHTML.slice(li.innerHTML.indexOf('</b>') + 4) };
  });
}

/**
 * Blocks inside one <h2> or <h3> group. Mechanical: the interleaving is exactly what the artifact
 * shows. `figureRef` and `videoRef` resolve an element to its index in the manifests.
 */
function parseBlocks(nodes, refOf) {
  const blocks = [];
  for (const el of nodes) {
    switch (el.tagName) {
      case 'P':
        blocks.push({ kind: 'paragraph', text: prose(el, 'paragraph') });
        break;
      case 'UL':
        blocks.push({ kind: 'bullets', items: parseBullets(el) });
        break;
      case 'FIGURE':
        blocks.push(refOf(el));
        break;
      default:
        throw new Error(
          `<${el.tagName.toLowerCase()}> has no Block kind in the Doc model. ` +
            `Block is paragraph | bullets | figure | video — extend the model deliberately, do not coerce here.`,
        );
    }
  }
  return blocks;
}

/**
 * The draft Doc.
 *
 * Every <h2> group lands in `functionality`. Moving the ones that are really §4/§5/§6/§9 is the
 * human's job — see the header for why this tool must not guess.
 */
export function scaffoldDoc(html, { locale } = {}) {
  const body = bodyOf(html);
  const figures = parseFigures(html);
  const videos = parseVideos(html);

  // Resolve a <figure> element to its manifest entry by document position among its own kind.
  let figureSeen = 0;
  let videoSeen = 0;
  const refOf = el =>
    el.querySelector('img')
      ? { kind: 'figure', ref: figureSeen++ }
      : { kind: 'video', ref: videoSeen++ };

  const top = [...body.children].filter(el => el.tagName !== 'HR' && !el.matches('section.specs'));

  const hookEl = top.find(el => el.tagName === 'P');
  const firstH2 = top.findIndex(el => el.tagName === 'H2');

  // §2b — whatever sits between the killer-specs table and the first <h2>.
  const leading = (firstH2 === -1 ? top : top.slice(0, firstH2)).filter(
    el => el !== hookEl && !el.matches('div.table-responsive'),
  );

  const functionality = [];
  for (const el of firstH2 === -1 ? [] : top.slice(firstH2)) {
    if (el.tagName === 'H2') {
      functionality.push({ heading: el.textContent.trim(), blocks: [] });
      continue;
    }
    if (el.tagName === 'H3') {
      const parent = functionality.at(-1);
      (parent.subsections ??= []).push({ heading: el.textContent.trim(), blocks: [] });
      continue;
    }
    const group = functionality.at(-1);
    const target = group.subsections?.at(-1) ?? group;
    target.blocks.push(...parseBlocks([el], refOf));
  }

  return {
    schemaVersion: '3.0',
    locale: locale ?? TODO,
    localizedName: TODO,
    hook: hookEl ? prose(hookEl, 'hook') : TODO,
    killerSpecs: parseKillerSpecs(html),
    keyBenefits: parseBlocks(leading, refOf),
    functionality,
    // Judgment fields. Left unfilled ON PURPOSE — see the header.
    applications: { heading: TODO, items: [] },
    cta: { heading: TODO, text: TODO },
    specs: parseSpecs(html),
    figures,
    videos,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [artifactPath, locale] = process.argv.slice(2);
  if (!artifactPath) {
    console.error('usage: node test/tools/scaffold-doc.mjs <artifact.html> [locale]');
    process.exit(1);
  }
  try {
    const doc = scaffoldDoc(readFileSync(artifactPath, 'utf8'), { locale });
    console.log(JSON.stringify(doc, null, 2));
    console.error(
      `\nDRAFT ONLY. Resolve every "${TODO}" before this reconciles:\n` +
        `  - localizedName\n` +
        `  - move the §4 / §5 / §6 / §9 groups out of functionality[] into applications /\n` +
        `    compatibility / packageContents / cta\n` +
        `It will not validate against ProductDescriptionDocSchema until you do.\n`,
    );
  } catch (e) {
    console.error(`${artifactPath}: ${e.message}`);
    process.exit(2);
  }
}
