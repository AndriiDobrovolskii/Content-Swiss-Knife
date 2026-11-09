/**
 * The results feed view model (US-10.5 DD-2, DD-7; FR-3, FR-4, FR-13, FR-23, FR-25).
 *
 * Pure: no host clock, no DOM, no preset registry. Registry membership of a preset id is decided by the injected
 * `isKnownPresetId` predicate, so this module imports no registry. Every optional stored field is read through the
 * `schemas.ts` readers on every build, so an invalid value is "absent", never an error.
 */
import type { StoredSession, Version } from './ports';
import { readTurnExtras } from './schemas';

/** One piece of a card, in the order the API returned it: a model text paragraph or a generated image. */
export type FeedItem = { kind: 'text'; text: string } | { kind: 'image'; versionNumber: number };

/** The values of the card's summary line. `count` is the versions of the turn; text parts never add to it. */
export interface FeedSummary {
  count: number;
  cost?: number;
  durationMs?: number;
}

/** One card of the feed: everything one stored model turn shows. */
export interface FeedCard {
  /** The model turn id. */
  key: string;
  /** The first version's prompt, trimmed. Empty means there is no "Reuse prompt". */
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
  /** Present only when the stored id is valid and known to the registry. */
  presetId?: string;
  summary: FeedSummary;
  items: FeedItem[];
  /** True only on the card of the retained version with the highest number. */
  holdsMain: boolean;
}

export interface FeedDeps {
  isKnownPresetId(id: string): boolean;
}

export interface Feed {
  /** Oldest first. */
  cards: FeedCard[];
  /** The highest retained version number, or `null` when the session retains no version. */
  mainVersionNumber: number | null;
}

/**
 * One card per stored model turn, oldest first. A user turn without a stored model turn yields no card (R-6). The main
 * image is the retained version with the highest number (FR-13); only the card that holds it has `holdsMain`.
 */
export function buildFeed(session: StoredSession, deps: FeedDeps): Feed {
  const versions = session.meta.versions;
  const versionAt = new Map<string, Version>(versions.map((v) => [`${v.turnId}:${v.partIndex}`, v]));

  let main: Version | undefined;
  for (const version of versions) {
    if (main === undefined || version.number > main.number) main = version;
  }

  const cards: FeedCard[] = [];
  for (const turn of session.turns) {
    if (turn.role !== 'model') continue;

    const own = versions.filter((v) => v.turnId === turn.id);
    let first: Version | undefined;
    for (const version of own) {
      if (first === undefined || version.number < first.number) first = version;
    }

    const items: FeedItem[] = [];
    turn.parts.forEach((part, index) => {
      if (part.thought) return;
      if (typeof part.text === 'string' && part.text.trim() !== '') items.push({ kind: 'text', text: part.text });
      const version = part.inlineData ? versionAt.get(`${turn.id}:${index}`) : undefined;
      if (version) items.push({ kind: 'image', versionNumber: version.number });
    });

    const extras = readTurnExtras(turn);
    const summary: FeedSummary = { count: own.length };
    if (extras.cost !== undefined) summary.cost = extras.cost;
    if (extras.durationMs !== undefined) summary.durationMs = extras.durationMs;

    const card: FeedCard = {
      key: turn.id,
      prompt: first === undefined ? '' : first.prompt.trim(),
      aspectRatio: first === undefined ? '' : first.aspectRatio,
      resolution: first === undefined ? '' : first.resolution,
      model: first === undefined ? '' : first.model,
      summary,
      items,
      holdsMain: main !== undefined && main.turnId === turn.id,
    };
    if (extras.presetId !== undefined && deps.isKnownPresetId(extras.presetId)) card.presetId = extras.presetId;
    cards.push(card);
  }

  return { cards, mainVersionNumber: main === undefined ? null : main.number };
}
