/**
 * consumables-bullet-lead-punctuation.ts
 *
 * Pre-parse sibling of bullet-lead-punctuation.ts for the Consumables Doc pipeline
 * (ConsumablesDescriptionDoc, schemaVersion 'C1'). Same defect, same fix, different placement in
 * the pipeline — see the difference explained below.
 *
 * consumables-doc.schema.ts's BulletItemSchema carries a `.refine()` that THROWS (via
 * ConsumablesDescriptionDocSchema.parse()) when a bullet `lead` ends in a letter/digit and its
 * `text` starts with one — a bold lead-in the renderer joins to its text with zero injected
 * separator (`<b>{lead}</b>{text}`), so an unseparated pair renders as one glued word in every
 * store's house style. Every one of §C2 features, §C3 applications, and §C5 storage is built from
 * that same refine-carrying schema (consumables-doc.schema.ts:72-75) — unlike the plain
 * ProductDescriptionDoc pipeline, there is no unguarded sibling field to fall back on here.
 *
 * That refine throwing means `produceTaskAConsumablesDoc()` discards the ENTIRE doc on a single
 * colliding item (content-orchestrator.service.ts's ConsumablesDescriptionDocSchema.parse call),
 * and docSchemaIssues() never sets `.path` on the resulting issue — only embeds it as text inside
 * `.detail` — so repair-gate.ts's field/block-scoped rungs can't touch it. The only remediation is
 * blind full-document regeneration, which has to get every one of up to 13 independent bullet items
 * right at once, inside a 2-attempt budget. This is why normalizeBulletLeadPunctuation's placement
 * (fixing an already-PARSED doc, inside runDocGate's produce closure) does not translate here: by
 * the time a doc would parse successfully, it can no longer contain the collision this fixes, so a
 * post-parse fixer would be unreachable for this schema. The fix has to run on the RAW JSON, before
 * `.parse()` is ever called, so the throw never happens for this class of error in the first place.
 */

/** Ends in a letter or digit — no trailing punctuation, colon or space to break on. */
const ENDS_WITH_ALNUM = /[\p{L}\p{N}]$/u;
/** Starts with a letter or digit — no leading space to break on. */
const STARTS_WITH_ALNUM = /^[\p{L}\p{N}]/u;

/**
 * Deliberately NOT trimmed — must match consumables-doc.schema.ts's BulletItemSchema refine
 * byte-for-byte (it tests the raw `lead`/`text` strings, no `.trim()`), so this can never fix
 * something the schema wouldn't also flag, or flag something the schema would let pass. A `lead`
 * with a raw trailing space (e.g. `"Швидкість "`) already fails ENDS_WITH_ALNUM as-is (a space is
 * not alnum) — the schema treats that as already separated (the space lands inside the bold span,
 * which is a legitimate house style, same as `normalizeBulletLeadPunctuation`'s own convention),
 * so it is correctly left untouched here too, exactly like a lead ending in any other punctuation.
 */
function collides(lead: string, text: string): boolean {
  return !!lead && !!text && ENDS_WITH_ALNUM.test(lead) && STARTS_WITH_ALNUM.test(text);
}

const GROUP_KEYS = ['features', 'applications', 'storage'] as const;

/**
 * Fixes every bullet-lead/text collision in `features`, `applications`, and `storage` —
 * exhaustive: those are the only three fields in ConsumablesDescriptionDocSchema built from
 * BulletGroupSchema (consumables-doc.schema.ts:72-75); `specGroups` uses a distinct SpecGroupSchema
 * with no `lead`/`text` shape, and `hook`/`cta` are plain Prose fields, neither `lead`-shaped.
 *
 * Runs on `raw: unknown` — the model's JSON output BEFORE ConsumablesDescriptionDocSchema.parse()
 * has validated anything — so every hop is defensively guarded and nothing here throws on a
 * malformed or unexpected shape; it is simply skipped and left for the schema to reject as it
 * already does today. The schema's own refine stays authoritative and still runs immediately after
 * this — this function only removes the provably-fixable case from ever reaching that exception.
 *
 * Appends `": "` — colon AND a trailing space — never a bare colon, matching
 * normalizeBulletLeadPunctuation's own reasoning: the space has to live inside the bold span, since
 * the renderer injects nothing of its own. Only ever applied to a `lead` that `collides()` already
 * confirmed ends in a letter/digit, so there is never a pre-existing trailing space to collide with.
 */
export function normalizeConsumablesBulletLeadPunctuation(raw: unknown): { raw: unknown; fixed: number } {
  if (!raw || typeof raw !== 'object') return { raw, fixed: 0 };

  const clone = structuredClone(raw) as Record<string, unknown>;
  let fixed = 0;

  for (const key of GROUP_KEYS) {
    const group = clone[key];
    if (!group || typeof group !== 'object') continue;
    const items = (group as Record<string, unknown>).items;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const { lead, text } = rec;
      if (typeof lead !== 'string' || typeof text !== 'string') continue;
      if (!collides(lead, text)) continue;
      rec.lead = `${lead}: `;
      fixed++;
    }
  }

  return { raw: clone, fixed };
}
