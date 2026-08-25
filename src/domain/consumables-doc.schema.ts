/**
 * consumables-doc.schema.ts
 *
 * Runtime validation boundary for ConsumablesDescriptionDoc. Mirrors description-doc.schema.ts's
 * conventions (Prose vs. NonEmpty, the bullet lead/text run-together refinement) but duplicates the
 * handful of lines involved rather than importing them — that sibling file's own contract is "never
 * imported by the renderer", and adding export surface to it for a few shared primitives is an
 * unnecessary coupling between two otherwise-independent document families.
 *
 * Imported by the orchestrator and the repair gate — NEVER by the renderer, same rule as its
 * sibling, for the same reason: keeps render-consumables.ts dependency-free and portable.
 */
import { z } from 'zod';
import type { ConsumablesDescriptionDoc } from './consumables-doc';

/** Prose allows `<b>` and `<strong>` — identical rule to description-doc.schema.ts's Prose. */
const PROSE_FORBIDDEN = /<(?!\/?(?:b|strong)\s*>)[^>]+>/;
const Prose = z.string().min(1).refine(s => !PROSE_FORBIDDEN.test(s), {
  message: 'Prose fields may contain only <b> and <strong> tags; no other HTML is permitted.',
});

/** A tag, as opposed to a bare `<` — identical rule to description-doc.schema.ts's TAG_LIKE. */
const TAG_LIKE = /<\/?[a-zA-Z][^>]*>/;

/** Plain-text fields — headings, labels, values, bullet leads. Stricter than Prose: no tags at all. */
const NonEmpty = z.string().min(1).refine(s => !TAG_LIKE.test(s), {
  message: 'Plain-text fields may not contain HTML tags — the renderer applies all formatting.',
});

/**
 * `<li><b>{lead}</b>{text}</li>` — renderer joins with nothing of its own, same rule and same
 * corpus evidence as description-doc.schema.ts's BulletItemSchema. `\p{L}\p{N}` WITH THE /u FLAG,
 * NEVER `\w` — see that file's comment for why `\w`'s ASCII-only range would miss every Cyrillic
 * (and Polish/German) case this repo actually generates.
 */
const ENDS_WITH_ALNUM = /[\p{L}\p{N}]$/u;
const STARTS_WITH_ALNUM = /^[\p{L}\p{N}]/u;

const BulletItemSchema = z.object({ lead: NonEmpty, text: Prose }).refine(
  i => !(ENDS_WITH_ALNUM.test(i.lead) && STARTS_WITH_ALNUM.test(i.text)),
  {
    message:
      'A bullet lead and its text run together — neither side carries a separator. Put the space '
      + 'or punctuation at the end of "lead" or the start of "text"; the renderer adds none.',
    path: ['lead'],
  },
);

const BulletGroupSchema = (min: number, max: number) =>
  z.object({ heading: NonEmpty, items: z.array(BulletItemSchema).min(min).max(max) }).strict();

/**
 * §C4 — 0 to 3 groups. NOT `.min(1)`: the schema text marks the section "required if printing
 * parameters are provided", implying a product with none of those parameters omits it entirely.
 * See consumables-doc.ts's SpecGroup doc comment. Revisit if real generations always carry at
 * least one group — tightening to `.min(1)` then is a one-line change.
 */
const SpecGroupSchema = z.object({
  heading: NonEmpty,
  rows: z.array(z.object({ label: NonEmpty, value: NonEmpty })).min(1),
}).strict();

/** Mirrors description-doc.schema.ts's own `figures` entry shape, plus `leadIn` — see ConsumablesFigure. */
const FigureSchema = z.object({ file: NonEmpty, alt: NonEmpty, leadIn: Prose, caption: Prose }).strict();

export const ConsumablesDescriptionDocSchema = z.object({
  schemaVersion: z.literal('C1'),
  locale: NonEmpty,
  localizedName: NonEmpty,

  hook: Prose,
  features: BulletGroupSchema(4, 6),
  applications: BulletGroupSchema(3, 4),
  specGroups: z.array(SpecGroupSchema).max(3),
  storage: BulletGroupSchema(2, 3),
  cta: Prose,
  figures: z.array(FigureSchema),
}).strict();

/**
 * Compile-time guard against the schema and the hand-written interface drifting apart — same
 * technique and same TSCONFIG caveat as description-doc.schema.ts's own _typeCheck (this repo does
 * not enable strictNullChecks, so z.infer comes back all-optional; see that file's TSCONFIG NOTE).
 * Proves interface → inferred compatibility, not the reverse.
 */
const _typeCheck: z.infer<typeof ConsumablesDescriptionDocSchema> = {} as ConsumablesDescriptionDoc;
void _typeCheck;
