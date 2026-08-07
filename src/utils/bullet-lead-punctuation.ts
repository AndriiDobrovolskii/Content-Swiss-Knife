/**
 * bullet-lead-punctuation.ts
 *
 * Doc-path validator for a defect the render-reconciliation report already proved is NOT a
 * renderer bug (`test/render-reconciliation.report.md` §4.1.2): `renderBullets()` and the
 * applications-list renderer (`render-description.ts`) join `<b>{lead}</b>{text}` with ZERO
 * injected whitespace or punctuation, on purpose — different stores intentionally put the
 * separator in different places (space inside the bold vs. outside it), so the renderer cannot
 * guess and must not try. `description-doc.ts`'s own `BulletItem.lead` doc comment already states
 * the contract: "Ends with its own punctuation — the renderer adds none." — and the Doc-authoring
 * prompt (task-a-doc.ts) already tells the model this explicitly, with a worked collision example.
 *
 * This validator exists because the model still violates that contract sometimes (the 2026-08
 * EXPERT3D Ortur F10 10W incident: "Деревообробка та фанерні вироби" + "Фанера 8 мм ріжеться…"
 * shipped as "виробиФанера", two words glued into one). The check is a pure mechanical fact — a
 * bold lead ending in a letter/digit immediately followed by text starting with a letter/digit
 * WILL render as one glued word, in every store's house style, with zero exceptions — so it is
 * error-severity: unlike a stylistic judgement call, there is no legitimate reading under which
 * this is correct output.
 *
 * `error` severity is also the whole mechanism: no Doc path here is addressable by
 * repair-strategy.ts's path grammar (the field sits three or four array-hops deep — e.g.
 * `functionality[i].blocks[j].items[k].lead` — and that grammar deliberately supports only a
 * single hop, see its own comment), so this rule has and needs no registered strategy. An error
 * always enters `runRepairGate`'s main while-loop regardless of path/strategy, which is what
 * actually repairs it (full regeneration with `detail` naming the exact colliding words).
 */

import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { forEachBlockInOrder } from '../domain/description-doc';

/** Ends in a letter or digit — no trailing punctuation, colon or space to break on. */
const ENDS_WITHOUT_SEPARATOR = /[\p{L}\p{N}]$/u;
/** Starts with a letter or digit — no leading space to break on. */
const STARTS_WITHOUT_SEPARATOR = /^[\p{L}\p{N}]/u;

function collides(lead: string, text: string): boolean {
  return !!lead && !!text && ENDS_WITHOUT_SEPARATOR.test(lead) && STARTS_WITHOUT_SEPARATOR.test(text);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function collisionIssue(context: string, lead: string, text: string): ValidationIssue {
  const glued = `${lead}${truncate(text, 12)}`;
  return {
    severity: 'error',
    rule: 'bullet-lead-collision',
    detail:
      `The bold lead-in "${lead}" has no separator before the text that follows it `
      + `("${truncate(text, 40)}") — they will render glued together as one word `
      + `("${glued}${text.length > 12 ? '…' : ''}"). End the lead-in with ":" or ". " `
      + '(see [FORMAT] / the bullet-punctuation rule in the master prompt).',
    context,
  };
}

/**
 * @param doc     the ProductDescriptionDoc under validation
 * @param context reporting label, e.g. "Doc (base)"
 * @returns one `bullet-lead-collision` error per bold-lead/text pair that would render glued
 *          together — checks every `bullets` Block (keyBenefits, §3 functionality incl. nested
 *          subsections, §5 compatibility) via `forEachBlockInOrder`, plus §4
 *          `applications.items[]`, which is not Block-shaped and so outside that traversal.
 */
export function validateBulletLeadPunctuationDoc(
  doc: ProductDescriptionDoc,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  forEachBlockInOrder(doc, block => {
    if (block.kind !== 'bullets') return;
    for (const item of block.items) {
      if (collides(item.lead, item.text)) issues.push(collisionIssue(context, item.lead, item.text));
    }
  });

  for (const item of doc.applications.items) {
    if (collides(item.scenario, item.text)) issues.push(collisionIssue(context, item.scenario, item.text));
  }

  return issues;
}

/**
 * Fixes every collision `validateBulletLeadPunctuationDoc` would report, deterministically —
 * no LLM involved. Safe because the defect has exactly one correct repair: this rule's own
 * `detail` message already tells the model to "End the lead-in with ':' or '. '", and there is no
 * judgement call in choosing between them, so there is nothing here for an LLM to get wrong that a
 * fixed rule can't.
 *
 * Deliberately reuses the validator's own traversal (`forEachBlockInOrder` + `applications.items`)
 * rather than inventing a wider one: this function's coverage must equal the validator's coverage
 * exactly, so every case the rule can catch is eliminated and nothing outside the rule's scope
 * (§7 spec rows, the §6 package list — neither is `BulletItem`-shaped) is touched.
 *
 * Appends `": "` — colon AND a trailing space — not a bare colon. `collides()`'s own
 * `ENDS_WITHOUT_SEPARATOR` only fires when `lead` already ends in a letter or digit, so a lead
 * ending in `,`, `-`, or any other punctuation is never touched here (it never collided in the
 * first place). And the space has to live inside the bold span: `renderBullets()` joins
 * `<b>{lead}</b>{text}` with zero injected separator (this file's own header), so a bare `":"`
 * would still glue the colon to the next word. `": "` matches the house convention already used
 * elsewhere in real output (`<b>Лазерний модуль: </b>`).
 */
export function normalizeBulletLeadPunctuation(
  doc: ProductDescriptionDoc,
): { doc: ProductDescriptionDoc; fixed: number } {
  const clone = structuredClone(doc);
  let fixed = 0;

  const fixLead = (item: { lead?: string; scenario?: string; text: string }, key: 'lead' | 'scenario'): void => {
    const lead = item[key] ?? '';
    if (!collides(lead, item.text)) return;
    item[key] = `${lead}: `;
    fixed++;
  };

  forEachBlockInOrder(clone, block => {
    if (block.kind !== 'bullets') return;
    for (const item of block.items) fixLead(item, 'lead');
  });

  for (const item of clone.applications.items) fixLead(item, 'scenario');

  return { doc: clone, fixed };
}
